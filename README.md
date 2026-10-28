# OpsDeck — Executive Stream Deck, Productivity Cockpit & Vitrea Kanban Suite

**OpsDeck** es una plataforma multiplataforma (**Android, iOS, Tablet y PC Windows**) de control ejecutivo, botonera táctil configurable y gestión operativa en tiempo real.

## ✨ Características Principales

- **Botonera Táctil Adaptativa (`Icon-Only`)**:
  - Ajuste automático de densidad y grilla para **Móvil** y **Tablet** (horizontal y vertical).
  - Escaneo e importación de aplicaciones instaladas del PC (`host-agent/server.mjs`) con sus logos oficiales.
  - Física **Drag & Drop en vivo**: pesca cualquier aplicación para reubicarla con inclinación dinámica por velocidad (`Velocity Tilt`), slot punteado (`.vitrea-ph`), aterrizaje elástico (`Squash & Stretch`) y opción **Deshacer**.
- **Entorno Unificado por Páginas (Cero Ventanas Emergentes)**:
  - Navegación táctil continua en la ventana principal mediante indicadores superiores (`• • | • • •`) y **Cajón Inferior Integrado**:
    1. **Botonera de Aplicaciones del PC**
    2. **Executive Pulse & Métricas Animadas** (Anillos radiales, curva Spline con `<clipPath>` y mira interactiva, y barras verticales escalonadas)
    3. **Tablero Kanban Drag & Drop (Estilo Vitrea `#/releases`)** (`Urgentes`, `En Curso`, `Bloqueadas`, `Completadas`)
    4. **Touchpad Remoto & Firma Digital PNG**
- **Sistema de Diseño Neu-Glass + Liquid Specular**:
  - Paleta oceánica de 6 tonos (`#06141B`, `#11212D`, `#253745`, `#4A5C6A`, `#9BA8AB`, `#CCD0CF`).
  - Refracción especular seguida por puntero (`--gx`, `--gy`), borde cónico (`conic-gradient`) y onda táctil (`Glass Ripple`).

## 🚀 Ejecución Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar interfaz OpsDeck (Web / Simulador APK Android / Móvil / PC)
npm run dev

# 3. Iniciar Agente Host del PC (Puerto 8620 - Escaneo y lanzamiento de apps reales del PC)
npm run host

# 4. Compilar para producción
npm run build
```
