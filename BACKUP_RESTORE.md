# Backups y Restauración — Punto de Venta

Este manual explica cómo crear y restaurar backups de la aplicación en `/opt/punto_de_venta`.

Los scripts funcionan con SQLite y PostgreSQL (se detecta desde `DATABASE_URL` en `.env`).

---

## Requisitos

- Linux con bash.
- Node instalado (para el servicio).
- PostgreSQL (solo si usas Postgres): cliente instalado para `pg_dump`/`pg_restore`.

Instalar cliente Postgres si hace falta:

```bash
sudo apt-get update && sudo apt-get install -y postgresql-client
```

---

## Dónde están los scripts y los backups

- Scripts: `scripts/backup.sh` y `scripts/restore.sh`
- Backups: carpeta `backups/` dentro del proyecto. Cada backup se llama `backup_YYYYmmdd_HHMMSS.tar.gz`.

El backup incluye:
- Base de datos (dump de Postgres o copia del archivo SQLite)
- `meta.txt` con timestamp, host, commit, etc.
- `.env` y `prisma/schema.prisma` (si existen)

Conserva automáticamente los últimos 10 backups (rotación).

---

## Crear un backup

```bash
cd /opt/punto_de_venta
chmod +x scripts/backup.sh
./scripts/backup.sh

# Ver backups creados
ls -lh backups/
```

Salida esperada:

```
[INFO] Detectado PostgreSQL. Creando dump con pg_dump...
[OK] Backup creado: /opt/punto_de_venta/backups/backup_2025...
[INFO] Rotando backups (mantener últimos 10)...
[DONE]
```

---

## Restaurar un backup

Advertencia: restaurar sobreescribe datos. Asegúrate de respaldar antes.

```bash
cd /opt/punto_de_venta
chmod +x scripts/restore.sh

# Restaurar el más reciente
LATEST=$(ls -1t backups/backup_*.tar.gz | head -1)
./scripts/restore.sh "$LATEST"

# O indicar una ruta concreta
./scripts/restore.sh backups/backup_2025...tar.gz
```

Qué hace:
- Detiene el servicio (`pos` o `punto-de-venta`) si existe.
- SQLite: reemplaza el archivo de DB (crea copia .bak_YYYYmmdd_HHMMSS).
- PostgreSQL: ejecuta `pg_restore` contra `DATABASE_URL`.
- Reinicia el servicio o arranca con `nohup` si no hay systemd.

Verificación:

```bash
ss -tlnp | grep :3001 || curl -I http://localhost:3001 | head -3
```

---

## Automatizar backups (cron)

Ejecutar backup todos los días a las 03:00 AM:

```bash
crontab -e
# añade esta línea (ajusta ruta si difiere)
0 3 * * * cd /opt/punto_de_venta && ./scripts/backup.sh >> /opt/punto_de_venta/backup.log 2>&1
```

Revisar log de cron:

```bash
tail -n 100 /opt/punto_de_venta/backup.log
```

---

## Copia fuera del servidor (offsite)

Para mayor seguridad, copia los tar.gz a otra máquina o disco:

```bash
# Desde tu PC
scp restaurante@<IP_SERVIDOR>:/opt/punto_de_venta/backups/backup_*.tar.gz ./mis-backups/

# O usa rsync
rsync -avz restaurante@<IP_SERVIDOR>:/opt/punto_de_venta/backups/ /ruta/externa/segura/
```

---

## Preguntas frecuentes (FAQ)

- ¿Dónde se toma la ruta de la BD?
  - De `DATABASE_URL` en `.env`. Si es `file:./dev.db`, se asume SQLite; si es `postgres://...`, Postgres.

- ¿Qué pasa si `.env` tiene valores con espacios?
  - Los scripts leen solo `DATABASE_URL` sin hacer `source` del archivo completo, evitando errores.

- ¿Y si el servidor no tiene internet?
  - No afecta el backup/restore. Para desplegar código, usa el flujo “offline” con `rsync`/`scp` (ver `COMO_ACTUALIZAR.md`).

- ¿Cuántos backups conserva?
  - Los últimos 10. Puedes ajustar el número editando `scripts/backup.sh` (buscar `tail -n +11`).

---

## Soporte y mantenimiento

- Recomendación: realizar un backup manual antes de cada actualización.
- Probar la restauración en un entorno de prueba cuando sea posible.
- Monitorizar espacio en disco: `du -sh backups/` y `df -h`.
