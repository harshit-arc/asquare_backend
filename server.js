const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const biometricRoutes = require("./routes/biometric");

const app = express();
const PORT = 3000;

/* ======================
   GLOBAL MIDDLEWARE
====================== */
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

/* ======================
   MAKE UPLOADS PUBLIC
====================== */
app.use("/uploads", express.static("uploads"));

/* ======================
   HEALTH CHECK
====================== */
app.get("/health", (req, res) => {
  res.send("BACKEND HEALTH OK");
});

/* ======================
   ROUTES
====================== */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/biometric", biometricRoutes);

/* ======================
   START SERVER
====================== */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
