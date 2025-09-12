# Cómo Actualizar el Servidor del Punto de Venta

Este documento explica cómo actualizar la aplicación en el servidor de producción con los últimos cambios subidos a GitHub.

### Prerrequisito

Antes de actualizar, asegúrate de que todos los cambios de código que quieres desplegar ya estén en tu repositorio de GitHub. (Debes haber ejecutado `git push` desde tu máquina de desarrollo).

---

### Opción 1: Usar el Script Automatizado (Recomendado)

El proyecto incluye un script (`scripts/update.sh`) que automatiza todos los pasos necesarios. Esta es la forma más fácil y segura de actualizar.

**Pasos:**

1.  **Conéctate a tu servidor Ubuntu por SSH.**

2.  **Navega al directorio de la aplicación:**
    ```bash
    cd /opt/punto_de_venta
    ```

3.  **Ejecuta el script de actualización:**
    ```bash
    sudo ./scripts/update.sh
    ```

El script se encargará de detener la aplicación, descargar el nuevo código, reconstruir el proyecto y volver a iniciarlo. Al final, te mostrará el estado del servicio para confirmar que todo ha ido bien.

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

6.  **Asegura los permisos correctos de los archivos:**
    ```bash
    sudo chown -R restaurante:restaurante .
    ```

7.  **Reconstruye la aplicación con los nuevos cambios:**
    ```bash
    NODE_ENV=production sudo -u restaurante npm run build
    ```

8.  **Inicia el servicio nuevamente:**
    ```bash
    sudo systemctl start pos
    ```

9.  **(Opcional) Verifica que el servicio se haya iniciado correctamente:**
    ```bash
    sudo systemctl status pos
    ```
