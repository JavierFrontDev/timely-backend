const express = require("express");
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
const db = require("../db");
const { signToken } = require("../auth");

const router = express.Router();

const DEFAULT_SERVICES = [
  { name: "Corte", duration: 30, price: 15 },
  { name: "Corte + barba", duration: 45, price: 22 },
];

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// POST /api/register  { name, address, slug(opcional), password }
// Crea un negocio nuevo con un slug único, servicios de ejemplo y sin ningún profesional aún
// (el propio negocio añade su equipo desde el panel una vez dentro).
router.post("/", (req, res) => {
  const { name, address, password } = req.body;
  let { slug } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: "Falta el nombre del negocio." });
  if (!password || password.length < 6) return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });

  slug = slug && slug.trim() ? slugify(slug) : slugify(name);
  if (!slug) return res.status(400).json({ error: "No se pudo generar un identificador (slug) válido a partir del nombre." });

  const existing = db.prepare("SELECT id FROM businesses WHERE slug = ?").get(slug);
  if (existing) {
    return res.status(409).json({ error: `Ya existe un negocio con el identificador "${slug}". Elige otro nombre o un slug distinto.` });
  }

  const businessId = "biz_" + nanoid(10);
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO businesses (id, slug, name, address, admin_password_hash)
    VALUES (?, ?, ?, ?, ?)
  `).run(businessId, slug, name.trim(), address ? address.trim() : null, passwordHash);

  for (const s of DEFAULT_SERVICES) {
    db.prepare("INSERT INTO services (id, business_id, name, duration, price) VALUES (?, ?, ?, ?, ?)")
      .run("sv_" + nanoid(10), businessId, s.name, s.duration, s.price);
  }

  const token = signToken(businessId);

  res.status(201).json({
    slug,
    name: name.trim(),
    token,
    publicUrl: "/?negocio=" + slug,
    adminUrl: "/admin.html?negocio=" + slug,
  });
});

module.exports = router;
