# Cómo Actualizar el Servidor del Punto de Venta

Este documento explica cómo actualizar la aplicación en el servidor de producción con los últimos cambios subidos a GitHub.

---

### ⚡ Opción 0: Sin SSH — La persona en el local ejecuta el actualizador

Si no puedes conectarte por SSH, guía a alguien en el local para que haga lo siguiente:

**Paso 1 — Abrir una terminal** (Ctrl + Alt + T en Ubuntu)

**Paso 2 — Pegar este único comando y presionar Enter:**

```bash
sudo bash /opt/punto_de_venta/scripts/actualizar.sh
```

Pedirá la contraseña del sistema, luego descarga la nueva versión, actualiza la base de datos, reconstruye y reinicia todo automáticamente. Al terminar dice `¡ACTUALIZACIÓN COMPLETADA!`.

> 💡 **Alternativa si el script no existía aún** (primera vez o borrado accidentalmente):
> ```bash
> sudo bash -c "curl -fsSL https://raw.githubusercontent.com/llibreprogram/punto_de_venta/main/scripts/actualizar.sh | bash"
> ```

---

### Prerrequisito

Antes de actualizar, asegúrate de que todos los cambios de código que quieres desplegar ya estén en tu repositorio de GitHub. (Debes haber ejecutado `git push` desde tu máquina de desarrollo).

---

### Opción 1: Usar el Script Automatizado (Recomendado)

El proyecto incluye un script (`scripts/update.sh`) que automatiza todos los pasos necesarios, incluyendo la migración de base de datos. Esta es la forma más fácil y segura de actualizar.

**Pasos:**

1.  **Conéctate a tu servidor Ubuntu por SSH.**

2.  **Navega al directorio de la aplicación:**
    ```bash
    cd /opt/punto_de_venta
    ```

3.  **Ejecuta el script de actualización:**
    ```bash
    sudo bash ./scripts/update.sh
    ```

El script se encargará de:
1. Detener la aplicación
2. Descargar el nuevo código desde GitHub
3. Reinstalar dependencias
4. **Aplicar cambios de base de datos** (`prisma db push`)
5. Reconstruir el proyecto
6. Volver a iniciar el servicio

Al final te mostrará el estado del servicio para confirmar que todo salió bien.

**Nota:** La primera vez que uses el script en un servidor nuevo, puede que necesites darle permisos de ejecución con `chmod +x scripts/update.sh`.

---

### Opción 2: Pasos Manuales

Si prefieres hacer el proceso manualmente o si el script falla por alguna razón, puedes seguir estos pasos:

1.  **Conéctate a tu servidor Ubuntu por SSH.**

2.  **Detén el servicio de la aplicación:**
    ```bash
    sudo systemctl stop pos
    ```

3.  **Navega al directorio de la aplicación:**
    ```bash
    cd /opt/punto_de_venta
    ```

4.  **Descarga la última versión del código desde GitHub:**
    ```bash
    sudo git fetch origin
    sudo git reset --hard origin/main
    ```

5.  **Reinstala dependencias (recomendado por si algo cambió):**
    ```bash
    sudo -u restaurante npm ci
    ```

6.  **Aplica los cambios de base de datos:**
    ```bash
    sudo -u restaurante npx prisma db push --skip-generate
    ```

    > ⚠️ **Este paso es obligatorio** cuando hay cambios en el esquema de la base de datos (como nuevas columnas). Si lo omites, la app puede fallar al arrancar.

7.  **Asegura los permisos correctos de los archivos:**
    ```bash
    sudo chown -R restaurante:restaurante .
    ```

8.  **Reconstruye la aplicación con los nuevos cambios:**
    ```bash
    NODE_ENV=production sudo -u restaurante npm run build
    ```

9.  **Inicia el servicio nuevamente:**
    ```bash
    sudo systemctl start pos
    ```

10. **(Opcional) Verifica que el servicio se haya iniciado correctamente:**
    ```bash
    sudo systemctl status pos
    ```
