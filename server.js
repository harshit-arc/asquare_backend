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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ======================
   HEALTH CHECK
   ====================== */
app.get("/health", (req, res) => {
  res.send("BACKEND HEALTH OK");
});

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});


/* ======================
   ROUTES
   ====================== */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/biometric", biometricRoutes);

/* ======================
   SERVER START
   ====================== */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`);
});
