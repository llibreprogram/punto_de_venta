#!/usr/bin/env bash
# Resetea las contraseñas a los valores por defecto solicitados
echo "Reseteando contraseñas de administrador y cajero..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$APP_DIR"
npx tsx scripts/reset-user-password.ts admin@local admin1234
npx tsx scripts/reset-user-password.ts cajero@local cajero123
echo "✅ Contraseñas reseteadas."
