const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
const db = require("./db");

const slug = "barberia-central";
const existing = db.prepare("SELECT * FROM businesses WHERE slug = ?").get(slug);

if (existing) {
  console.log(`El negocio "${slug}" ya existe. No se ha vuelto a crear nada.`);
  process.exit(0);
}

const businessId = "biz_" + nanoid(10);
const passwordHash = bcrypt.hashSync("demo1234", 10);

db.prepare(`
  INSERT INTO businesses (id, slug, name, address, admin_password_hash)
  VALUES (?, ?, ?, ?, ?)
`).run(businessId, slug, "Barbería Central", "Calle Mayor 14", passwordHash);

const staff = [
  { id: "st_" + nanoid(10), name: "Marcos", role: "Barbero", color: "#BD9552" },
  { id: "st_" + nanoid(10), name: "Laura", role: "Estilista", color: "#4F6F52" },
];
for (const s of staff) {
  db.prepare("INSERT INTO staff (id, business_id, name, role, color) VALUES (?, ?, ?, ?, ?)")
    .run(s.id, businessId, s.name, s.role, s.color);
}

const services = [
  { id: "sv_" + nanoid(10), name: "Corte clásico", duration: 30, price: 15 },
  { id: "sv_" + nanoid(10), name: "Corte + barba", duration: 45, price: 22 },
  { id: "sv_" + nanoid(10), name: "Tinte", duration: 90, price: 45 },
  { id: "sv_" + nanoid(10), name: "Peinado", duration: 30, price: 18 },
];
for (const s of services) {
  db.prepare("INSERT INTO services (id, business_id, name, duration, price) VALUES (?, ?, ?, ?, ?)")
    .run(s.id, businessId, s.name, s.duration, s.price);
}

console.log("Negocio de ejemplo creado:");
console.log(`  slug: ${slug}`);
console.log(`  contraseña de admin: demo1234`);
console.log(`  URL pública: /api/${slug}`);
console.log(`  URL admin:   /api/${slug}/admin/login`);
