const express = require("express");
const cors = require("cors");
const db = require("./db");
const publicRoutes = require("./routes/public");
const adminRoutes = require("./routes/admin");

const app = express();
app.use(cors());
app.use(express.json());

// Middleware: resuelve el negocio a partir del slug en la URL (/api/:slug/...)
// Esto es lo que hace que Timely sea multi-negocio: cada barbería/peluquería
// tiene su propio slug (ej. /api/barberia-central) y sus datos están aislados.
app.param("slug", (req, res, next, slug) => {
  const business = db.prepare("SELECT * FROM businesses WHERE slug = ?").get(slug);
  if (!business) return res.status(404).json({ error: `No existe ningún negocio con el slug "${slug}".` });
  req.business = business;
  next();
});

app.get("/health", (req, res) => res.json({ ok: true, service: "timely-backend" }));

// Importante: las rutas de admin se registran ANTES que las públicas,
// porque "/api/:slug" (público) sería un prefijo que también podría
// capturar "/api/:slug/admin/..." si se registrara primero.
app.use("/api/:slug/admin", adminRoutes);
app.use("/api/:slug", publicRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Timely backend escuchando en http://localhost:${PORT}`);
});
