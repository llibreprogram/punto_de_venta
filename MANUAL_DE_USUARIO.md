---

> **© 2026 Rafael Llibre. Todos los derechos reservados.**  
> Contacto: haciendallibre@gmail.com  
> 
> Este documento y el software que describe son propiedad intelectual de **Rafael Llibre**.  
> Queda estrictamente prohibida la reproducción, distribución, modificación o uso comercial  
> total o parcial de este material sin la autorización expresa y por escrito del propietario.  
> El uso no autorizado será perseguido conforme a las leyes de propiedad intelectual aplicables.

---

### **Manual de Usuario del Sistema de Punto de Venta**
### Versión 2.0 — Actualizado Abril 2026

#### **1. Introducción**
Este manual describe las operaciones diarias y la configuración del sistema de Punto de Venta (POS). El sistema está diseñado para gestionar pedidos, pagos, y la administración de los recursos del restaurante de manera eficiente.

En esta versión 2.0 se han incorporado mejoras significativas:
- **Dashboard de Administración** con estadísticas en tiempo real.
- **Punto de Venta Moderno** con arquitectura modular y animaciones fluidas.
- **Gestor de Cuentas por Mesa** con arrastrar y soltar (Drag & Drop).
- **Descuentos interactivos** directamente desde el panel de cobro.

#### **2. Acceso al Sistema**
Para acceder al sistema, abre un navegador web (como Chrome o Firefox) en cualquier dispositivo conectado a la misma red WiFi que el servidor (tabletas, computadoras, etc.) y ve a la siguiente dirección:

**URL de Acceso:** `http://192.168.1.59:3000`

**Usuarios Iniciales:**
*   **Administrador:**
    *   **Email:** `admin@local`
    *   **Contraseña:** `admin1234`
*   **Cajero:**
    *   **Email:** `cajero@local`
    *   **Contraseña:** `cajero123`

**¡IMPORTANTE!** El primer paso después de iniciar sesión como administrador es ir a la sección de **Administración > Usuarios** y cambiar la contraseña por defecto.

#### **3. Roles de Usuario**
El sistema tiene tres roles principales:
*   **Administrador:** Tiene acceso total al sistema. Puede gestionar productos, categorías, mesas, usuarios, ver reportes, acceder al Dashboard y cambiar la configuración del sistema.
*   **Cajero:** Puede realizar todas las operaciones de venta, incluyendo tomar pedidos y procesar pagos. No tiene acceso a la configuración del sistema ni a la gestión de usuarios.
*   **Mesero:** Puede tomar pedidos en las mesas y enviarlos a la cocina. Generalmente no procesa pagos.

---

### **OPERACIONES DIARIAS**

#### **4. Flujo de Venta Principal (POS)**
Esta es la pantalla principal para tomar órdenes. Se accede desde el menú **"POS"**.

**Diseño de Pantalla:**
La pantalla del POS está dividida en tres áreas principales:
- **Barra Superior (Header):** Contiene el selector de tipo de orden (Mostrador/Mesa/Delivery), el selector de Mesa (cuando aplica), el botón **"Gestor de Cuentas"**, la barra de búsqueda rápida de productos, y los accesos rápidos a Órdenes Abiertas, Cocina (KDS), Configuración y Pantalla Completa.
- **Cuadrícula de Productos (Centro-Izquierda):** Muestra las categorías como pestañas en la parte superior (Todo, Acompañantes, Bebidas, Combos, etc.) y los productos como tarjetas con su imagen, nombre y precio. Al tocar un producto, se añade automáticamente al carrito.
- **Panel de la Orden (Derecha):** Muestra los productos añadidos con sus cantidades, precios, opciones de personalización, descuentos, impuestos (ITEBIS) y propina. Contiene los botones de acción: **Vaciar/Eliminar**, **Guardar** y **Cobrar**.

**A. Crear un Pedido para Llevar (Mostrador):**
1.  Asegúrate de que el tipo esté en **"Mostrador"** (selector en la barra superior).
2.  Navega por las categorías tocando las pestañas, o usa la **barra de búsqueda** (Ctrl+K como atajo).
3.  Toca los productos para añadirlos al carrito. La cantidad se incrementa automáticamente.
4.  En el panel derecho puedes:
    - Aumentar (+) o disminuir (-) la cantidad.
    - Presionar **"Personalizar"** para quitar ingredientes, añadir extras, o escribir una nota especial.
5.  (Opcional) Aplicar un **descuento**: cambia entre "$" (monto fijo) o "%" (porcentaje) y escribe el valor.
6.  Pulsa **"Cobrar"** para finalizar.
7.  En el modal de cobro:
    - Selecciona el método: **Efectivo**, **Tarjeta** o **Transferencia**.
    - Para efectivo: usa los **botones rápidos de billetes** (RD$100, RD$200, RD$500, RD$1000, RD$2000) o escribe el monto manualmente.
    - El sistema calcula automáticamente el **cambio** a devolver.
    - Presiona **"Confirmar Pago"**.
8.  El sistema registra la venta, abre el ticket de impresión y limpia el carrito.

**B. Crear un Pedido en una Mesa:**
1.  Cambia el tipo a **"Mesa"** en el selector de la barra superior.
2.  Selecciona la mesa deseada (Ej: "Mesa 1") del segundo selector.
3.  Añade los productos al carrito.
4.  Presiona **"Guardar"** para enviar la orden a cocina. El pedido quedará como cuenta abierta.
5.  La etiqueta naranja en la parte superior (Ej: "Mesa Mesa 1 · C1") confirma la mesa y cuenta activa.

**C. Personalización de Productos:**
Al añadir un producto al carrito, puedes presionar **"Personalizar"** para desplegar opciones avanzadas:
- **Ingredientes (Desmarca para quitar):** Cada ingrediente del producto aparece como una etiqueta. Desmárcalo para indicar que el cliente no lo quiere (Ej: "Sin cebolla").
- **Extras Añadidos:** Si el producto tiene extras configurados (Ej: "Queso extra +RD$50"), márcalos para añadirlos. El precio se ajusta automáticamente.
- **Nota Especial:** Campo de texto libre para instrucciones específicas (Ej: "Término medio", "Para llevar", "Sin sal").

**D. Aplicar Descuentos:**
En el panel inferior del carrito encontrarás la fila de **"Descuento"**:
1.  Selecciona el tipo de descuento:
    - **$** — Monto fijo en pesos (Ej: "100" = RD$100 de descuento).
    - **%** — Porcentaje sobre el subtotal (Ej: "10" = 10% de descuento).
2.  Escribe el valor y el sistema lo aplica automáticamente al total.
3.  El descuento se guarda junto con la orden.

**E. Botón Vaciar / Eliminar:**
- **"Vaciar"** (cuando no hay pedido guardado): Limpia todos los productos del carrito actual.
- **"Eliminar"** (cuando estás editando un pedido guardado): Elimina la orden completamente de la base de datos. Si algún ítem ya está marcado como **"En Preparación"** o **"Listo"** en cocina, el sistema lo bloquea y muestra un aviso para proteger la integridad de la operación.

---

#### **5. Gestor de Cuentas por Mesa (Drag & Drop)**
Esta es una de las funcionalidades más poderosas del sistema. Permite gestionar visualmente las cuentas separadas de una mesa.

**¿Cuándo usarlo?**
- Cuando un grupo de personas en una mesa quiere pagar por separado.
- Cuando necesitas mover un platillo de la cuenta de una persona a otra.
- Cuando quieres cobrar a una persona sin afectar las demás cuentas de la mesa.

**¿Cómo acceder?**
1.  Selecciona el tipo **"Mesa"** y elige una mesa (Ej: Mesa 1).
2.  Presiona el botón negro **"Gestor de Cuentas"** que aparece al lado del selector de mesa.

**¿Qué verás?**
Se abrirá un panel de pantalla completa con las siguientes secciones:
- **Encabezado:** Muestra "Gestor de Cuentas → Mesa [Nombre]" y la cantidad de cuentas abiertas.
- **Columnas de Cuentas:** Cada cuenta (C1, C2, C3...) se muestra como una columna vertical con:
  - Nombre de la cuenta y total con impuestos.
  - Lista de productos arrastrables.
  - Botón **"Cobrar C[N]"** para despachar esa cuenta individual.
  - Ícono de **basura (🗑️)** para eliminar la cuenta completa.
- **Columna "Nueva Cuenta":** Una zona punteada con el ícono (+) donde puedes soltar productos para crear una nueva cuenta automáticamente.

**Operaciones disponibles:**
| Acción | Cómo hacerlo |
|--------|-------------|
| **Mover un producto** | Haz clic en el producto y arrástralo a otra columna |
| **Crear cuenta nueva** | Arrastra un producto a la zona "Nueva Cuenta" |
| **Cobrar una cuenta** | Presiona "Cobrar C[N]" en la columna deseada |
| **Eliminar cuenta** | Presiona el ícono 🗑️ (solo si no hay ítems en cocina) |
| **Cerrar el gestor** | Presiona la X en la esquina superior derecha |

**Notas importantes:**
- Los productos deben estar **guardados** (enviados a cocina) para que aparezcan en el Gestor. Los productos que solo están en la pantalla del carrito pero no se han guardado no se mostrarán.
- Al arrastrar un producto, la columna destino se ilumina en color ámbar para indicar que está lista para recibir el producto.
- Si cierras el Gestor después de hacer cambios, la página se recarga automáticamente para sincronizar.
- Funciona perfectamente con **pantallas táctiles** (tablets), ideal para que los meseros gestionen las cuentas directamente en el salón.

---

#### **6. Pantalla de Cocina (KDS)**
La Pantalla para el Sistema de Cocina (KDS, por sus siglas en inglés) se accede desde el menú **"KDS"** o desde el ícono del gorro de chef en la barra superior del POS.

1.  Cuando un mesero o cajero envía un pedido a cocina, los ítems aparecerán automáticamente en esta pantalla.
2.  El personal de cocina puede pulsar sobre cada ítem para cambiar su estado:
    *   **Pendiente -> En Proceso:** Indica que han empezado a preparar el plato.
    *   **En Proceso -> Listo:** Indica que el plato está terminado y listo para ser recogido.
3.  Los meseros pueden ver el estado de los platos desde la pantalla del POS para saber cuándo recogerlos.

**Protección de Cocina:** Si un ítem ya está marcado como "En Proceso" o "Listo", el sistema impide que sea eliminado accidentalmente desde el POS, mostrando el mensaje: *"No se puede eliminar la orden porque ya está en proceso o lista."*

---

#### **7. Ver y Gestionar Cuentas Abiertas**
1.  Abre la vista de abiertas en: `http://192.168.1.35:3001/pos/abiertas`, o presiona el ícono de recibos en la barra superior del POS.
2.  Verás las órdenes abiertas, con auto‑refresco (conmutable) y botón **Refrescar**.
3.  Botón **"Fusionar duplicados"**: en caso de generar varias órdenes abiertas para la misma mesa/subcuenta, las combina en una sola.
4.  Puedes abrir una orden en el POS para continuar o cobrar.

---

### **ADMINISTRACIÓN Y CONFIGURACIÓN**
Estas secciones solo son visibles para el rol de **Administrador**.

#### **8. Dashboard de Administración (NUEVO)**
Accede al Dashboard desde **"Admin > Dashboard"** o desde el enlace en el menú principal de administración.

El Dashboard muestra en tiempo real:
- **Indicadores Clave (KPIs):**
  - **Ventas del Día:** Total de ventas realizadas hoy en pesos.
  - **Pedidos del Día:** Cantidad de pedidos procesados.
  - **Ticket Promedio:** Valor promedio por transacción.
  - **Producto Estrella:** El producto más vendido del período.

- **Gráfica de Evolución de Ventas:** Un gráfico de líneas que muestra la tendencia de las ventas en los últimos días/semanas.

- **Ranking de Productos:** Los productos más vendidos con sus cantidades, ordenados de mayor a menor.

Todos los datos se obtienen de la API `/api/reportes` y se actualizan cada vez que abres la página.

#### **9. Salud del Sistema (Admin > Salud)**
En **Administración > Salud** encontrarás:
- Estado de **Base de datos** (health y ready).
- **Backups**: cantidad, tamaño total y último archivo disponible.
- **Sistema**: hora del servidor, versión de la app y versión de Node.

Acciones disponibles:
- **Forzar backup ahora**: ejecuta una copia de seguridad en el servidor inmediatamente y muestra el resultado.
- Accesos rápidos a `/api/health` y `/api/ready` (útil para diagnóstico).

Notas sobre backups:
- Hay una copia automática diaria programada (03:00). Para detalles de restauración o copias externas (USB), consulta el manual técnico: `BACKUP_RESTORE.md`.

#### **10. Gestión del Menú**
*   **Productos (`Admin > Productos`):**
    *   Aquí puedes crear nuevos productos (botón "Crear Producto"), establecer su precio, asignarlos a una categoría y opcionalmente añadir una imagen.
    *   También puedes editar productos existentes o desactivarlos para que no aparezcan en el menú de venta.
    *   Puedes configurar **ingredientes** (para que el cliente pueda quitar) y **extras** (con su precio adicional).
*   **Categorías (`Admin > Categorías`):**
    *   Crea y organiza las categorías de tu menú (ej: "Bebidas", "Entradas", "Platos Fuertes").

#### **11. Gestión del Restaurante**
*   **Mesas (`Admin > Mesas`):**
    *   Crea, edita o desactiva las mesas de tu restaurante.
    *   Las mesas son la base del **Gestor de Cuentas** (ver sección 5).
*   **Usuarios (`Admin > Usuarios`):**
    *   Crea nuevas cuentas para tus empleados (cajeros, meseros).
    *   Asigna el rol correspondiente a cada uno.
    *   Puedes cambiar la contraseña de cualquier usuario.

#### **12. Configuración del Sistema**
Ve a la sección **"Configuración"** en el menú principal.
*   **Datos del Negocio:** Cambia el nombre del restaurante y el mensaje que aparece al pie del ticket.
*   **Impuestos:** Configura el porcentaje de ITEBIS y Propina Legal.
*   **Impresión:** Configura la dirección IP y puerto de tu impresora de red, o el baud rate para serial.
    * Botones de prueba: desde esta pantalla puedes **probar impresión** de red o serial antes de usar en producción.
*   **Pantalla completa:** Hay un botón para alternar a modo de pantalla completa del navegador (también disponible desde el ícono en la barra superior del POS).

#### **13. Reportes**
*   **Reportes (`Reportes`):** Permite ver un resumen de ventas, productos más vendidos y otros datos clave, filtrados por rango de fechas.
*   **Ventas (`Ventas`):** Muestra un listado detallado de todas las transacciones (pedidos pagados) realizadas. Permite exportar a **CSV** para análisis en Excel.

---

### **14. Atajos de Teclado**
| Atajo | Acción |
|-------|--------|
| `Ctrl + K` | Abrir barra de búsqueda de productos |
| `F11` | Pantalla completa del navegador |

---

### **15. Solución de Problemas (rápido)**
- **No carga el POS o tarda demasiado:**
    - Verifica la URL `http://192.168.1.35:3001`.
    - Abre `http://192.168.1.35:3001/api/ready?html=1` para confirmar que el sistema está "Listo".
- **La impresora no imprime:**
    - Prueba desde Configuración con los botones de impresión.
    - Revisa IP/puerto o cableado serial y vuelve a intentar.
- **El Gestor de Cuentas no muestra los productos:**
    - Asegúrate de haber presionado **"Guardar"** antes de abrir el Gestor. Solo los pedidos guardados en la base de datos aparecen en el Gestor.
- **No puedo eliminar una orden:**
    - Si el mensaje dice *"No se puede eliminar la orden porque ya está en proceso o lista"*, significa que la cocina ya empezó a preparar los platos. Debes marcar los ítems como "Entregado" en el KDS primero.
- **¿Necesitas una copia de seguridad ahora mismo?:**
    - En **Admin > Salud** pulsa **Forzar backup ahora**.
    - Para restaurar o hacer copias fuera del servidor (USB), sigue `BACKUP_RESTORE.md`.

---

### **16. Auto‑actualizaciones y avisos por correo**

El sistema está configurado para buscar y aplicar actualizaciones automáticamente una vez por semana.

- Cuándo: cada domingo a las 03:30 AM.
- Qué hace: descarga la última versión, instala dependencias, reconstruye y reinicia el servicio.
- Notificaciones por correo (a haciendallibre@gmail.com):
    - Éxito: asunto "POS auto-update: OK (commit …)".
    - Falla de build: asunto "POS auto-update: build failed" (incluye registro del proceso).

¿Qué hacer si no llega el correo o falla la actualización?
- Verifica que el sistema siga funcionando en `http://192.168.1.35:3001`.
- Revisa los registros en el servidor (se pueden consultar por SSH):
    - Cron del auto-update: `/opt/punto_de_venta/logs/cron.log`
    - Detalle del proceso: `/opt/punto_de_venta/logs/auto-update.log`
    - Arranque de la app (sin systemd): `/tmp/pos.log`
    - Correo (Postfix): `journalctl -u postfix -n 200` o `/var/log/mail.log`

Sugerencias
- Si el correo de "OK" no llega, pero el POS funciona, seguramente el problema es solo de salida de correo. Revisa la configuración de correo o la carpeta de spam.
- Si el build falla (recibirás un correo de error), el sistema queda en la versión anterior y continúa funcionando. Puedes actualizar manualmente siguiendo `COMO_ACTUALIZAR.md`.

---

> **AVISO LEGAL**  
> © 2026 Rafael Llibre. Todos los derechos reservados.  
> Este software y su documentación son propiedad exclusiva de Rafael Llibre (haciendallibre@gmail.com).  
> Prohibida su copia, redistribución, ingeniería inversa o uso comercial sin autorización escrita del propietario.  
> Protegido bajo las leyes de Propiedad Intelectual de la República Dominicana (Ley 65-00) y tratados internacionales aplicables.

Fin del Manual · Versión 2.0
