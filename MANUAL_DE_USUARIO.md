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

**A. Crear un Pedido para Llevar (Mostrador):**
1.  En la parte derecha de la pantalla, selecciona los productos que el cliente desea. Puedes cambiar de categoría para ver más productos.
2.  Los productos seleccionados aparecerán en el ticket del lado izquierdo. Puedes pulsar sobre un ítem para aumentar la cantidad o añadir notas.
3.  Una vez completado el pedido, pulsa el botón **"Cobrar"**.
4.  Selecciona el método de pago (Efectivo, Tarjeta, etc.) e introduce el monto.
5.  El sistema registrará la venta y, si está configurado, imprimirá un ticket.

**B. Crear un Pedido en una Mesa:**
1.  Selecciona los productos del pedido.
2.  En la parte superior del ticket (lado izquierdo), pulsa la pestaña **"Mesas"**.
3.  Selecciona la mesa donde se sentará el cliente.
4.  Pulsa el botón **"Guardar Orden"** o **"Enviar a Cocina"**. Esto guarda el pedido como una cuenta abierta asociada a esa mesa.

**C. Ver y Gestionar Cuentas Abiertas:**
1.  Ve a la sección **"POS > Cuentas Abiertas"** en el menú.
2.  Aquí verás una lista de todas las mesas y pedidos que aún no han sido pagados.
3.  Puedes seleccionar una cuenta para añadir más productos o para proceder a su cobro.

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
*   **Impresión:** Aquí puedes configurar la dirección IP de tu impresora de red para imprimir tickets y comandas de cocina.

#### **9. Reportes**
*   **Reportes (`Reportes`):** Permite ver un resumen de ventas, productos más vendidos y otros datos clave, filtrados por rango de fechas.
*   **Ventas (`Ventas`):** Muestra un listado detallado de todas las transacciones (pedidos pagados) realizadas.

---
Fin del Manual.
