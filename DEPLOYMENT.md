# Despliegue del Punto de Venta

Este proyecto es una app Next.js con Prisma. Puedes desplegarlo de varias formas:

## Instalación Rápida (Ubuntu) 🏎️

Durante esta instalación, si no existe `.env` se genera automáticamente a partir de `.env.example` (o un fallback mínimo con `DATABASE_URL="file:./dev.db"`). Luego se aplica el esquema (`prisma db push`) y, si está disponible, se ejecuta el seed inicial para crear usuarios y ajustes.

En una máquina Ubuntu limpia (con git y curl):

### One‑liner usando quick-install directamente
```bash
sudo bash -c "curl -fsSL https://raw.githubusercontent.com/llibreprogram/punto_de_venta/main/scripts/quick-install.sh -o /tmp/pos-install.sh && bash /tmp/pos-install.sh REPO_URL=https://github.com/llibreprogram/punto_de_venta.git"
```

### Método alterno (script clonador remoto)
```bash
curl -fsSL https://raw.githubusercontent.com/llibreprogram/punto_de_venta/main/scripts/remote-install.sh -o remote-install.sh
bash remote-install.sh https://github.com/llibreprogram/punto_de_venta.git
```

Después:
- Abrir en navegador: http://IP_DEL_SERVIDOR:3001
- Login: admin@local (cambia la contraseña en Usuarios)

El script crea servicio systemd (pos.service). Logs:

```bash
journalctl -u pos -f
```

## Opción A: Docker (recomendado)

Requisitos: Docker y Docker Compose.

1. Copia `.env.example` a `.env` y ajusta variables (dominio, moneda, impresora, etc.).
2. Construye e inicia:

```bash
docker compose build
docker compose up -d
```

- App en http://localhost:3001
- La base de datos SQLite persiste en el volumen `pos_data`.
- Cambia `NEXT_PUBLIC_BASE_URL` en `.env` al dominio real.

Para logs y gestión:

```bash
docker compose logs -f
docker compose restart pos
```

## Opción B: Servidor Linux (PM2 + Nginx)

Requisitos: Node 20+, Nginx, systemd.

1. Instala dependencias y compila:

```bash
npm ci
npm run prisma:generate
npm run build
```

2. Prepara BD y ejecuta en producción:

```bash
export NODE_ENV=production
npx prisma db push
npx pm2 start "next start -p 3001" --name pos
npx pm2 save
```

3. Configura Nginx (reverse proxy con TLS):

Ejemplo de servidor:

```
server {
  listen 80;
  server_name tu-dominio;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name tu-dominio;
  ssl_certificate /etc/letsencrypt/live/tu-dominio/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/tu-dominio/privkey.pem;

  client_max_body_size 10m;
  proxy_read_timeout 90s;

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  proxy_pass http://127.0.0.1:3001;
  }
}
```

## Opción C: Postgres gestionado

- Cambia `DATABASE_URL` a tu conexión Postgres.
- Usa migraciones Prisma en lugar de `db push`:

```bash
npx prisma migrate deploy
```

## Impresoras de red

- Configura IP/puerto en Configuración de la app.
- Asegúrate de que el contenedor/servidor pueda acceder a la IP (firewall/LAN).

## Buenas prácticas

- `NODE_ENV=production` siempre en prod.
- Cambia las credenciales seed tras el primer login.
- Respaldos periódicos del volumen/BD.
- Coloca la app detrás de Nginx/Caddy con TLS y HSTS.
- Monitoreo de logs y errores (Sentry opcional).
