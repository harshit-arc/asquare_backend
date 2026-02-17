const express = require("express");
const router = express.Router();
const db = require("../db");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { verifyAdmin } = require("../utils/auth");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");

const upload = multer({ dest: "uploads/" });

/* =========================
   PROTECT ALL ADMIN ROUTES
========================= */
router.use(verifyAdmin);

/* =========================
   CENTER SUMMARY
========================= */
router.get("/center-summary", async (req, res) => {
  const [rows] = await db.query(`
    SELECT
      c.center_code,
      c.center_name,
      COUNT(DISTINCT cand.roll_no) AS total_candidate,
      COUNT(DISTINCT b.roll_no) AS registered
    FROM centers c
    LEFT JOIN candidates cand
      ON cand.center_code = c.center_code
    LEFT JOIN biometric_records b
      ON b.center_code = c.center_code
    GROUP BY c.center_code, c.center_name
  `);

  res.json({ success: true, data: rows });
});

/* =========================
   CENTER DETAIL (SHOW ALL CANDIDATES + STATUS)
========================= */
router.get("/center/:centerCode/candidates", async (req, res) => {
  const { centerCode } = req.params;

  const [rows] = await db.query(`
    SELECT
      c.roll_no,
      c.name,
      c.shift,
      b.captured_at
    FROM candidates c
    LEFT JOIN biometric_records b
      ON b.roll_no = c.roll_no
      AND b.center_code = c.center_code
    WHERE c.center_code = ?
    ORDER BY c.roll_no
  `, [centerCode]);

  res.json({ success: true, data: rows });
});

/* =========================
   SHIFT ATTENDANCE
========================= */
router.get("/center/:centerCode/shift-attendance", async (req, res) => {
  const { centerCode } = req.params;

  const [rows] = await db.query(`
    SELECT
      c.shift,
      COUNT(c.roll_no) AS total_candidates,
      SUM(CASE WHEN b.captured_at IS NOT NULL THEN 1 ELSE 0 END) AS completed
    FROM candidates c
    LEFT JOIN biometric_records b
      ON b.roll_no = c.roll_no
      AND b.center_code = c.center_code
    WHERE c.center_code = ?
    GROUP BY c.shift
  `, [centerCode]);

  res.json({ success: true, data: rows });
});

/* =========================
   GET ALL CENTERS
========================= */
router.get("/centers", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM centers");
  res.json({ success: true, data: rows });
});

/*create center route */
const crypto = require("crypto");

router.post("/center", async (req, res) => {
  try {
    const { center_code, center_name } = req.body;

    if (!center_code || !center_name) {
      return res.status(400).json({ message: "Missing center data" });
    }

    // 🔵 1️⃣ Insert into centers table
    await db.query(
      "INSERT INTO centers (center_code, center_name) VALUES (?, ?)",
      [center_code, center_name]
    );

    // 🔵 2️⃣ Auto generate default password (example: 123456)
    const defaultPassword = "123456";

    const hashedPassword = crypto
      .createHash("sha256")
      .update(defaultPassword)
      .digest("hex");

    // 🔵 3️⃣ Insert into center_users table
    await db.query(
      "INSERT INTO center_users (center_code, password) VALUES (?, ?)",
      [center_code, hashedPassword]
    );

    res.json({
      success: true,
      center_code,
      default_password: defaultPassword
    });

  } catch (err) {
    console.error("Create Center Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


/* =========================
   CSV UPLOAD (AUTO CREATE CENTER FIXED)
========================= */
router.post(
  "/center/:centerCode/csv",
  upload.single("file"),
  async (req, res) => {
    try {
      const centerCode = req.params.centerCode;
      const rows = [];

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          if (!row.roll_no || !row.name || !row.shift) return;

          rows.push([
            centerCode,
            row.roll_no.trim(),
            row.name.trim(),
            row.shift.trim()
          ]);
        })
        .on("end", async () => {

          if (rows.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.json({ success: true, inserted: 0 });
          }

          // 🔵 1️⃣ Check if center exists
          const [[existingCenter]] = await db.query(
            "SELECT center_code FROM centers WHERE center_code=?",
            [centerCode]
          );

          // 🔵 2️⃣ Auto create center if not exists
          if (!existingCenter) {
            await db.query(
              "INSERT INTO centers (center_code, center_name) VALUES (?, ?)",
              [centerCode, centerCode]
            );
          }

          // 🔵 3️⃣ Insert candidates
          await db.query(`
            INSERT IGNORE INTO candidates
            (center_code, roll_no, name, shift)
            VALUES ?
          `, [rows]);

          fs.unlinkSync(req.file.path);

          res.json({
            success: true,
            inserted: rows.length,
            center_auto_created: !existingCenter
          });
        });

    } catch (err) {
      console.error("CSV Upload Error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* =========================
   EXPORT EXCEL (ALL DATA)
========================= */
router.get("/export/excel", async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Biometric");

  sheet.columns = [
    { header: "Center", key: "center_code" },
    { header: "Roll", key: "roll_no" },
    { header: "Name", key: "name" },
    { header: "Shift", key: "shift" },
    { header: "Time", key: "captured_at" }
  ];

  const [rows] = await db.query("SELECT * FROM biometric_records");
  rows.forEach(r => sheet.addRow(r));

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=biometric.xlsx"
  );

  await workbook.xlsx.write(res);
  res.end();
});

/* =========================
   EXPORT CENTER PDF
========================= */
router.get("/center/:centerCode/export-pdf", async (req, res) => {
  const { centerCode } = req.params;

  const [rows] = await db.query(`
    SELECT roll_no, name, shift, captured_at
    FROM biometric_records
    WHERE center_code = ?
  `, [centerCode]);

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${centerCode}.pdf`
  );

  doc.pipe(res);

  doc.fontSize(16).text(`Center: ${centerCode}`);
  doc.moveDown();

  rows.forEach(r => {
    doc.text(
      `${r.roll_no} | ${r.name} | ${r.shift} | ${r.captured_at || "-"}`
    );
  });

  doc.end();
});

router.get("/live-devices", async (req, res) => {

  const [rows] = await db.query(`
    SELECT
      center_code,
      device_id,
      last_seen
    FROM center_devices
    ORDER BY last_seen DESC
  `);

  res.json({ success: true, data: rows });
});


module.exports = router;
