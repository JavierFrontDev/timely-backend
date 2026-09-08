const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "timely-dev-secret-change-in-production";

function signToken(businessId) {
  return jwt.sign({ businessId }, JWT_SECRET, { expiresIn: "30d" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Falta el token de autenticación." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.businessId !== req.business.id) {
      return res.status(403).json({ error: "Este token no pertenece a este negocio." });
    }
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o caducado." });
  }
}

module.exports = { signToken, requireAuth, JWT_SECRET };
