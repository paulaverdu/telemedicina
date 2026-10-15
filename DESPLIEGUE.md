# Práctica 3 – Integración, Seguridad y Despliegue

## Ejecutar en local (XAMPP / MySQL)

```
npm install
npm run local        # lanza REST (3000), RPC (3501) y WebSocket de avisos (4444)
```

Gestor: http://localhost:3000/gestor — Sanitario: http://localhost:3000/sanitario

## Parte 1 – Ministerio de Sanidad

- Botón **"Enviar reservas al Ministerio"** (vista principal del gestor):
  1. `GET /api/recursos` y un `GET /api/recursos/:id/reservas` por cada recurso.
  2. Cada reserva se convierte al formato del Ministerio y se valida (`validarReserva` en `cliente_rest/main.js`):
     nombre/apellidos/categoría no vacíos, horas enteras > 0, fechas con formato correcto,
     fin sin inicio no permitido, inicio ≥ petición, fin ≥ inicio. Las incorrectas se muestran y **no** se envían.
  3. `POST /api/ministerio/datos` con las válidas; el servidor añade `id_area: 7` (Endocrinología) y la
     fecha de hoy (`YYYY-MM-DD`) y lo reenvía al Ministerio.
- Tabla **ranking** de reservas por área médica: `GET /api/ministerio/datos` (el servidor hace el GET al Ministerio).
- La URL del Ministerio se configura con la variable de entorno `MINISTERIO_URL`
  (por defecto la del enunciado: `https://undefined.ua.es/telemedicina/api/datos`).
- `undefined.ua.es` resuelve a una IP interna de la UA (172.25.x.x): solo es accesible desde la red de la
  universidad o con la VPN de la UA. Su certificado no incluye el intermedio, por eso la conexión desde Node se
  hace sin verificar la cadena (ver `peticionMinisterio` en `servidor_rest.js`).
- Para probar sin el Ministerio real: `npm run ministerio` (servidor de prueba) y `npm run local-prueba`.

## Parte 2 – JWT

- `POST /api/gestores/login` devuelve `{ token, id }` (el token caduca en 1 hora).
- `POST /api/gestores` (registro) y el login son públicos; **todos los demás `/api/...` exigen `?token=...`**
  (si no, responden 401).
- En el cliente, `rest.js` añade el token automáticamente a cada petición y, si el servidor responde 401,
  se vuelve al login.
- Clave del token: variable de entorno `JWT_SECRET`.

## Parte 3 – Despliegue (GitHub + Supabase + Render)

### 1. GitHub
```
git init
git add .
git commit -m "Practica 3"
git branch -M main
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin main
```
(`node_modules` no se sube, está en `.gitignore`.)

### 2. Supabase (base de datos)
1. Crear proyecto en https://supabase.com (guardar la contraseña de la BD).
2. **SQL Editor → New query**, pegar `telemedicina2026_postgres.sql` y **Run**.
3. **Connect** → copiar la cadena de conexión del **Session pooler** (funciona por IPv4, que es lo que usa Render):
   `postgresql://postgres.XXXX:[PASSWORD]@aws-0-eu-....pooler.supabase.com:5432/postgres`

### 3. Render (servidor Node)
1. New → **Web Service** → conectar el repositorio de GitHub.
2. Build command: `npm install` — Start command: `npm start` — Plan: Free.
   (Si el `package.json` no está en la raíz del repo, poner su carpeta en **Root Directory**.)
3. **Environment variables**:
   - `DATABASE_URL` = cadena de Supabase (con la contraseña puesta)
   - `JWT_SECRET` = una clave cualquiera larga
   - `MINISTERIO_URL` = URL real del servicio del Ministerio
4. Deploy. La app del gestor queda en `https://NOMBRE.onrender.com/gestor`.

Cuando existe `DATABASE_URL`, `conexion_mysql.js` usa PostgreSQL en vez de MySQL, y `servidor_rest.js`
monta los avisos WebSocket en el mismo puerto (Render solo expone uno). En el plan gratuito el servidor se
"duerme" tras un rato sin uso: la primera petición puede tardar ~1 minuto.
