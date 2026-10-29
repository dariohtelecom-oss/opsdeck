# OpsDeck Enterprise v2.5 — Suite Nativa para Windows y Android

> **Arquitectura 100% Nativa**: Aplicación de escritorio en C# / .NET de alto rendimiento (sin navegadores ni wrappers web) + Aplicación móvil nativa en Java para Android.

---

## 🏛️ Componentes del Sistema

### 1. `OpsDeck.Desktop` (C# .NET Windows Nativo)
* **Centro de Mando Ejecutivo**: Renderizado gráfico directo con doble búfer (`DoubleBuffered GDI+`), tema Dark Slate (`#0B0F19`), barras animadas de métricas de telemetría (CPU, RAM, macros).
* **Botonera Dinámica (Stream Deck)**: Detección Win32 de ventana activa (`GetForegroundWindow`) que adapta en vivo los botones según el programa que uses en tu PC (Excel, Outlook, Teams, Terminal, VS Code).
* **Servidor Local Autónomo (`:8620`)**: Implementado en sockets C# puros con `HttpListener` y responder UDP (`:41234`) para descubrimiento automático en red Wi-Fi LAN con latencia de 2 a 4 ms.
* **Agente IA de Triaje**: Motor local para clasificar requerimientos de correo (Outlook 365) y tickets TI (ServiceNow, Jira, GLPI) e inyectarlos con SLA al tablero Kanban.
* **Panel Táctil & Firma**: Recepción de coordenadas del celular para mover el puntero del mouse del PC y firma digital vectorizada.

### 2. `OpsDeck.Mobile` (Android Nativo)
* Aplicación compilada directamente con el Android SDK (`javac` + `d8` + `aapt` + `zipalign` + `apksigner`).
* Firma criptográfica **APK Signature Scheme v2 y v3**.
* Vistas táctiles nativas con respuesta háptica (`Vibrator`).
* Selector de idioma en tiempo real (**`🇪🇸 ES` / `🇺🇸 EN`**).
* Auto-descubrimiento por paquetes UDP en la red local o conexión directa por cable USB.

### 3. `OpsDeck.Installer` (Instalador Oficial de Windows)
* Asistente de instalación estándar en Windows (`OpsDeck-Installer-v2.5.exe`).
* Permite seleccionar el directorio de destino.
* Crea accesos directos en el **Escritorio** y en el **Menú Inicio**.
* Registra la aplicación en **Configuración > Aplicaciones instaladas** de Windows con desinstalador.

---

## 🚀 Compilación Completa

Para compilar toda la suite desde cero en un solo comando:
```powershell
powershell -ExecutionPolicy Bypass -File .\build-all.ps1
```

---

## 📱 Enlace PC ↔ Celular

1. **Vía Wi-Fi LAN**:
   - Conecta tu celular a la misma red Wi-Fi que el PC.
   - En la aplicación móvil pulsa **Auto-Detectar PC por Wi-Fi** o escanea el código QR mostrado en la pestaña *5. Enlace Móvil*.
2. **Vía Cable USB (Latencia 0 ms)**:
   - Conecta tu teléfono con la depuración USB activa y ejecuta:
     ```powershell
     adb reverse tcp:8620 tcp:8620
     ```
