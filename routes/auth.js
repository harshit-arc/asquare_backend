const express = require("express");
const router = express.Router();
const db = require("../db");
const crypto = require("crypto");
const { signAdmin, signCenter } = require("../utils/auth");

/* =======================
   ADMIN LOGIN
   ======================= */
router.post("/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    // hash incoming password
    const hash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    const [rows] = await db.query(
      "SELECT id, username FROM admins WHERE username=? AND password=?",
      [username, hash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signAdmin();

    return res.json({
      success: true,
      token,
      role: "ADMIN"
    });

  } catch (err) {
    console.error("ADMIN LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =======================
   CENTER LOGIN
   ======================= */
router.post("/center/login", async (req, res) => {
  try {
    const { center_code, password } = req.body;

    const hash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    const [[center]] = await db.query(
      "SELECT center_code FROM center_users WHERE center_code=? AND password=?",
      [center_code, hash]
    );

    if (!center) {
      return res.status(401).json({ message: "Invalid center login" });
    }

    const token = signCenter(center.center_code);

    res.json({
      success: true,
      token,
      role: "CENTER",
      center_code: center.center_code
    });

  } catch (err) {
    console.error("CENTER LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
