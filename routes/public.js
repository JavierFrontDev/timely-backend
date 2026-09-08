const express = require("express");
const { nanoid } = require("nanoid");
const db = require("../db");
const { computeAvailability } = require("../availability");

const router = express.Router({ mergeParams: true });

// GET /api/:slug -> info del negocio, servicios y equipo
router.get("/", (req, res) => {
  const { business } = req;
  const staff = db.prepare("SELECT id, name, role, color FROM staff WHERE business_id = ?").all(business.id);
  const services = db.prepare("SELECT id, name, duration, price FROM services WHERE business_id = ?").all(business.id);
  res.json({
    slug: business.slug,
    name: business.name,
    address: business.address,
    staff,
    services,
  });
});

// GET /api/:slug/availability?serviceId=&date=YYYY-MM-DD&staffId=(opcional)
router.get("/availability", (req, res) => {
  const { business } = req;
  const { serviceId, date, staffId } = req.query;
  if (!serviceId || !date) return res.status(400).json({ error: "Faltan parámetros: serviceId y date son obligatorios." });

  const service = db.prepare("SELECT * FROM services WHERE id = ? AND business_id = ?").get(serviceId, business.id);
  if (!service) return res.status(404).json({ error: "Servicio no encontrado." });

  const staffList = db.prepare("SELECT id FROM staff WHERE business_id = ?").all(business.id);

  const existingAppts = db.prepare(`
    SELECT a.staff_id, a.start, s.duration
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.business_id = ? AND a.date = ? AND a.status != 'cancelled'
  `).all(business.id, date);

  const availability = computeAvailability({
    staffList,
    existingAppts,
    serviceDuration: service.duration,
    dateStr: date,
    staffId: staffId || null,
  });

  res.json({ availability });
});

// POST /api/:slug/appointments -> reservar cita como cliente final
router.post("/appointments", (req, res) => {
  const { business } = req;
  const { serviceId, staffId, date, start, name, phone } = req.body;

  if (!serviceId || !staffId || !date || !start || !name) {
    return res.status(400).json({ error: "Faltan datos obligatorios: serviceId, staffId, date, start, name." });
  }

  const service = db.prepare("SELECT * FROM services WHERE id = ? AND business_id = ?").get(serviceId, business.id);
  const staffMember = db.prepare("SELECT * FROM staff WHERE id = ? AND business_id = ?").get(staffId, business.id);
  if (!service || !staffMember) return res.status(404).json({ error: "Servicio o profesional no válido." });

  // Revalidar que el hueco sigue libre (evita colisiones por condición de carrera)
  const existingAppts = db.prepare(`
    SELECT a.start, s.duration
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.business_id = ? AND a.staff_id = ? AND a.date = ? AND a.status != 'cancelled'
  `).all(business.id, staffId, date);

  const { toMinutes } = require("../availability");
  const newStart = toMinutes(start);
  const newEnd = newStart + service.duration;
  const clash = existingAppts.some((a) => {
    const aStart = toMinutes(a.start);
    const aEnd = aStart + a.duration;
    return newStart < aEnd && newEnd > aStart;
  });
  if (clash) return res.status(409).json({ error: "Ese hueco ya no está disponible. Elige otro." });

  // Buscar o crear cliente por nombre (case-insensitive) dentro del negocio
  let client = db.prepare("SELECT * FROM clients WHERE business_id = ? AND lower(name) = lower(?)").get(business.id, name);
  if (!client) {
    const clientId = "cl_" + nanoid(10);
    db.prepare("INSERT INTO clients (id, business_id, name, phone) VALUES (?, ?, ?, ?)").run(clientId, business.id, name, phone || null);
    client = { id: clientId, name, phone };
  }

  const apptId = "ap_" + nanoid(10);
  db.prepare(`
    INSERT INTO appointments (id, business_id, staff_id, service_id, client_id, date, start, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')
  `).run(apptId, business.id, staffId, serviceId, client.id, date, start);

  res.status(201).json({
    id: apptId,
    date,
    start,
    service: { id: service.id, name: service.name, duration: service.duration, price: service.price },
    staff: { id: staffMember.id, name: staffMember.name },
    client: { id: client.id, name: client.name, phone: client.phone },
  });
});

module.exports = router;
