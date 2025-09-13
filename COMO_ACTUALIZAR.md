# Cómo actualizar el servidor del Punto de Venta

Este documento describe dos caminos para actualizar la app en producción ubicada en `/opt/punto_de_venta`:

- Con internet en el servidor (vía Git) → rápido y reproducible.
- Sin internet en el servidor (vía copia desde tu PC) → útil en redes cerradas.

Además, el nombre del servicio systemd puede variar. Hemos visto instalaciones con `pos` y otras con `punto-de-venta`. Más abajo indicamos cómo detectarlo.

---

## Prerrequisitos

- Tu código debe estar listo y probado localmente. Si usas el flujo con Git, asegúrate de haber hecho `git push` previamente.
- Ruta de la app en el servidor: `/opt/punto_de_venta`
- Usuario de ejecución: `restaurante`
- Puerto por defecto: `3001`

---

## Detectar el nombre del servicio (si usas systemd)

En el servidor, ejecuta uno de estos comandos para ver si existe un servicio:

```bash
systemctl status pos || systemctl status punto-de-venta || true
```

Si ves que uno de ellos existe, usa ese nombre en los comandos de stop/start. Si no existe ninguno, más abajo tienes un arranque alternativo sin systemd (nohup).

---

## Opción A · Actualización con internet (Git)

1) Conéctate por SSH y detén el servicio si existe:

```bash
sudo systemctl stop pos 2>/dev/null || sudo systemctl stop punto-de-venta 2>/dev/null || true
```

2) Entra al directorio de la app:

```bash
cd /opt/punto_de_venta
```

3) Actualiza el código desde GitHub:

```bash
sudo git config --global --add safe.directory /opt/punto_de_venta
sudo git fetch origin
sudo git reset --hard origin/main
```

4) Instala dependencias y reconstruye:

```bash
sudo -u restaurante npm ci || sudo -u restaurante npm install
NODE_ENV=production sudo -u restaurante npm run build
```

5) Arranca la aplicación:

```bash
sudo systemctl start pos 2>/dev/null || sudo systemctl start punto-de-venta 2>/dev/null || \
  (pkill -f "next start -p 3001" 2>/dev/null || true; nohup npm start -- -p 3001 >/tmp/pos.log 2>&1 &)
```

6) Verifica:

```bash
ss -tlnp | grep :3001 || curl -I http://localhost:3001 | head -3
```

---

## Opción B · Actualización sin internet (copia desde tu PC)

Cuando el servidor no puede resolver `github.com`, sube los cambios desde tu máquina y reconstruye allí.

1) Desde tu PC, sincroniza archivos al servidor (recomendado `rsync`):

```bash
rsync -avz --delete \
  --exclude .git --exclude node_modules --exclude .next \
  ./ restaurante@<IP_DEL_SERVIDOR>:/opt/punto_de_venta/
```

Alternativa rápida con `scp` (no borra archivos obsoletos):

```bash
scp -r src public prisma package.json package-lock.json next.config.ts tsconfig.json \
  restaurante@<IP_DEL_SERVIDOR>:/opt/punto_de_venta/
```

2) En el servidor, instala y construye:

```bash
cd /opt/punto_de_venta
sudo -u restaurante npm ci || sudo -u restaurante npm install
NODE_ENV=production sudo -u restaurante npm run build
```

3) Reinicia con systemd si lo tienes, si no usa nohup:

```bash
sudo systemctl restart pos 2>/dev/null || sudo systemctl restart punto-de-venta 2>/dev/null || \
  (pkill -f "next start -p 3001" 2>/dev/null || true; nohup npm start -- -p 3001 >/tmp/pos.log 2>&1 &)
```

4) Verifica el puerto/HTTP:

```bash
ss -tlnp | grep :3001 || curl -I http://localhost:3001 | head -3
```

---

## Script automatizado (online)

Existe `scripts/update.sh` que implementa la ruta con internet (Git) y asume un servicio llamado `pos`. Si tu servicio se llama distinto o el servidor no tiene internet, usa la Opción A/B de arriba.

Para ejecutarlo:

```bash
cd /opt/punto_de_venta
sudo chmod +x scripts/update.sh
sudo bash scripts/update.sh
```

---

## Sugerencia: crear un servicio systemd (opcional)

Si no tienes todavía un servicio, puedes crear uno (ejemplo `pos.service`):

```ini
[Unit]
Description=Punto de Venta
After=network.target

[Service]
Type=simple
User=restaurante
WorkingDirectory=/opt/punto_de_venta
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start -- -p 3001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Instalación rápida:

```bash
sudo tee /etc/systemd/system/pos.service >/dev/null <<'EOF'
[Unit]
Description=Punto de Venta
After=network.target

[Service]
Type=simple
User=restaurante
WorkingDirectory=/opt/punto_de_venta
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start -- -p 3001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now pos
```

---

## Notas

- Si `npm ci` falla por falta de `package-lock.json`, usa `npm install`.
- Si cambiaste variables en `.env`, vuelve a construir (`npm run build`).
- Para logs cuando inicias sin systemd: `tail -f /tmp/pos.log`.

---

## Backups y restauración

Hemos agregado dos scripts (ver guía detallada en `BACKUP_RESTORE.md`):

- `scripts/backup.sh`: crea un backup en `./backups/backup_YYYYmmdd_HHMMSS.tar.gz` con:
  - Dump de PostgreSQL (`pg_dump -Fc`) o copia de SQLite (archivo `db.sqlite`), según `DATABASE_URL`.
  - `meta.txt` con timestamp, host, commit, etc.
  - Copias de `.env` y `prisma/schema.prisma` (si existen).
  - Rotación: conserva los últimos 10 backups.

- `scripts/restore.sh <backup.tar.gz>`: restaura desde un backup creado con `backup.sh`.
  - SQLite: detiene servicio, reemplaza el archivo y reinicia.
  - PostgreSQL: usa `pg_restore` (requiere cliente instalado y permisos).

Ejemplos:

```bash
# Crear backup
cd /opt/punto_de_venta
sudo chmod +x scripts/backup.sh scripts/restore.sh
./scripts/backup.sh

# Listar backups
ls -lh backups/

# Restaurar el más reciente (¡CUIDADO! sobreescribe datos)
LATEST=$(ls -1t backups/backup_*.tar.gz | head -1)
./scripts/restore.sh "$LATEST"
```

Notas:

- Para PostgreSQL, instala el cliente:
  ```bash
  sudo apt-get update && sudo apt-get install -y postgresql-client
  ```
- En SQLite, la ruta del archivo se resuelve desde `DATABASE_URL` (por ejemplo, `file:./dev.db`). El script también intenta detectar rutas comunes.
