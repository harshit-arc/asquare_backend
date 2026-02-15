const jwt = require("jsonwebtoken");

const SECRET = "ASQUARE_SECRET_2026"; // 👈 CHANGE THIS ONCE

/* SIGN TOKENS */
exports.signAdmin = () => {
  return jwt.sign(
    { role: "ADMIN" },
    SECRET,
    { expiresIn: "12h" }
  );
};

exports.signCenter = (center_code) => {
  return jwt.sign(
    { role: "CENTER", center_code },
    SECRET,
    { expiresIn: "12h" }
  );
};

/* VERIFY ADMIN */
exports.verifyAdmin = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "No token" });

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin only" });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* VERIFY CENTER */
exports.verifyCenter = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "No token" });

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    if (decoded.role !== "CENTER") {
      return res.status(403).json({ message: "Center only" });
    }

    req.center = decoded;
    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
