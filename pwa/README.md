# MezaStreaming - PWA Híbrida Inteligente

Aplicación Web Progresiva (PWA) nativa, reactiva e inteligente diseñada para operar de forma híbrida y adaptarse automáticamente según el rol del usuario autenticado: **Cliente** o **Vendedor / Administrador**.

---

## 🚀 Características Principales

### 1. Detección Adaptativa de Roles (Híbrida Inteligente)
- **Modo CLIENTE:**
  - **Mis Pantallas:** Tarjetas de suscripciones activas, copia en 1 toque (con vibración háptica) de usuario, clave, perfil y PIN. Contador de días de vencimiento y barra de progreso. Botón de *Solicitud de Código Hogar* y reporte de *Pantalla Ocupada / Intrusión*.
  - **Catálogo & Compra Express:** Planes disponibles por servicio (Netflix, Disney+, Max, etc.), resolución (4K UHD) y duración. Pasarela con Nequi, Daviplata y Bancolombia, copia de cuenta y subida de captura de comprobante de pago.
  - **Garantías & Soporte:** Estado de tickets en tiempo real (`PENDIENTE`, `EN_REVISION`, `RESUELTO`) y soluciones enviadas por soporte.
  - **Mi Perfil:** Visualización de WhatsApp como clave principal única, saldo en billetera y contador de strikes.
- **Modo VENDEDOR / ADMIN:**
  - **POS Móvil Express:** Punto de venta ágil de bolsillo. Búsqueda y selección de cliente existente por WhatsApp/Nombre o registro de nuevo cliente al vuelo (Nombre + WhatsApp PK obligatorios, Email opcional). Despacho automático inmediato de perfiles con entrega en pantalla.
  - **Inventario en Vivo:** Métricas en tiempo real de pantallas disponibles vs ocupadas y disponibilidad por plataforma.
  - **Ventas & Aprobaciones:** Feed de pedidos recientes, confirmación y aprobación rápida de pagos en 1 toque.
  - **Panel Staff & Red:** Medidor de latencia en milisegundos y estado de conexión.
- **Modo GUEST (No autenticado):**
  - Pantalla de inicio de sesión con selector de pestañas "Soy Cliente" vs "Vendedor / Staff", registro de clientes y acceso libre al catálogo de streaming.

### 2. Conectividad Dual: Red Local (LAN) e Internet (Web)
- **Detección Automática de API:** La PWA detecta automáticamente si está siendo abierta en `localhost`, en una IP de red local (ej. `http://192.168.1.129:3001/api`) o en un dominio web público.
- **Selector & Probador de Red:** Indicador en el encabezado con ping en milisegundos (`12ms`) y modal para cambiar o probar la dirección del servidor dinámicamente.

### 3. Experiencia PWA Nativa
- **Instalación en 1 toque:** Banner y soporte para instalación directa en iOS, Android, Windows y macOS.
- **Service Worker (`sw.js`):** Soporte offline, caché de recursos estáticos y resiliencia de red.
- **Diseño Luxury Dark:** Paleta de obsidian oscuro (`#070709`), acentos carmesí (`#e11d48`), glassmorphism y barra de navegación inferior nativa con soporte para `safe-area-inset`.

---

## 🛠️ Ejecución y Desarrollo

### Iniciar Servidor de Desarrollo PWA:
```bash
cd pwa
npm run dev
```
La PWA quedará accesible en:
- **Local:** `http://localhost:3002`
- **Red Local (LAN Wi-Fi para móviles):** `http://<IP_LOCAL>:3002` (ej. `http://192.168.1.129:3002`)

### Construcción para Producción:
```bash
cd pwa
npm run build
```
Genera los binarios optimizados en `pwa/dist/`.
