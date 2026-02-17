const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyCenter } = require("../utils/auth");

/* =========================
   HEARTBEAT (MULTI DEVICE)
========================= */
router.post("/heartbeat", verifyCenter, async (req, res) => {
  try {
    const { device_id } = req.body;
    const center_code = req.center.center_code;

    if (!device_id) {
      return res.status(400).json({ message: "device_id required" });
    }

    await db.query(
      `INSERT INTO center_devices
       (center_code, device_id, last_seen)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         last_seen = NOW()`,
      [center_code, device_id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("HEARTBEAT ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* =========================
   GET CANDIDATES
========================= */
router.get("/candidates/:centerCode", verifyCenter, async (req, res) => {
  try {
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

  } catch (err) {
    console.error("GET CANDIDATES ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* =========================
   SAVE BIOMETRIC (MULTI DEVICE SAFE)
========================= */
router.post("/save", verifyCenter, async (req, res) => {
  try {
    const { roll_no, photo_path, device_id, shift } = req.body;
    const center_code = req.center.center_code;

    if (!roll_no || !shift || !device_id) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // Check candidate exists
    const [[candidate]] = await db.query(
      `SELECT * FROM candidates
       WHERE center_code = ? AND roll_no = ?`,
      [center_code, roll_no]
    );

    if (!candidate) {
      return res.status(400).json({ message: "Roll number not found" });
    }

    // Prevent duplicate biometric
    const [[exists]] = await db.query(
      `SELECT id FROM biometric_records
       WHERE center_code = ? AND roll_no = ?`,
      [center_code, roll_no]
    );

    if (exists) {
      return res.status(409).json({ message: "Already captured" });
    }

    // Insert biometric
    await db.query(
      `INSERT INTO biometric_records
       (center_code, roll_no, shift, photo_path, device_id, captured_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [center_code, roll_no, shift, photo_path, device_id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("SAVE ERROR:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
