const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyCenter } = require("../utils/auth");
const fs = require("fs");
const path = require("path");

/* =========================
   HEARTBEAT
========================= */
router.post("/heartbeat", verifyCenter, async (req, res) => {
  const { device_id } = req.body;
  const center_code = req.center.center_code;

  await db.query(
    `INSERT INTO center_devices
     (center_code, device_id, last_seen)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE
     last_seen = NOW()`,
    [center_code, device_id]
  );

  res.json({ success: true });
});

/* =========================
   GET CANDIDATES
========================= */
router.get("/candidates/:centerCode", verifyCenter, async (req, res) => {
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
   SAVE BIOMETRIC (BASE64)
========================= */
router.post("/save", verifyCenter, async (req, res) => {
  try {
    const { roll_no, shift, photo_base64, device_id } = req.body;
    const center_code = req.center.center_code;

    if (!roll_no || !photo_base64) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const [[exists]] = await db.query(
      `SELECT id FROM biometric_records
       WHERE center_code=? AND roll_no=?`,
      [center_code, roll_no]
    );

    if (exists) {
      return res.status(409).json({ message: "Already captured" });
    }

    const uploadDir = path.join(__dirname, "../uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    const fileName =
      `${center_code}_${roll_no}_${Date.now()}.jpg`;

    const filePath = path.join(uploadDir, fileName);

    const base64Data =
      photo_base64.replace(/^data:image\/\w+;base64,/, "");

    fs.writeFileSync(filePath, base64Data, "base64");

    await db.query(
      `INSERT INTO biometric_records
       (center_code, roll_no, shift, photo_path, device_id, captured_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        center_code,
        roll_no,
        shift,
        `/uploads/${fileName}`,
        device_id
      ]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
