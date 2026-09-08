# Timely — Backend

API para reservas de barberías/peluquerías. Multi-negocio: cada barbería tiene
su propio `slug` (ej. `barberia-central`) y sus datos (equipo, servicios,
clientes, citas) están completamente aislados de los demás negocios.

## Cómo funciona

- Base de datos: SQLite (fichero `timely.db`, se crea solo). Para producción
  real con muchos negocios a la vez, en algún momento conviene migrar a
  Postgres, pero para lanzar y validar con tus primeros clientes esto es
  más que suficiente y no requiere contratar nada aparte.
- Cada negocio tiene una contraseña de administrador (guardada con hash
  bcrypt, nunca en texto plano).
- Las rutas de admin requieren un token (JWT) que se obtiene haciendo login.

## Poner esto en marcha en tu ordenador

```bash
npm install
npm run seed      # crea un negocio de ejemplo: barberia-central / demo1234
npm start          # arranca en http://localhost:3000
```

## Endpoints principales

### Públicos (los usa la pantalla de reserva del cliente)

- `GET /api/:slug` → nombre del negocio, dirección, equipo y servicios
- `GET /api/:slug/availability?serviceId=X&date=YYYY-MM-DD&staffId=Y(opcional)`
  → huecos libres de verdad, ya descontando las citas existentes
- `POST /api/:slug/appointments` → reserva una cita
  ```json
  { "serviceId": "sv_x", "staffId": "st_x", "date": "2026-09-10", "start": "10:00", "name": "Ana", "phone": "600..." }
  ```

### Administración (requieren `Authorization: Bearer <token>`)

- `POST /api/:slug/admin/login` `{ "password": "..." }` → `{ "token": "..." }`
- `GET /api/:slug/admin/appointments?date=YYYY-MM-DD`
- `POST /api/:slug/admin/appointments` (crear cita manualmente)
- `PATCH /api/:slug/admin/appointments/:id` (cancelar, cambiar hora/profesional)
- `GET/POST/DELETE /api/:slug/admin/services`
- `GET/POST/DELETE /api/:slug/admin/staff`
- `GET /api/:slug/admin/clients`

## Cómo crear un negocio nuevo

Ahora mismo `seed.js` crea uno de ejemplo a mano. Antes de tener varios
clientes reales, lo siguiente que conviene añadir es un endpoint tipo
`POST /api/businesses` para que un negocio nuevo pueda darse de alta él
mismo (elige su slug, su nombre y su contraseña) sin que tengas que tocar
código cada vez. Dímelo cuando quieras montarlo y seguimos por ahí.

## Desplegarlo con una URL real

Para que esto deje de vivir solo en tu ordenador, las opciones más simples
hoy en día (nivel gratuito o casi, sin gestionar servidores) son:

- **Railway** (railway.app) — conectas el repo de GitHub y despliega solo
- **Render** (render.com) — igual de directo, buen nivel gratuito
- **Fly.io** — un poco más técnico, pero muy barato para lo que necesitas

En cualquiera de los tres: subes este código a GitHub, conectas el repo,
defines la variable de entorno `JWT_SECRET` con un valor secreto propio
(no uses el de desarrollo), y le dices que ejecute `npm start`. Con eso
tendrás una URL pública tipo `https://timely-backend.up.railway.app`.

Nota importante sobre SQLite en estos servicios: el disco no siempre es
persistente entre despliegues (depende del plan). En cuanto quieras
mantener datos reales de clientes de forma fiable, avísame y migramos a
una base de datos gestionada (ej. Postgres de Railway/Supabase), es un
cambio pequeño porque toda la lógica ya está separada en `db.js`.

Actualizado.
