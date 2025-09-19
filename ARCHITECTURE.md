# Punto de Venta – Arquitectura y Flujos

Este documento explica la arquitectura, modelos de datos, flujos principales y aspectos operativos del sistema de punto de venta. Está orientado a facilitar el mantenimiento y futuras mejoras.

Actualiza este documento cuando cambien los modelos, rutas o scripts operativos.

## Resumen del sistema

- Framework: Next.js (App Router) con React y TypeScript.
- UI: Tailwind CSS, componentes propios (sin dependencia de UI externa).
- Datos: PostgreSQL gestionado vía Prisma.
- Autenticación: sesiones persistidas en DB y cookie de sesión.
- Dominio: gestión de Productos, Categorías, Mesas, Pedidos, Items y Pagos.
- Impresión: generación de payloads ESC/POS y envío por red.
- Operaciones: scripts de backup/restore, auto-update con cron, notificaciones por email.

## Topología y componentes

- Frontend (App Router):
  - POS en `src/app/pos/page.tsx` (flujo principal de venta).
  - Admin en `src/app/admin/*` (gestión de catálogos y salud).
  - Páginas varias: `src/app/ticket/[id]`, `src/app/reportes`, etc.
- API Routes (server actions REST): `src/app/api/**/route.ts` para CRUD de entidades y operaciones de negocio (pedidos, impresión, etc.).
- Middleware: `src/middleware.ts` protege rutas y valida enlaces firmados de tickets.
- Librerías de dominio:
  - `src/lib/db.ts`: Prisma singleton.
  - `src/lib/auth.ts`: hashing PBKDF2, manejo de sesiones.
  - `src/lib/money.ts`: helpers de moneda.
  - `src/lib/escpos.ts`: helpers para armar texto ESC/POS.
  - `src/lib/ticketSign.ts`: generación/verificación de enlaces firmados de tickets.
- Persistencia: Prisma + PostgreSQL. Esquema en `prisma/schema.prisma`. Semillas en `prisma/seed.ts`.
- Operaciones: scripts en `scripts/` (backups, auto-update, tailnet opcional, etc.).

## Modelo de Datos (resumen)

Definido en `prisma/schema.prisma`.

- Categoria (1–N) Producto.
- Producto: precio (centavos), costo (centavos), ingredientes/extras (Json), SKU opcional.
- Mesa: nombre único.
- Pedido: número correlativo, estado (ABIERTO/PAGADO/CANCELADO), mesa opcional, subCuenta (para dividir cuentas por mesa), totales en centavos y relación con Pagos e Items.
- PedidoItem: snapshot de producto (precio y costo unitarios en el momento), cantidad, extras/removidos/notas (Json), estado del ítem (PENDIENTE/EN_PROCESO/LISTO).
- Pago: método (EFECTIVO/TARJETA/TRANSFERENCIA), monto (centavos) y referencia.
- Usuario: nombre, email, rol (admin, cajero, mesero), hash de contraseña, activo.
- Ajustes: singleton (id=1) con locale/currency, taxPct, businessName, footer, IP/puerto de impresora, flags de auto impresión.
- Session: token de sesión, userId, expiresAt.
- TicketAccess: auditoría opcional de accesos a tickets.

Notas de diseño:
- Totales monetarios se guardan en centavos (enteros) para evitar errores de redondeo.
- En `PedidoItem` se guarda `costoCents` como snapshot para cálculos de margen históricos.

## Autenticación y Autorización

- Hash de contraseña: PBKDF2 (`src/lib/auth.ts`).
- Sesiones: tabla `Session` con `token`, `userId`, `expiresAt` y cookie `session` en el navegador.
- Middleware (`src/middleware.ts`):
  - Protege rutas de la app y API (excepto públicas específicas).
  - Permite `/ticket/[id]` con enlaces firmados sin sesión (ver más abajo).
- Roles:
  - Admin: acceso completo.
  - Cajero: puede cobrar y operar POS.
  - Mesero: operar POS sin acciones de cobro sensibles (según endpoints).

## Enlaces firmados para Tickets

- Generación: `src/lib/ticketSign.ts` crea URL con `id`, `exp` y `sig` (HMAC-SHA256 base64url).
- Variable de entorno: `TICKET_SIGN_SECRET` (recomendado en producción). Si no está, usa secreto efímero (solo dev).
- Middleware verifica `exp` y `sig` para permitir acceso a `/ticket/[id]` sin sesión.
- Endpoint auxiliar: `GET /api/tickets/signed-link/[id]` genera enlaces firmados (requiere sesión y rol admin/cajero).

## Rutas principales (API)

Todas en `src/app/api`. Requieren sesión salvo excepciones explícitas (middleware y rutas públicas documentadas).

- Autenticación
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Catálogos
  - `GET/POST /api/productos`
  - `GET/PUT/DELETE /api/producto/[id]`
  - `GET/POST /api/categorias`
  - `GET/PUT/DELETE /api/categorias/[id]`
  - `GET/POST /api/mesas`
- Pedidos y pagos
  - `POST /api/pedidos`: crea pedido; acepta items, impuestos/desc, y opcionalmente pago para marcar como PAGADO.
  - `GET /api/pedidos`: lista con filtros (fecha, estado, mesaId, subCuenta) y export CSV (`?format=csv`).
  - `GET /api/pedidos/[id]`: detalle (items, mesa, pagos).
  - `PUT /api/pedidos/[id]`: reemplaza items y totales; si incluye pago, marca PAGADO y crea `Pago`.
  - `DELETE /api/pedidos/[id]`: elimina pedido si ningún item está en proceso o listo.
- Impresión
  - `POST /api/print/network`: envía payload ESC/POS a impresora TCP (valida IP con Ajustes).
  - `GET /api/print/kitchen/[id]`: genera texto de cocina (sin formato ESC/POS).
- Tickets
  - `GET /api/tickets/signed-link/[id]`: genera enlace firmado con TTL.
- Ajustes
  - `GET /api/ajustes` y `PUT /api/ajustes`.

Otros endpoints existen en el árbol (`/api/kds`, `/api/reportes`, `/api/usuarios`, etc.) y son consistentes con este patrón.

## Flujos del POS (UI)

Ubicación: `src/app/pos/page.tsx`.

- Carga inicial: productos, categorías, mesas y ajustes.
- Carrito: líneas con cantidad, extras/removidos, notas; calcula subtotal, impuesto (por `taxPct`), descuento opcional y total.
- Mesas y subcuentas: si `tipo=Mesa`, soporta `subCuenta` por mesa (incremente la siguiente automáticamente si no se pasa).
- Crear pedido: `POST /api/pedidos`; si Ajustes tienen `autoKitchenOnCreate`, el backend devuelve `autoKitchen: true` y el cliente puede enviar a cocina.
- Editar orden abierta: `PUT /api/pedidos/[id]` sustituye líneas y totales; si incluye pago, pasa a `PAGADO`.
- Cobros y pagos: crea `Pago` con método y referencia; controla permisos por rol.
- Impresión:
  - Ticket ESC/POS: `src/lib/escpos.ts` arma payload (encabezado, líneas, cortes) y se envía con `POST /api/print/network`.
  - Cocina (texto plano): `GET /api/print/kitchen/[id]` devuelve listado legible.
- Enlaces de ticket para cliente: el cajero puede generar enlace firmado (`/api/tickets/signed-link/[id]`) para que el cliente lo abra sin login.

## Reportes

- `GET /api/pedidos?format=csv` exporta CSV de últimos pedidos (ordenado por fecha desc, límite 200). Útil para conciliación/contabilidad.
- `src/app/reportes/page.tsx` ofrece vistas de agregación (según implementación del proyecto).

## Ajustes (Ajustes singleton)

- `GET/PUT /api/ajustes` lee/actualiza campos: `locale`, `currency`, `taxPct`, `businessName`, `ticketFooter`, `logoUrl`, `printerIp`, `printerPort`, `serialBaud`, `autoKitchenOnCreate`, `autoKitchenOnReady`, `touchMode`.
- El POS utiliza `taxPct`, formato de moneda y parámetros de impresión según estos valores.

## Seguridad

- Cookies de sesión con bandera `Secure` en producción (ver `api/auth/login`).
- Middleware controla acceso y evita exposición de rutas privadas.
- Enlaces firmados: expiración obligatoria y validación HMAC; rechazo de tiempos >24h futuro.
- Validación de IP de impresora: `POST /api/print/network` solo permite IP configurada en `Ajustes`.
- Roles: controlan operaciones como cobro y eliminación de pedidos.

## Configuración y entorno

- Base de datos: `DATABASE_URL` (PostgreSQL).
- Ticket firmado: `TICKET_SIGN_SECRET` (recomendado en producción).
- UI/moneda: además de `Ajustes`, el helper `src/lib/money.ts` soporta `NEXT_PUBLIC_LOCALE`/`NEXT_PUBLIC_CURRENCY` si fueran necesarios en el cliente (preferir valores de `Ajustes`).

## Operaciones y Mantenimiento

Scripts en `scripts/`:

- Backups
  - `backup.sh`: respaldo de DB y archivos relevantes.
  - `backup-to-usb.sh`: copia a USB montado (rotación simple).
  - `restore.sh`: restauración segura.
  - `install-cron.sh`: instala cron diario (03:00/03:10 por defecto).
- Actualizaciones automáticas
  - `auto-update.sh`: `git pull` + build + restart, con `flock` y logs en `/opt/punto_de_venta/logs`.
  - Notificaciones: `notify.sh` usa mail/sendmail (Postfix relay) para enviar correos en éxito/fallo.
  - Cron semanal: programable (ejemplo: domingo 03:30).
- Acceso remoto (opcional)
  - `tailscale/` scripts para ejecución rootless (VPN userspace).

Logs y salud:
- Logs de auto-update y cron en `/opt/punto_de_venta/logs` (en el servidor).
- Se recomienda exponer/consultar páginas de estado en Admin para DB, backups, impresora.

## Impresión (detalle)

- Utilidades ESC/POS: `src/lib/escpos.ts` arma encabezado, líneas, cortes.
- Envío por red: `POST /api/print/network` abre socket TCP (puerto 9100 por defecto), tiempo de espera 8s.
- Cocina: `GET /api/print/kitchen/[id]` devuelve texto legible (no ESC/POS), útil para KDS/impresiones simples.

## Consideraciones de desempeño

- Consultas Prisma con includes selectivos para evitar cargas innecesarias.
- `createMany`/`deleteMany` para reemplazo de ítems de orden.
- Límite de 200 en listados de `/api/pedidos`.

## Puntos de extensión

- Métodos de pago adicionales: agregar enum en Prisma y lógica en `PUT/POST /api/pedidos`.
- Estados de ítems personalizados para KDS: extender `ItemStatus` y endpoints de KDS.
- Impresoras múltiples: extender `Ajustes` con perfiles y adaptar `POST /api/print/network`.
- Reportes agregados: crear endpoints bajo `/api/reportes` y páginas en `src/app/reportes`.

## Actualización de este documento

- Cuando cambies modelos (`prisma/schema.prisma`), rutas API o scripts en `scripts/`, actualiza la sección correspondiente.
- Añade ejemplos de flujos nuevos y anota requisitos de seguridad.
- Mantén enlaces y rutas 1:1 con el árbol de archivos para evitar desalineación.

## Anexo: Contratos y validaciones clave

- `POST /api/pedidos` y `PUT /api/pedidos/[id]`:
  - Entrada: items [{ productoId, cantidad, precioCents, extras?, removidos?, extrasCents?, notas? }], impuestoCents, descuentoCents?, pago?.
  - Reglas: cantidades >0, montos en centavos enteros, calcula subtotal/impuesto/desc/total; congela `costoCents` por producto.
  - Salida: `{ ok: true, pedidoId, pagoId?, numero?, subCuenta?, autoKitchen? }`.
- `DELETE /api/pedidos/[id]` bloquea si hay items EN_PROCESO o LISTO.
- `POST /api/print/network` valida IP contra `Ajustes`.
- Enlaces firmados de ticket: TTL 1–60 min, máximo 24h al futuro.

---

Autor: Rafael LLibre. Derechos reservados. Este repositorio está marcado UNLICENSED para uso interno.
