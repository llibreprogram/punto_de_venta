### **Manual de Usuario del Sistema de Punto de Venta**

#### **1. Introducción**
Este manual describe las operaciones diarias y la configuración del sistema de Punto de Venta (POS). El sistema está diseñado para gestionar pedidos, pagos, y la administración de los recursos del restaurante de manera eficiente.

#### **2. Acceso al Sistema**
Para acceder al sistema, abre un navegador web (como Chrome o Firefox) en cualquier dispositivo conectado a la misma red WiFi que el servidor (tabletas, computadoras, etc.) y ve a la siguiente dirección:

**URL de Acceso:** `http://192.168.1.35:3001`

**Usuarios Iniciales:**
*   **Administrador:**
    *   **Email:** `admin@local`
    *   **Contraseña:** `admin123`
*   **Cajero:**
    *   **Email:** `cajero@local`
    *   **Contraseña:** `cajero123`

**¡IMPORTANTE!** El primer paso después de iniciar sesión como administrador es ir a la sección de **Administración > Usuarios** y cambiar la contraseña por defecto.

#### **3. Roles de Usuario**
El sistema tiene tres roles principales:
*   **Administrador:** Tiene acceso total al sistema. Puede gestionar productos, categorías, mesas, usuarios, ver reportes y cambiar la configuración del sistema.
*   **Cajero:** Puede realizar todas las operaciones de venta, incluyendo tomar pedidos y procesar pagos. No tiene acceso a la configuración del sistema ni a la gestión de usuarios.
*   **Mesero:** Puede tomar pedidos en las mesas y enviarlos a la cocina. Generalmente no procesa pagos.

---

### **OPERACIONES DIARIAS**

#### **4. Flujo de Venta Principal (POS)**
Esta es la pantalla principal para tomar órdenes. Se accede desde el menú **"POS"**.

Diseño adaptativo:
- En computadoras (pantallas grandes): verás el listado de productos y categorías a la derecha, y el panel del pedido (ticket) a la izquierda.
- En tabletas y móviles: los productos ocupan la pantalla y aparece un **botón flotante** para abrir el pedido como una hoja deslizante (desde abajo). Toca fuera o el botón de cerrar para ocultarlo.

Las categorías permanecen visibles en la parte superior (barra fija) para cambiar rápidamente entre secciones del menú.

**A. Crear un Pedido para Llevar (Mostrador):**
1.  Navega por las categorías y toca los productos para añadirlos al pedido. En móvil/tablet, usa el **botón flotante** para ver el pedido.
2.  En el panel del pedido puedes aumentar/disminuir cantidades y añadir notas.
3.  Pulsa **"Cobrar"** para finalizar.
4.  Selecciona el método de pago (Efectivo, Tarjeta, etc.) e introduce el monto.
5.  El sistema registra la venta y, si está configurado, imprime el ticket.

**B. Crear un Pedido en una Mesa:**
1.  Selecciona los productos del pedido.
2.  Asigna la mesa desde el POS (si está habilitado) y guarda/envía a cocina.
3.  El pedido quedará como cuenta abierta asociada a esa mesa.

**C. Ver y Gestionar Cuentas Abiertas:**
1.  Abre la vista de abiertas en: `http://192.168.1.35:3001/pos/abiertas`.
2.  Verás las órdenes abiertas, con auto‑refresco (conmutable) y botón **Refrescar**.
3.  Botón **"Fusionar duplicados"**: en caso de generar varias órdenes abiertas para la misma mesa/subcuenta, las combina en una sola.
4.  Puedes abrir una orden en el POS para continuar o cobrar.

#### **5. Pantalla de Cocina (KDS)**
La Pantalla para el Sistema de Cocina (KDS, por sus siglas en inglés) se accede desde el menú **"KDS"**.

1.  Cuando un mesero o cajero envía un pedido a cocina, los ítems aparecerán automáticamente en esta pantalla.
2.  El personal de cocina puede pulsar sobre cada ítem para cambiar su estado:
    *   **Pendiente -> En Proceso:** Indica que han empezado a preparar el plato.
    *   **En Proceso -> Listo:** Indica que el plato está terminado y listo para ser recogido.
3.  Los meseros pueden ver el estado de los platos desde la pantalla del POS para saber cuándo recogerlos.

---

### **ADMINISTRACIÓN Y CONFIGURACIÓN**
Estas secciones solo son visibles para el rol de **Administrador**.

#### **5. Salud del Sistema (Admin > Salud)**
En **Administración > Salud** encontrarás:
- Estado de **Base de datos** (health y ready).
- **Backups**: cantidad, tamaño total y último archivo disponible.
- **Sistema**: hora del servidor, versión de la app y versión de Node.

Acciones disponibles:
- **Forzar backup ahora**: ejecuta una copia de seguridad en el servidor inmediatamente y muestra el resultado.
- Accesos rápidos a `/api/health` y `/api/ready` (útil para diagnóstico).

Notas sobre backups:
- Hay una copia automática diaria programada (03:00). Para detalles de restauración o copias externas (USB), consulta el manual técnico: `BACKUP_RESTORE.md`.

#### **6. Gestión del Menú**
*   **Productos (`Admin > Productos`):**
    *   Aquí puedes crear nuevos productos (botón "Crear Producto"), establecer su precio, asignarlos a una categoría y opcionalmente añadir una imagen.
    *   También puedes editar productos existentes o desactivarlos para que no aparezcan en el menú de venta.
*   **Categorías (`Admin > Categorías`):**
    *   Crea y organiza las categorías de tu menú (ej: "Bebidas", "Entradas", "Platos Fuertes").

#### **7. Gestión del Restaurante**
*   **Mesas (`Admin > Mesas`):**
    *   Crea, edita o desactiva las mesas de tu restaurante.
*   **Usuarios (`Admin > Usuarios`):**
    *   Crea nuevas cuentas para tus empleados (cajeros, meseros).
    *   Asigna el rol correspondiente a cada uno.
    *   Puedes cambiar la contraseña de cualquier usuario.

#### **8. Configuración del Sistema**
Ve a la sección **"Configuración"** en el menú principal.
*   **Datos del Negocio:** Cambia el nombre del restaurante y el mensaje que aparece al pie del ticket.
*   **Impresión:** Configura la dirección IP y puerto de tu impresora de red, o el baud rate para serial.
    * Botones de prueba: desde esta pantalla puedes **probar impresión** de red o serial antes de usar en producción.
*   **Pantalla completa:** Hay un botón para alternar a modo de pantalla completa del navegador.

#### **9. Reportes**
*   **Reportes (`Reportes`):** Permite ver un resumen de ventas, productos más vendidos y otros datos clave, filtrados por rango de fechas.
*   **Ventas (`Ventas`):** Muestra un listado detallado de todas las transacciones (pedidos pagados) realizadas.

---

### **10. Solución de Problemas (rápido)**
- No carga el POS o tarda demasiado:
    - Verifica la URL `http://192.168.1.35:3001`.
    - Abre `http://192.168.1.35:3001/api/ready?html=1` para confirmar que el sistema está “Listo”.
- La impresora no imprime:
    - Prueba desde Configuración con los botones de impresión.
    - Revisa IP/puerto o cableado serial y vuelve a intentar.
- ¿Necesitas una copia de seguridad ahora mismo?:
    - En **Admin > Salud** pulsa **Forzar backup ahora**.
    - Para restaurar o hacer copias fuera del servidor (USB), sigue `BACKUP_RESTORE.md`.

---
Fin del Manual.
