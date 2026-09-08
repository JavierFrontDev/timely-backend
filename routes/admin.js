const express = require("express");
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
const db = require("../db");
const { signToken, requireAuth } = require("../auth");

const router = express.Router({ mergeParams: true });

// POST /api/:slug/admin/login  { password }
router.post("/login", (req, res) => {
  const { business } = req;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Falta la contraseña." });
  const ok = bcrypt.compareSync(password, business.admin_password_hash);
  if (!ok) return res.status(401).json({ error: "Contraseña incorrecta." });
  res.json({ token: signToken(business.id) });
});

// A partir de aquí, todas las rutas requieren token válido del negocio
router.use(requireAuth);

// --- CITAS ---
router.get("/appointments", (req, res) => {
  const { business } = req;
  const { date } = req.query;
  let rows;
  if (date) {
    rows = db.prepare(`
      SELECT a.*, c.name as client_name, c.phone as client_phone, s.name as service_name, s.duration, s.price
      FROM appointments a
      JOIN clients c ON c.id = a.client_id
      JOIN services s ON s.id = a.service_id
      WHERE a.business_id = ? AND a.date = ?
      ORDER BY a.start ASC
    `).all(business.id, date);
  } else {
    rows = db.prepare(`
      SELECT a.*, c.name as client_name, c.phone as client_phone, s.name as service_name, s.duration, s.price
      FROM appointments a
      JOIN clients c ON c.id = a.client_id
      JOIN services s ON s.id = a.service_id
      WHERE a.business_id = ?
      ORDER BY a.date DESC, a.start ASC
      LIMIT 200
    `).all(business.id);
  }
  res.json({ appointments: rows });
});

router.post("/appointments", (req, res) => {
  const { business } = req;
  const { serviceId, staffId, date, start, clientName, clientPhone } = req.body;
  if (!serviceId || !staffId || !date || !start || !clientName) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }
  let client = db.prepare("SELECT * FROM clients WHERE business_id = ? AND lower(name) = lower(?)").get(business.id, clientName);
  if (!client) {
    const clientId = "cl_" + nanoid(10);
    db.prepare("INSERT INTO clients (id, business_id, name, phone) VALUES (?, ?, ?, ?)").run(clientId, business.id, clientName, clientPhone || null);
    client = { id: clientId };
  }
  const apptId = "ap_" + nanoid(10);
  db.prepare(`
    INSERT INTO appointments (id, business_id, staff_id, service_id, client_id, date, start, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')
  `).run(apptId, business.id, staffId, serviceId, client.id, date, start);
  res.status(201).json({ id: apptId });
});

router.patch("/appointments/:id", (req, res) => {
  const { business } = req;
  const { status, start, staffId } = req.body;
  const appt = db.prepare("SELECT * FROM appointments WHERE id = ? AND business_id = ?").get(req.params.id, business.id);
  if (!appt) return res.status(404).json({ error: "Cita no encontrada." });

  const nextStatus = status || appt.status;
  const nextStart = start || appt.start;
  const nextStaff = staffId || appt.staff_id;
  db.prepare("UPDATE appointments SET status = ?, start = ?, staff_id = ? WHERE id = ?").run(nextStatus, nextStart, nextStaff, appt.id);
  res.json({ ok: true });
});

// --- SERVICIOS ---
router.get("/services", (req, res) => {
  res.json({ services: db.prepare("SELECT * FROM services WHERE business_id = ?").all(req.business.id) });
});
router.post("/services", (req, res) => {
  const { name, duration, price } = req.body;
  if (!name || !duration) return res.status(400).json({ error: "Faltan datos: name y duration." });
  const id = "sv_" + nanoid(10);
  db.prepare("INSERT INTO services (id, business_id, name, duration, price) VALUES (?, ?, ?, ?, ?)")
    .run(id, req.business.id, name, duration, price || 0);
  res.status(201).json({ id });
});
router.delete("/services/:id", (req, res) => {
  db.prepare("DELETE FROM services WHERE id = ? AND business_id = ?").run(req.params.id, req.business.id);
  res.json({ ok: true });
});

// --- EQUIPO ---
router.get("/staff", (req, res) => {
  res.json({ staff: db.prepare("SELECT * FROM staff WHERE business_id = ?").all(req.business.id) });
});
router.post("/staff", (req, res) => {
  const { name, role, color } = req.body;
  if (!name) return res.status(400).json({ error: "Falta el nombre." });
  const id = "st_" + nanoid(10);
  db.prepare("INSERT INTO staff (id, business_id, name, role, color) VALUES (?, ?, ?, ?, ?)")
    .run(id, req.business.id, name, role || null, color || "#BD9552");
  res.status(201).json({ id });
});
router.delete("/staff/:id", (req, res) => {
  db.prepare("DELETE FROM staff WHERE id = ? AND business_id = ?").run(req.params.id, req.business.id);
  res.json({ ok: true });
});

// --- CLIENTES ---
router.get("/clients", (req, res) => {
  res.json({ clients: db.prepare("SELECT * FROM clients WHERE business_id = ?").all(req.business.id) });
});

module.exports = router;
