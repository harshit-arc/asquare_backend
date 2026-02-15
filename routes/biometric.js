const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyCenter } = require("../utils/auth");

/* ============================
   HEARTBEAT (CENTER DEVICE)
   ============================ */
router.post("/heartbeat", verifyCenter, async (req, res) => {
  try {
    const { device_id, syncing } = req.body;
    const center_code = req.center.center_code;

    if (!device_id) {
      return res.status(400).json({ message: "device_id required" });
    }

    await db.query(
      `INSERT INTO center_heartbeat
        (center_code, device_id, last_seen, syncing)
       VALUES (?, ?, NOW(), ?)
       ON DUPLICATE KEY UPDATE
         last_seen = NOW(),
         syncing = ?`,
      [center_code, device_id, syncing ? 1 : 0, syncing ? 1 : 0]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("HEARTBEAT ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================
   SAVE BIOMETRIC
   ============================ */
router.post("/save", verifyCenter, async (req, res) => {
  try {
    const { shift, roll_no, name, photo_path } = req.body;
    const center_code = req.center.center_code;

    await db.query(
      `INSERT INTO biometric_records
       (center_code, shift, roll_no, name, photo_path, captured_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [center_code, shift, roll_no, name, photo_path]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("BIOMETRIC SAVE ERROR:", err);
    res.status(500).json({ success: false });
  }
});

router.post("/save", verifyCenter, async (req, res) => {
  const { roll_no, photo_path, deviceid, shift } = req.body;
  const center_code = req.center.center_code;

  // check candidate exists
  const [[candidate]] = await db.query(
    `SELECT * FROM candidates
     WHERE center_code = ? AND roll_no = ?`,
    [center_code, roll_no]
  );

  if (!candidate) {
    return res.status(400).json({
      message: "Roll number not found"
    });
  }

  // prevent duplicate biometric
  const [[exists]] = await db.query(
    `SELECT id FROM biometric_records
     WHERE center_code = ? AND roll_no = ?`,
    [center_code, roll_no]
  );

  if (exists) {
    return res.status(409).json({
      message: "Biometric already captured"
    });
  }

  await db.query(
    `INSERT INTO biometric_records
     (center_code, roll_no, shift, photo_path, captured_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [center_code, roll_no, shift, photo_path]
  );

  await db.query(
    `INSERT INTO audit_logs
     (role, center_code, deviceid, action)
     VALUES ('CENTER', ?, ?, 'BIOMETRIC_CAPTURED')`,
    [center_code, deviceid]
  );

  res.json({ success: true });
});



module.exports = router;
