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
### Versión 3.0 — Actualizado Mayo 2026

#### **1. Introducción**
Este manual describe las operaciones diarias y la configuración del sistema de Punto de Venta (POS). El sistema está diseñado para gestionar pedidos, pagos, y la administración completa de los recursos del restaurante de manera eficiente.

En esta versión 3.0 se han incorporado mejoras significativas:
- **Dashboard de Administración** con estadísticas avanzadas, gráficos interactivos y filtro temporal.
- **Punto de Venta Moderno** con arquitectura modular y animaciones fluidas.
- **Gestor de Cuentas por Mesa** con arrastrar y soltar (Drag & Drop).
- **Descuentos interactivos** directamente desde el panel de cobro.
- **Módulo de Inventario** con control de insumos, stock mínimo y alertas.
- **Módulo de Proveedores** con directorio completo y datos de contacto.
- **Recetario** que vincula insumos del inventario a cada producto del menú.
- **Órdenes de Compra con Motor Predictivo JIT** para compras inteligentes basadas en consumo y caducidad.
- **Módulo de Nómina** con cálculos automáticos de TSS, ISR, horas extras, volantes de pago y prestaciones (Ley laboral dominicana).
- **Módulo de Contabilidad y DGII** con estados financieros, formatos fiscales (606, 607, 608, IT-1), NCF y cierres contables.
- **Módulo de Tesorería** con gestión de cuentas bancarias, cuentas por pagar (CXP) y cuentas por cobrar (CXC).
- **Delivery Dispatch** con tablero Kanban para pedidos de plataformas externas.
- **Integraciones** con UberEats y PedidosYa.
- **Configuración multi-país** con soporte para 16 monedas y 11 locales.

#### **2. Acceso al Sistema**
Para acceder al sistema, abre un navegador web (como Chrome o Firefox) en cualquier dispositivo conectado a la misma red WiFi que el servidor (tabletas, computadoras, etc.) y ve a la siguiente dirección:

**URL de Acceso Local (en el mismo servidor):** `http://localhost:3000`

**URL de Acceso en Red (desde otros dispositivos):** `http://<IP-del-servidor>:3000`

> **Nota:** Sustituye `<IP-del-servidor>` por la dirección IP real del equipo donde está instalado el sistema. Puedes consultarla ejecutando `hostname -I` en la terminal del servidor.

**Usuarios Iniciales:**
*   **Administrador:**
    *   **Email:** `admin@local`
    *   **Contraseña:** `admin1234`
*   **Cajero:**
    *   **Email:** `cajero@local`
    *   **Contraseña:** `cajero123`

**¡IMPORTANTE!** El primer paso después de iniciar sesión como administrador es ir a la sección de **Administración > Usuarios** y cambiar la contraseña por defecto.

#### **3. Roles de Usuario**
El sistema tiene cuatro roles principales:
*   **Administrador:** Tiene acceso total al sistema. Puede gestionar productos, categorías, mesas, usuarios, inventario, proveedores, nómina, contabilidad, tesorería, ver reportes, acceder al Dashboard y cambiar la configuración del sistema.
*   **Cajero:** Puede realizar todas las operaciones de venta, incluyendo tomar pedidos, procesar pagos y ver el historial de ventas. No tiene acceso a la configuración del sistema, módulos financieros ni a la gestión de usuarios.
*   **Mesero:** Puede tomar pedidos en las mesas y enviarlos a la cocina. Generalmente no procesa pagos.
*   **Cocinero:** Al iniciar sesión, es redirigido automáticamente a la Pantalla de Cocina (KDS). Solo tiene acceso a la vista de preparación de pedidos.

---

### **PÁGINA DE INICIO (HUB)**

#### **4. Panel Principal**
Al iniciar sesión, el sistema muestra una pantalla de bienvenida con:
- **Saludo contextual** (Buenos días / Buenas tardes / Buenas noches) con tu nombre.
- **Rol actual** y la fecha del día.
- **Cuadrícula de acceso rápido** a todos los módulos del sistema: POS, Ventas, KDS, Mesas, Delivery, Dashboard, Productos, Categorías, Recetario, Inventario, Proveedores, Compras, Usuarios, Nómina, Contabilidad, Tesorería, Reportes, Configuración, Integraciones, Salud del Sistema y Manual.
- Un botón destacado **"Ir al POS →"** para acceder directamente a la pantalla de ventas.

> **Nota:** Los módulos visibles dependen de tu rol. Los cajeros solo ven POS, Ventas y KDS. Los meseros ven POS y KDS. Los cocineros son redirigidos directamente al KDS.

---

### **OPERACIONES DIARIAS**

#### **5. Flujo de Venta Principal (POS)**
Esta es la pantalla principal para tomar órdenes. Se accede desde el menú **"POS"** o directamente en `http://localhost:3000/pos`.

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

#### **6. Gestor de Cuentas por Mesa (Drag & Drop)**
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

#### **7. Pantalla de Cocina (KDS)**
La Pantalla para el Sistema de Cocina (KDS, por sus siglas en inglés) se accede desde el menú **"KDS"** o desde el ícono del gorro de chef en la barra superior del POS, o directamente en `http://localhost:3000/kds`.

1.  Cuando un mesero o cajero envía un pedido a cocina, los ítems aparecerán automáticamente en esta pantalla.
2.  El personal de cocina puede pulsar sobre cada ítem para cambiar su estado:
    *   **Pendiente -> En Proceso:** Indica que han empezado a preparar el plato.
    *   **En Proceso -> Listo:** Indica que el plato está terminado y listo para ser recogido.
3.  Los meseros pueden ver el estado de los platos desde la pantalla del POS para saber cuándo recogerlos.

**Protección de Cocina:** Si un ítem ya está marcado como "En Proceso" o "Listo", el sistema impide que sea eliminado accidentalmente desde el POS, mostrando el mensaje: *"No se puede eliminar la orden porque ya está en proceso o lista."*

**Descuento automático de inventario:** Cuando un ítem marcado como "Requiere Cocina" en el Recetario se marca como **"Listo"**, el sistema descuenta automáticamente los insumos correspondientes del inventario según la receta configurada.

> **Nota para Cocineros:** Si tu cuenta tiene el rol "Cocinero", al iniciar sesión serás redirigido automáticamente a esta pantalla. No necesitas navegar por el menú.

---

#### **8. Ver y Gestionar Cuentas Abiertas**
1.  Abre la vista de cuentas abiertas presionando el ícono de recibos en la barra superior del POS, o navega a `http://localhost:3000/pos/abiertas`.
2.  Verás las órdenes abiertas, con auto‑refresco (conmutable) y botón **Refrescar**.
3.  Botón **"Fusionar duplicados"**: en caso de generar varias órdenes abiertas para la misma mesa/subcuenta, las combina en una sola.
4.  Puedes abrir una orden en el POS para continuar o cobrar.

---

### **ADMINISTRACIÓN Y CONFIGURACIÓN**
Estas secciones solo son visibles para el rol de **Administrador**.

#### **9. Centro de Mando (Dashboard)**
Accede al Dashboard desde **"Admin > Dashboard"** o directamente en `http://localhost:3000/admin`.

El Dashboard muestra analítica avanzada y métricas clave para tomar decisiones. Incluye un **selector de período** en la esquina superior derecha con las opciones:
- **Hoy (Tiempo Real)**
- **Últimos 7 días** (por defecto)
- **Últimos 30 días**
- **Últimos 3 Meses**

**Indicadores Clave (KPIs):**
| Indicador | Descripción |
|-----------|-------------|
| **Ingresos Totales** | Suma de todas las ventas en el período seleccionado |
| **Pedidos Completados** | Cantidad de pedidos procesados |
| **Ticket Promedio** | Valor promedio por transacción (Ingresos / Pedidos) |
| **Alertas de Inventario** | Cantidad de insumos con stock por debajo del mínimo configurado. Se muestra en rojo pulsante si hay alertas activas |

**Gráficos Interactivos:**
- **Tendencia de Ingresos (Gráfico de Área):** Muestra la evolución de ventas diarias con relleno degradado. Al pasar el cursor se muestra el detalle del día (nombre del día, mes, monto).
- **Mapa de Horas Pico (Gráfico de Barras):** Muestra el volumen de pedidos por hora del día, útil para planificar la dotación de personal (staffing).
- **Distribución de Ventas por Categoría (Gráfico Circular):** Muestra la participación de cada categoría del menú en los ingresos totales con leyenda de colores y montos.
- **Top 5 Productos Estrella:** Ranking de los 5 productos que generan más ingresos, con posición destacada (medalla dorada para el #1), cantidad de unidades vendidas y monto total.
- **Rendimiento por Empleado:** Tarjetas por cada usuario mostrando cuántas órdenes cobró y el monto total gestionado.

---

#### **10. Salud del Sistema (Admin > Salud)**
En **Administración > Salud** encontrarás:
- Estado de **Base de datos** (health y ready).
- **Backups**: cantidad, tamaño total y último archivo disponible.
- **Sistema**: hora del servidor, versión de la app y versión de Node.

Acciones disponibles:
- **Forzar backup ahora**: ejecuta una copia de seguridad en el servidor inmediatamente y muestra el resultado.
- Accesos rápidos a `/api/health` y `/api/ready` (útil para diagnóstico).

Notas sobre backups:
- Hay una copia automática diaria programada (03:00). Para detalles de restauración o copias externas (USB), consulta el manual técnico: `BACKUP_RESTORE.md`.

---

#### **11. Gestión del Menú**
*   **Productos (`Admin > Productos`):**
    *   Aquí puedes crear nuevos productos (botón "Crear Producto"), establecer su precio, asignarlos a una categoría y opcionalmente añadir una imagen.
    *   También puedes editar productos existentes o desactivarlos para que no aparezcan en el menú de venta.
    *   Puedes configurar **ingredientes** (para que el cliente pueda quitar) y **extras** (con su precio adicional).
    *   Cada producto tiene un campo de **SKU** (código de producto) opcional y un **costo unitario** que se puede sincronizar desde el Recetario.
    *   La casilla **"Requiere Cocina"** determina si el producto pasa por el KDS antes de ser entregado.
*   **Categorías (`Admin > Categorías`):**
    *   Crea y organiza las categorías de tu menú (ej: "Bebidas", "Entradas", "Platos Fuertes").
    *   Las categorías se muestran como pestañas en la pantalla del POS.

---

#### **12. Gestión del Restaurante**
*   **Mesas (`Admin > Mesas`):**
    *   Crea, edita o desactiva las mesas de tu restaurante.
    *   Las mesas son la base del **Gestor de Cuentas** (ver sección 6).
*   **Usuarios (`Admin > Usuarios`):**
    *   Crea nuevas cuentas para tus empleados (cajeros, meseros, cocineros).
    *   Asigna el rol correspondiente a cada uno (admin, cajero, mesero, cocinero).
    *   Puedes cambiar la contraseña de cualquier usuario.

---

### **CADENA DE SUMINISTRO**

#### **13. Gestión de Proveedores (Admin > Proveedores)**
En esta sección puedes gestionar el directorio completo de proveedores de tu negocio. Se accede desde **Admin > Proveedores** o `http://localhost:3000/admin/proveedores`.

**Funcionalidades:**
- **Barra de búsqueda** para filtrar proveedores por nombre.
- **Botón "Registrar Proveedor"** para agregar un nuevo proveedor.

**Datos de cada proveedor:**
| Campo | Descripción |
|-------|-------------|
| **Nombre (Empresa)** | Nombre comercial del proveedor (ej. "Sysco", "Distribuidora Nacional") |
| **Contacto Principal** | Nombre del vendedor o representante |
| **Teléfono** | Número de contacto directo |
| **Email** | Correo electrónico del proveedor |
| **Días de Entrega** | Tiempo promedio de entrega en días (usado por el Motor Predictivo JIT) |

**Vista de proveedores:**
Los proveedores se muestran como tarjetas visuales que incluyen:
- Icono del proveedor, nombre y datos de contacto.
- **Tiempo de entrega** en días.
- **Cantidad de insumos** vinculados a ese proveedor.
- Botones de **editar** y **eliminar** (visibles al pasar el cursor).

> **Importante:** Si eliminas un proveedor que tiene insumos vinculados, esos insumos quedarán "Sin proveedor" y no podrán ser incluidos en órdenes de compra automáticas.

---

#### **14. Gestión de Inventario (Admin > Inventario)**
El módulo de inventario permite controlar todos los insumos y materias primas del negocio. Se accede desde **Admin > Inventario** o `http://localhost:3000/admin/inventario`.

**A. Registrar un Insumo Nuevo:**
1.  Presiona el botón **"Registrar Insumo"**.
2.  Completa el formulario:
    | Campo | Descripción | Ejemplo |
    |-------|-------------|---------|
    | **Nombre** | Nombre del insumo | "Carne Molida" |
    | **Unidad de Medida** | Gramos, Kilogramos, Libras, Mililitros, Litros, Galones, Unidades o Porciones | "Kilogramos" |
    | **Costo por Unidad** | Precio de compra por unidad de medida | "250.00" |
    | **Stock Inicial** | Cantidad actual disponible (solo al crear) | "50" |
    | **Stock Mínimo (Alerta)** | Nivel mínimo antes de generar alerta | "10" |
    | **Proveedor** | Proveedor asociado (opcional) | "Distribuidora Nacional" |
    | **Vida Útil (Días)** | Días de caducidad del producto | "7" |
3.  Presiona **"Guardar Insumo"**.

**B. Ajustar Stock de un Insumo:**
1.  Localiza el insumo en la tabla (usa la barra de búsqueda si es necesario).
2.  Presiona el botón verde **"Ajustar"**.
3.  Se abre un modal que muestra el stock actual. Selecciona el tipo de ajuste:
    - **ENTRADA:** Suma unidades al stock (ej. compra recibida).
    - **SALIDA:** Resta unidades del stock (ej. merma, desperdicio).
    - **FIJAR:** Establece el stock a un valor exacto (ej. conteo físico).
4.  Ingresa la cantidad y opcionalmente un motivo (ej. "Compra a proveedor X", "Merma por caducidad").
5.  Presiona **"Confirmar [TIPO]"**.

**C. Alertas de Bajo Stock:**
- Cuando el stock de un insumo cae por debajo del **Stock Mínimo** configurado, aparece un ícono ámbar pulsante (⚠️) junto al nombre del insumo.
- El Dashboard también muestra el conteo total de alertas de inventario como un KPI.
- El Motor Predictivo JIT (sección 16) usa estos niveles para generar sugerencias de compra.

**D. Tabla de Inventario:**
La tabla muestra las siguientes columnas:
| Columna | Descripción |
|---------|-------------|
| **Insumo** | Nombre y unidad de medida |
| **Stock Actual** | Cantidad disponible (verde si OK, ámbar si bajo mínimo) |
| **Costo Und.** | Costo unitario por unidad de medida |
| **Proveedor / Vida Útil** | Proveedor asignado y días de caducidad |
| **Acciones** | Botones: Ajustar, Editar, Eliminar |

---

#### **15. Recetario (Admin > Recetario)**
El Recetario vincula los insumos del inventario con los productos del menú. Esto permite que el sistema descuente automáticamente los insumos cuando se vende un producto. Se accede desde **Admin > Recetario** o `http://localhost:3000/admin/recetario`.

**Diseño de Pantalla:**
La pantalla está dividida en dos paneles:
- **Panel Izquierdo:** Lista de todos los productos del menú con barra de búsqueda. Un ícono de gorro de chef (🍳) indica que requiere cocina; un ícono de caja (📦) indica producto directo.
- **Panel Derecho:** Detalle de la receta del producto seleccionado.

**A. Configurar la Receta de un Producto:**
1.  Selecciona un producto de la lista izquierda.
2.  **Elige la Estrategia de Descuento:**
    - **Requiere Cocina:** Los insumos se descontarán del inventario cuando el cocinero marque la orden como **LISTO** en el KDS. Ideal para platos preparados.
    - **Producto Directo:** Los insumos se descontarán **automáticamente** del inventario en el instante en que el cajero procese el pago. Ideal para bebidas embotelladas, postres empacados, etc.
3.  **Agregar ingredientes a la receta:**
    - Selecciona un insumo del dropdown (ej. "Carne Molida (Kilogramos)").
    - Ingresa la cantidad requerida por porción (ej. "0.25" para 250 gramos).
    - Presiona el botón **"+"** para agregar.
    - Repite para todos los ingredientes necesarios.
4.  Presiona **"Guardar Cambios"** en la esquina superior derecha.

**B. Panel de Costo Real de Preparación:**
El panel oscuro en la parte central muestra:
- **Costo Real de Preparación:** Suma del costo de todos los insumos de la receta (costo unitario × cantidad requerida).
- **Costo actual del producto:** El costo registrado en la ficha del producto.
- **Botón "Sincronizar Costo":** Actualiza el costo del producto con el costo calculado de la receta. Esto es útil para mantener los márgenes de ganancia actualizados.

**C. Receta Vacía:**
Si un producto no tiene receta configurada, el sistema muestra el mensaje: *"No hay insumos vinculados. Cuando se venda este producto, no se descontará nada del inventario físico."*

---

#### **16. Órdenes de Compra y Motor Predictivo JIT (Admin > Compras)**
Este módulo gestiona las compras a proveedores e incluye un motor de inteligencia logística que sugiere compras óptimas. Se accede desde **Admin > Compras** o `http://localhost:3000/admin/compras`.

**La pantalla tiene dos vistas (pestañas):**

**A. Historial de Órdenes:**
Muestra una tabla con todas las órdenes de compra registradas:
| Columna | Descripción |
|---------|-------------|
| **Orden #** | Código único (ej. OC-0001) |
| **Proveedor** | Nombre del proveedor |
| **Fecha** | Fecha de creación |
| **Total** | Monto total de la orden |
| **Estado** | BORRADOR, ENVIADA, RECIBIDA o CANCELADA |
| **Acciones** | Según el estado (ver flujo abajo) |

**Flujo de una Orden de Compra:**
1.  **BORRADOR** → Se puede marcar como **"Enviada"** o **"Cancelar"**.
2.  **ENVIADA** → Se puede **"Imprimir"** (genera un documento profesional en una ventana nueva) o **"Recibir Stock"** para registrar la mercancía recibida.
3.  **RECIBIDA** → Se puede **"Imprimir"** como archivo histórico.

**B. Recepción de Mercancía:**
1.  En una orden con estado "ENVIADA", presiona **"Recibir Stock"**.
2.  Se abre un modal que lista cada ítem pedido con su cantidad original.
3.  Edita las cantidades si recibiste menos de lo pedido (recepción parcial).
4.  Presiona **"Confirmar e Ingresar"**.
5.  El sistema actualiza automáticamente el stock en el módulo de Inventario y cambia el estado de la orden a "RECIBIDA".

**C. Motor Predictivo JIT (Just-In-Time):**
1.  Presiona la pestaña **"Motor Predictivo JIT"** (con ícono de cerebro 🧠).
2.  El motor analiza:
    - **Velocidad de consumo** de cada insumo basada en las ventas históricas.
    - **Stock actual** vs. **stock mínimo**.
    - **Fecha de caducidad** (vida útil) para evitar comprar más de lo que se puede usar antes de que expire.
    - **Días de entrega** de cada proveedor.
3.  Genera sugerencias agrupadas por proveedor con:
    - Nombre del insumo y stock actual.
    - Cantidad sugerida para comprar (editable).
    - Costo unitario (editable para cotizaciones).
    - Total estimado por proveedor.
    - **Razón de la sugerencia** con ícono de IA (🤖).
4.  Si el inventario está en niveles óptimos, muestra **"¡Inventario Perfecto!"**.
5.  Presiona **"Crear Borrador Oficial"** para convertir las sugerencias en una orden de compra formal.

> **Nota:** Si un insumo no tiene proveedor asignado, el sistema muestra un aviso indicando que debes asignar un proveedor en el módulo de Inventario antes de poder generar la orden.

---

### **PERSONAL Y FINANZAS**

#### **17. Nómina de Empleados (Admin > Nómina)**
El módulo de nómina permite gestionar a los empleados, calcular nómina quincenal, generar volantes de pago y calcular prestaciones laborales según la legislación dominicana. Se accede desde **Admin > Nómina** o `http://localhost:3000/admin/nomina`.

**La pantalla muestra:**
- **Badge de clasificación empresarial** (Microempresa ≤10, Pequeña 11-50, Mediana 51-150, Grande 151+).
- **KPIs:** Nómina Quincenal, Empleados Activos, Costo Patronal Estimado y Nómina Mensual.
- **Cinco pestañas de navegación:**

**A. Pestaña "Empleados" (👥):**
- Lista de todos los empleados con código, nombre, cédula, cargo, departamento y salario.
- Botón **"Nuevo Empleado"** para registrar personal.
- Al crear un empleado se solicitan los siguientes datos:
  - **Personales:** Nombre, apellido, cédula, fecha de nacimiento, sexo, dirección, teléfono, email.
  - **Laborales:** Cargo, departamento (Operaciones, Cocina, Servicio, Admin), tipo de contrato (Indefinido, Temporal, Prueba), fecha de ingreso.
  - **Compensación:** Salario base mensual, tipo de salario (Quincenal/Mensual), cuenta bancaria, banco.
  - **Seguridad Social:** Número de Seguridad Social (NSS), ID en la AFP.
- Botón de **"Ver"** (ojo) para ver el detalle completo del empleado con su historial de nóminas.

**B. Pestaña "Procesar Nómina" (⚡):**
1.  Selecciona el **período** (ej. "2026-05-Q2" = segunda quincena de mayo 2026).
2.  Selecciona el **tipo**: Ordinaria, Extraordinaria o Regalía.
3.  El sistema lista a todos los empleados activos con sus datos salariales.
4.  Para cada empleado puedes ajustar: horas extras (diurnas, nocturnas, feriado), comisiones, bonos y adelantos.
5.  Presiona **"Calcular Nómina"** y el sistema calcula automáticamente:
    - **Deducciones del empleado:** SFS (3.04%), AFP (2.87%), ISR según tabla de la DGII.
    - **Aportes patronales:** SFS (7.09%), AFP (7.10%), SRL (1.0%), INFOTEP (1.0%).
    - **Horas extras** con recargos: Diurna (35%), Nocturna (54%), Feriado (100%).
    - **Propinas** (Art. 228 CT — no es salario, se excluyen de la base imponible).
    - **Salario neto** y **total a recibir** (neto + propina).
6.  Cambia el estado de la nómina: BORRADOR → CALCULADA → APROBADA → PAGADA.

**C. Pestaña "Historial" (📋):**
- Muestra el historial de todas las nóminas procesadas con filtro por período.
- Botón para ver el **Volante de Pago** de cada nómina (documento imprimible que muestra todos los conceptos desglosados).

**D. Pestaña "Prestaciones" (🧮):**
- Calcula automáticamente las prestaciones laborales de cada empleado activo:
  - **Cesantía** según antigüedad.
  - **Vacaciones** (14 días de salario ordinario por año).
  - **Salario de Navidad** (regalía, 1/12 de lo devengado en el año).
  - **Pre-aviso** según antigüedad.

**E. Pestaña "Configuración" (⚙️):**
- Permite ajustar los parámetros legales de la nómina:
  - Tasas de SFS, AFP (empleado y patronal), SRL, INFOTEP.
  - Topes cotizables.
  - Escala de ISR con tramos y porcentajes.
  - Recargos de horas extras.
  - Jornada laboral (horas semanales y diarias).
  - Distribución de propinas por departamento (ej. Servicio 40%, Cocina 35%, Barra 15%, Auxiliar 10%).

---

#### **18. Contabilidad y DGII (Admin > Contabilidad)**
Este es el módulo financiero central del sistema. Gestiona el plan contable, los asientos, los estados financieros y el cumplimiento con la DGII (Dirección General de Impuestos Internos). Se accede desde **Admin > Contabilidad** o `http://localhost:3000/admin/contabilidad`.

**El módulo tiene seis pestañas:**

**A. Pestaña "Panel" (Dashboard Contable):**
- **KPIs Financieros:** Ingresos del Mes, Gastos del Mes, Utilidad Neta (con margen %), Alertas Activas (CXP vencidas, CXC vencidas, NCF agotándose).
- **Gráfico de Flujo de Caja:** Compara ingresos vs. gastos por mes.
- **Resumen CXP/CXC:** Total de cuentas por pagar y por cobrar con enlaces a Tesorería.
- **Actividad Reciente:** Últimos asientos contables registrados (número, fecha, origen, descripción, monto).
- **Accesos Rápidos:** Catálogo de Cuentas, Libro Diario, Tesorería.

**B. Pestaña "Diagnóstico":**
- Detecta automáticamente ventas del POS que no tienen:
  - NCF (Número de Comprobante Fiscal) asignado.
  - Asiento contable generado.
  - Registro fiscal creado.
- **Botón "Autofix":** Corrige automáticamente todas las inconsistencias — asigna NCF, genera asientos contables y crea registros fiscales para ventas descuadradas.

**C. Pestaña "Reportes" (Estados Financieros):**
Genera tres tipos de reportes financieros con filtro de fechas:
1.  **Estado de Resultados (P&L):** Ingresos, Costos de Ventas, Utilidad Bruta, Gastos Operativos, Utilidad Neta — con comparativa vs. período anterior (variación % y monto).
2.  **Balance General (Saldos):** Activos, Pasivos, Patrimonio a una fecha determinada.
3.  **Balanza de Comprobación:** Lista de todas las cuentas con sumas de débito/crédito y saldos.

Cada reporte se puede:
- **Exportar a CSV/Excel** (botón de descarga).
- **Imprimir / Guardar como PDF** (botón de impresora).

**D. Pestaña "DGII" (Centro Fiscal):**
Genera los formatos requeridos por la DGII filtrados por período (mes):
| Formato | Descripción |
|---------|-------------|
| **606** | Compras y Gastos — registro de todas las compras con NCF del proveedor |
| **607** | Ventas — registro de todas las ventas con NCF emitido |
| **608** | Comprobantes Anulados — registro de NCF anulados |
| **IT-1** | Resumen de operaciones — consolidado para declaración |

- Cada formato muestra la cantidad de registros y permite descargarlo en formato **TXT** (el formato requerido por la DGII).
- **Registrar Anulación (608):** Botón para anular un NCF con número de comprobante, fecha, tipo de anulación y comentario.

**E. Pestaña "NCF" (Comprobantes Fiscales):**
Gestiona las secuencias de Números de Comprobantes Fiscales:
- **Tipos soportados:** B01 (Facturas de Crédito Fiscal), B02 (Consumidor Final), B14 (Regímenes Especiales), B15 (Gubernamental).
- Cada secuencia muestra: tipo, rango (inicio-fin), comprobante actual, fecha de vencimiento, estado (activa/inactiva).
- **Crear nueva secuencia:** Tipo, rango de inicio/fin, fecha de vencimiento, descripción.
- **Activar/Desactivar** secuencias existentes.

**F. Pestaña "Cierres" (Períodos Contables):**
- **Cerrar un período:** Selecciona un período (ej. "2026-05") y presiona cerrar. El sistema genera automáticamente el asiento de liquidación de cuentas nominales (ingresos, costos y gastos se trasladan a resultados acumulados).
- **Períodos cerrados:** Historial de períodos cerrados con fecha y usuario.
- **Log de Auditoría:** Registro de todas las acciones contables (crear, anular, modificar, cerrar) con fecha, usuario e IP.

> **Importante:** Una vez cerrado un período, no se pueden crear ni modificar asientos contables en ese período.

**Submódulos accesibles desde los accesos rápidos:**
- **Catálogo de Cuentas** (`Admin > Contabilidad > Cuentas`): Plan contable completo con estructura jerárquica (Activo, Pasivo, Patrimonio, Ingreso, Costo, Gasto). Crear, editar y organizar cuentas contables.
- **Libro Diario** (`Admin > Contabilidad > Asientos`): Lista de todos los asientos contables con sus apuntes (débito/crédito). Crear asientos manuales, postear borradores, anular asientos.

---

#### **19. Gestión de Tesorería (Admin > Tesorería)**
El módulo de tesorería gestiona el flujo de efectivo del negocio: cuentas bancarias, deudas y créditos. Se accede desde **Admin > Tesorería** o `http://localhost:3000/admin/tesoreria`.

**El módulo tiene tres pestañas:**

**A. Pestaña "Bancos y Caja":**

*Resumen:*
- **Saldo Total Bancos:** Suma de todas las cuentas.
- **Cuentas Activas:** Número de cuentas bancarias habilitadas.
- **Últimos Movimientos:** Cantidad de transacciones recientes.
- **Distribución de Fondos:** Gráfico circular (PieChart) mostrando la proporción de fondos en cada cuenta.

*Gestión de Cuentas Bancarias:*
1.  Presiona el botón **"+"** para agregar una nueva cuenta bancaria.
2.  Completa: Nombre descriptivo, Banco, Tipo de cuenta (Corriente/Ahorro), Número de cuenta, Cuenta contable vinculada.
3.  Cada cuenta muestra un **mini-gráfico sparkline** con la tendencia del saldo.
4.  Se puede **archivar** (desactivar) o **reactivar** una cuenta.

*Registrar Transacciones:*
1.  Selecciona una cuenta bancaria de la lista izquierda.
2.  Presiona **"Registrar Transacción"**.
3.  Selecciona el tipo:
    - **Depósito:** Ingreso de efectivo.
    - **Retiro:** Salida de efectivo.
    - **Transferencia:** Movimiento entre cuentas (selecciona cuenta destino).
4.  Ingresa monto, descripción y referencia (opcional).
5.  El historial de movimientos se muestra en la tabla derecha con colores: verde para entradas, rojo para salidas.

**B. Pestaña "Cuentas por Pagar (CXP)":**

*Resumen:*
- Total Pendiente CXP, Pagado Este Mes, Deudas Vencidas.

*Registrar una Deuda:*
1.  Presiona **"+ Nueva Deuda"** (o usa el atajo `Ctrl+N`).
2.  Completa:
    | Campo | Descripción |
    |-------|-------------|
    | **Proveedor** | Selecciona del directorio |
    | **Categoría** | Inventario, Alquiler, Servicios, Nómina, Impuestos, Otros |
    | **Descripción** | Detalle de la factura |
    | **NCF** | Número de comprobante fiscal (si aplica) |
    | **Monto** | Total de la deuda |
    | **Fecha de Vencimiento** | Límite de pago |
    | **Factura Escaneada** | Adjuntar imagen de la factura (digitalización) |
3.  Presiona **"Guardar"**.

*Registrar un Pago:*
1.  Presiona **"Pagar"** en la fila de la deuda.
2.  Ingresa monto a pagar (puede ser parcial), método de pago (Efectivo, Transferencia, Cheque) y referencia.
3.  El estado cambia automáticamente:
    - **PENDIENTE** → si no se ha pagado nada.
    - **PARCIAL** → si se ha pagado parte del monto.
    - **PAGADO** → cuando el monto pagado iguala al total.

*Filtros:*
- Por **proveedor** y por **estado** (Todos, Pendiente, Parcial, Pagado).

**C. Pestaña "Cuentas por Cobrar (CXC)":**

*Resumen:*
- Total Pendiente CXC, Cobrado Este Mes.

*Registrar un Crédito a Cliente:*
1.  Presiona **"+ Nuevo Crédito"** (o `Ctrl+N`).
2.  Completa: Nombre del cliente, RNC (opcional), Teléfono, Descripción, NCF, Monto, Fecha de vencimiento.
3.  Presiona **"Guardar"**.

*Registrar un Cobro:*
1.  Presiona **"Cobrar"** en la fila del crédito.
2.  Ingresa monto cobrado, método de pago y referencia.
3.  El estado cambia automáticamente (PENDIENTE → PARCIAL → COBRADO).

---

#### **20. Delivery Dispatch**
El panel de Delivery permite gestionar visualmente pedidos de plataformas de entrega externas. Se accede desde **Delivery** en el menú o `http://localhost:3000/delivery`.

**Diseño de Pantalla:**
- **Barra superior:** Logo "DELIVERY DISPATCH", indicadores de conexión por plataforma (UberEats, PedidosYa) y botón "Volver al POS".
- **Tablero Kanban:** Los pedidos se organizan en columnas por estado de preparación, permitiendo ver de un vistazo el flujo de trabajo.

> **Nota:** Este módulo trabaja en conjunto con las Integraciones (sección 21) para recibir pedidos de plataformas externas automáticamente.

---

#### **21. Integraciones con Plataformas (Admin > Integraciones)**
Este módulo permite mapear los productos del menú interno con los IDs de productos en plataformas de delivery externas. Se accede desde **Admin > Integraciones** o `http://localhost:3000/admin/integraciones`.

**Tabla de Mapeo:**
| Columna | Descripción |
|---------|-------------|
| **Producto Interno** | Nombre del producto en tu POS y su categoría |
| **ID en UberEats** | El ID del artículo en UberEats (ej. "ub-123") |
| **ID en PedidosYa** | El ID del artículo en PedidosYa (ej. "py-456") |

**Cómo mapear un producto:**
1.  Localiza el producto en la tabla.
2.  Escribe el ID externo correspondiente en el campo de la plataforma.
3.  Presiona el botón de **guardar** (ícono de disco 💾) junto al campo.
4.  Un ícono de check verde (✓) confirma que se guardó correctamente.

> Este mapeo permite que cuando llegue un pedido de una plataforma externa, el sistema identifique automáticamente los productos internos correspondientes.

---

#### **22. Configuración del Sistema**
Ve a la sección **"Configuración"** en el menú principal o `http://localhost:3000/configuracion`.

**Datos del Negocio:**
| Campo | Descripción |
|-------|-------------|
| **Nombre del negocio** | Nombre que aparece en tickets y reportes |
| **Dirección** | Dirección física del establecimiento |
| **RNC** | Registro Nacional del Contribuyente (para facturas fiscales) |
| **Teléfono** | Número de contacto del negocio |
| **Logo** | Imagen del negocio. Se puede subir un archivo local o indicar una URL. Aparece en tickets y documentos |

**Moneda y Formato Regional:**
- **Moneda:** Soporta 16 monedas preconfiguradas (DOP, USD, EUR, MXN, COP, ARS, CLP, PEN, PYG, UYU, BOB, CRC, GTQ, HNL, NIO, PAB) o personalizada.
- **Locale:** Soporta 11 configuraciones regionales (República Dominicana, México, España, Argentina, Chile, Colombia, Perú, Uruguay, Paraguay, Venezuela, EE.UU.) o personalizado.
- **Vista previa en tiempo real:** Al cambiar la moneda/locale, se muestra una vista previa del formato (ej. "RD$ 123.45").

**Impuestos:**
- **ITBIS (%):** Porcentaje de impuesto sobre la venta (ej. 18 para 18%).
- **Propina (%):** Porcentaje de propina legal (ej. 10 para 10%).

**Impresoras:**
| Campo | Descripción |
|-------|-------------|
| **IP (Wi-Fi)** | Dirección IP de la impresora de red (ej. 192.168.1.50) |
| **Puerto** | Puerto de la impresora (por defecto: 9100) |
| **Baudios (Serial)** | Velocidad para impresoras seriales (9600, 19200, 38400, 57600, 115200) |

**Opciones de Impresión Automática:**
- ☐ **Imprimir ticket de cocina al crear:** Envía automáticamente un ticket a la impresora cuando se guarda un pedido.
- ☐ **Imprimir cuando todo esté listo:** Envía un ticket cuando todos los ítems de la orden están marcados como "Listo" en el KDS.

**Modo Táctil:**
- ☐ **Modo táctil (botones grandes):** Agranda los botones de la interfaz para facilitar el uso en tablets y pantallas táctiles.

**Pie del Ticket:**
- Campo de texto libre para personalizar el mensaje al final de cada ticket impreso (ej. "¡Gracias por su compra!").

**Botones de Acción:**
- **Guardar:** Guarda todos los cambios realizados.
- **Abrir POS:** Navega directamente al punto de venta.
- **Pantalla completa:** Activa/desactiva el modo pantalla completa del navegador.
- **Probar Serial / Probar Red:** Envía un ticket de prueba para verificar que la impresora está funcionando correctamente.

---

#### **23. Reportes**
*   **Reportes (`Reportes`):** Permite ver un resumen de ventas, productos más vendidos y otros datos clave, filtrados por rango de fechas. Se accede en `http://localhost:3000/reportes`.
*   **Ventas (`Ventas`):** Muestra un listado detallado de todas las transacciones (pedidos pagados) realizadas. Permite exportar a **CSV** para análisis en Excel. Se accede en `http://localhost:3000/ventas`.

---

### **24. Atajos de Teclado**
| Atajo | Acción | Dónde funciona |
|-------|--------|----------------|
| `Ctrl + K` | Abrir barra de búsqueda de productos | POS |
| `Ctrl + N` | Crear nuevo registro rápidamente | Tesorería (Bancos, CXP, CXC) |
| `F11` | Pantalla completa del navegador | En cualquier parte |

---

### **25. Solución de Problemas (rápido)**
- **No carga el POS o tarda demasiado:**
    - Si estás en el servidor: verifica la URL `http://localhost:3000`.
    - Si estás en otro dispositivo: verifica la URL `http://<IP-del-servidor>:3000`.
    - Abre `http://<IP-del-servidor>:3000/api/ready?html=1` para confirmar que el sistema está "Listo".
- **La impresora no imprime:**
    - Prueba desde **Configuración** con los botones de impresión de prueba (Serial / Red).
    - Revisa IP/puerto o cableado serial y vuelve a intentar.
- **El Gestor de Cuentas no muestra los productos:**
    - Asegúrate de haber presionado **"Guardar"** antes de abrir el Gestor. Solo los pedidos guardados en la base de datos aparecen en el Gestor.
- **No puedo eliminar una orden:**
    - Si el mensaje dice *"No se puede eliminar la orden porque ya está en proceso o lista"*, significa que la cocina ya empezó a preparar los platos. Debes marcar los ítems como "Entregado" en el KDS primero.
- **El inventario no se descuenta automáticamente:**
    - Verifica que el producto tenga una **receta configurada** en el Recetario (sección 15).
    - Verifica la **estrategia de descuento**: si es "Requiere Cocina", el descuento ocurre cuando el cocinero marca "Listo" en el KDS. Si es "Producto Directo", ocurre al cobrar.
- **El Motor JIT dice "Asigna un proveedor":**
    - Ve a **Admin > Inventario**, edita el insumo y selecciona un proveedor del dropdown.
- **Error "No autorizado" en Configuración o módulos de Admin:**
    - Verifica que tu cuenta tenga el rol de **Administrador**. Solo los administradores pueden acceder a estos módulos.
    - Intenta cerrar sesión y volver a iniciar sesión.
- **¿Necesitas una copia de seguridad ahora mismo?:**
    - En **Admin > Salud** pulsa **Forzar backup ahora**.
    - Para restaurar o hacer copias fuera del servidor (USB), sigue `BACKUP_RESTORE.md`.

---

### **26. Auto‑actualizaciones y avisos por correo**

El sistema está configurado para buscar y aplicar actualizaciones automáticamente una vez por semana.

- Cuándo: cada domingo a las 03:30 AM.
- Qué hace: descarga la última versión, instala dependencias, reconstruye y reinicia el servicio.
- Notificaciones por correo (a haciendallibre@gmail.com):
    - Éxito: asunto "POS auto-update: OK (commit …)".
    - Falla de build: asunto "POS auto-update: build failed" (incluye registro del proceso).

¿Qué hacer si no llega el correo o falla la actualización?
- Verifica que el sistema siga funcionando en `http://<IP-del-servidor>:3000`.
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

Fin del Manual · Versión 3.0
