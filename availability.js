const DAY_START_MIN = 8 * 60; // 08:00
const DAY_END_MIN = 21 * 60; // 21:00
const SLOT_STEP = 30; // minutos

function pad(n) { return n.toString().padStart(2, "0"); }
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function fromMinutes(mins) {
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}

/**
 * Calcula los huecos libres para un día dado, un servicio (duración) y opcionalmente un profesional concreto.
 * staffList: [{id}]
 * existingAppts: [{staff_id, start, duration}]  (duration ya resuelta en minutos)
 * returns: [{staffId, time}]
 */
function computeAvailability({ staffList, existingAppts, serviceDuration, dateStr, staffId }) {
  const candidates = staffId ? staffList.filter((s) => s.id === staffId) : staffList;
  const isToday = dateStr === new Date().toISOString().slice(0, 10);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const results = [];
  for (const person of candidates) {
    const personAppts = existingAppts.filter((a) => a.staff_id === person.id);
    for (let m = DAY_START_MIN; m + serviceDuration <= DAY_END_MIN; m += SLOT_STEP) {
      const slotStart = m;
      const slotEnd = m + serviceDuration;
      const clash = personAppts.some((a) => {
        const aStart = toMinutes(a.start);
        const aEnd = aStart + a.duration;
        return slotStart < aEnd && slotEnd > aStart;
      });
      if (!clash && !(isToday && slotStart <= nowMin)) {
        results.push({ staffId: person.id, time: fromMinutes(slotStart) });
      }
    }
  }
  return results.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}

module.exports = { computeAvailability, toMinutes, fromMinutes };
