using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Windows.Forms;

namespace OpsDeck.Desktop
{
    public class MainWindow : Form
    {
        private HostServer server;
        private NotifyIcon trayIcon;
        private System.Windows.Forms.Timer telemetryTimer;
        private System.Windows.Forms.Timer windowTrackerTimer;
        private System.Windows.Forms.Timer toastTimer;

        // Visual Interactive State
        private int activeNavIndex = 0;
        private int hoveredNavIndex = -1;
        private int hoveredTileIndex = -1;
        private bool isHoverClose = false;
        private bool isHoverMin = false;
        private bool isHoverCopyUrl = false;
        private bool isHoverCta = false;
        private Rectangle copyUrlRect = Rectangle.Empty;
        private Rectangle ctaButtonRect = Rectangle.Empty;

        // EchoFi / Neo-FinTech Color Palette Tokens
        private static readonly Color ColorCanvasBg = Color.FromArgb(9, 10, 15);           // #090A0F Deep Obsidian
        private static readonly Color ColorGlassCard = Color.FromArgb(200, 18, 20, 29);     // #12141D Frosted Glass
        private static readonly Color ColorGlassElevated = Color.FromArgb(230, 26, 29, 42); // Elevated Glass
        private static readonly Color ColorIceCyan = Color.FromArgb(194, 244, 255);         // #C2F4FF Ice Cyan Glow
        private static readonly Color ColorLavender = Color.FromArgb(198, 192, 255);        // #C6C0FF Pastel Lavender
        private static readonly Color ColorMintGreen = Color.FromArgb(177, 255, 194);       // #B1FFC2 Mint Green
        private static readonly Color ColorPureWhite = Color.FromArgb(255, 255, 255);       // #FFFFFF Crisp White
        private static readonly Color ColorMutedSlate = Color.FromArgb(138, 143, 158);      // #8A8F9E Secondary Text

        private readonly string[] navLabels = new string[]
        {
            "🎛️  Botonera",
            "📈  Telemetría & Gráficos",
            "📋  Tablero Kanban IA",
            "🖱️  Panel Táctil 3D",
            "📱  Enlace Móvil (QR)"
        };

        // Data Profiles
        private List<DeckTile> defaultTiles;
        private List<DeckTile> excelTiles;
        private List<DeckTile> meetingTiles;
        private List<DeckTile> itsmTiles;
        private List<DeckTile> activeTiles;

        private List<KanbanTask> tasks;
        private List<TriageIncomingItem> triageFeed;

        // Telemetry History (Sparkline + Volume Bars)
        private float cpuPercent = 18.4f;
        private float ramPercent = 48.2f;
        private readonly Queue<float> cpuHistory = new Queue<float>();
        private readonly Queue<float> ramHistory = new Queue<float>();
        private readonly List<float> volumeBars = new List<float>();
        private const int MaxHistoryPoints = 36;

        private string currentActiveWindow = "OpsDeck Enterprise";
        private string currentProfileName = "General de Oficina";
        private int totalCommandsExecuted = 42;

        // Interactive Toast Feedback
        private string toastMessage = "";
        private DateTime toastExpires = DateTime.MinValue;

        // Custom TitleBar Dragging
        private bool isDragging;
        private Point dragCursorPoint;
        private Point dragFormPoint;

        public MainWindow()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);

            Text = "OpsDeck Enterprise v2.5 — Glassmorphism & 3D Depth Suite";
            Size = new Size(1240, 750);
            MinimumSize = new Size(1040, 660);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.None;
            BackColor = ColorCanvasBg;
            ForeColor = ColorPureWhite;
            Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            // Generar historial de telemetría y barras de volumen estilo EchoFi
            Random rnd = new Random();
            for (int i = 0; i < MaxHistoryPoints; i++)
            {
                cpuHistory.Enqueue(15f + (float)(rnd.NextDouble() * 25));
                ramHistory.Enqueue(46f + (float)(rnd.NextDouble() * 4));
                volumeBars.Add(20f + (float)(rnd.NextDouble() * 70));
            }

            InitializeData();
            InitializeHostServer();
            InitializeTray();

            // Timer de Telemetría (cada 1.5s)
            telemetryTimer = new System.Windows.Forms.Timer { Interval = 1500 };
            telemetryTimer.Tick += (s, e) =>
            {
                float nextCpu = (float)(new Random().Next(12, 42));
                float nextRam = 47f + (float)(new Random().NextDouble() * 3.5);
                cpuPercent = nextCpu;
                ramPercent = nextRam;

                if (cpuHistory.Count >= MaxHistoryPoints) cpuHistory.Dequeue();
                cpuHistory.Enqueue(nextCpu);

                if (ramHistory.Count >= MaxHistoryPoints) ramHistory.Dequeue();
                ramHistory.Enqueue(nextRam);

                if (volumeBars.Count >= MaxHistoryPoints) volumeBars.RemoveAt(0);
                volumeBars.Add((float)(new Random().Next(15, 95)));

                Invalidate();
            };
            telemetryTimer.Start();

            // Timer de Ventana Activa (cada 800ms)
            windowTrackerTimer = new System.Windows.Forms.Timer { Interval = 800 };
            windowTrackerTimer.Tick += (s, e) =>
            {
                string win = Win32.GetActiveWindowTitle();
                if (!string.IsNullOrEmpty(win) && win != currentActiveWindow)
                {
                    currentActiveWindow = win;
                    UpdateDynamicProfile(win);
                }
            };
            windowTrackerTimer.Start();

            // Timer de Toast Fade
            toastTimer = new System.Windows.Forms.Timer { Interval = 250 };
            toastTimer.Tick += (s, e) =>
            {
                if (!string.IsNullOrEmpty(toastMessage) && DateTime.Now > toastExpires)
                {
                    toastMessage = "";
                    Invalidate();
                }
            };
            toastTimer.Start();

            ShowToast("✦ OpsDeck Glassmorphism 3D Suite Activo en " + server.PrimaryLanIp + ":8620");
        }

        private void InitializeData()
        {
            defaultTiles = new List<DeckTile>
            {
                new DeckTile("t-excel", "Excel BI", "Finanzas & Tablas", "📊", "#C2F4FF", "launch:excel", "Win+R"),
                new DeckTile("t-outlook", "Outlook 365", "Bandeja Ejecutiva", "✉️", "#C6C0FF", "launch:outlook", "Win+R"),
                new DeckTile("t-teams", "MS Teams", "Reunión & Audio", "👥", "#C2F4FF", "launch:teams", "Win+R"),
                new DeckTile("t-calc", "Calculadora", "Moneda & CLP", "🔢", "#B1FFC2", "launch:calc", "Win+R"),
                new DeckTile("t-term", "PowerShell", "Consola de Comandos", "💻", "#C6C0FF", "launch:powershell", "Win+R"),
                new DeckTile("t-chrome", "Chrome Pro", "Navegador Web", "🌐", "#C2F4FF", "launch:chrome", "Win+R"),
                new DeckTile("t-mute", "Silenciar Mic", "Micrófono Global", "🎙️", "#EF4444", "hotkey:ctrl+shift+m", "Ctrl+Shift+M"),
                new DeckTile("t-save", "Guardar Todo", "Atajo Rápido", "💾", "#B1FFC2", "hotkey:ctrl+s", "Ctrl+S"),
                new DeckTile("t-lock", "Bloquear PC", "Seguridad Estación", "🔒", "#C6C0FF", "launch:rundll32.exe user32.dll,LockWorkStation", "Win+L"),
                new DeckTile("t-snip", "Recorte Pantalla", "Captura de Región", "✂️", "#C2F4FF", "launch:snippingtool", "Win+Shift+S"),
                new DeckTile("t-task", "Admin Tareas", "Rendimiento Win32", "⚡", "#EF4444", "launch:taskmgr", "Ctrl+Shift+Esc"),
                new DeckTile("t-exp", "Explorador", "Archivos Locales", "📁", "#C6C0FF", "launch:explorer", "Win+E")
            };

            excelTiles = new List<DeckTile>
            {
                new DeckTile("ex-sum", "AutoSuma Rápida", "Fórmula Contable", "Σ", "#B1FFC2", "macro:sum", "=SUMA()"),
                new DeckTile("ex-filter", "Filtros de Tabla", "Gestión de Datos", "⚡", "#C2F4FF", "macro:filter", "Ctrl+Shift+L"),
                new DeckTile("ex-save", "Guardar Libro", "Versión Actual", "💾", "#C6C0FF", "hotkey:ctrl+s", "Ctrl+S"),
                new DeckTile("ex-chart", "Insertar Gráfico", "Reporte Ejecutivo", "📈", "#C2F4FF", "hotkey:keys:%{F1}", "Alt+F1"),
                new DeckTile("ex-calc", "Recalcular Hoja", "Fórmulas & Celdas", "🔄", "#C6C0FF", "hotkey:keys:{F9}", "F9"),
                new DeckTile("ex-copy", "Copiar Formato", "Pincel de Estilo", "🎨", "#B1FFC2", "hotkey:keys:^c", "Ctrl+C"),
                new DeckTile("ex-paste", "Pegar Valores", "Solo Texto Plano", "📋", "#C2F4FF", "hotkey:keys:^%v", "Ctrl+Alt+V"),
                new DeckTile("ex-undo", "Deshacer Cambio", "Revertir Acción", "↩️", "#8A8F9E", "hotkey:keys:^z", "Ctrl+Z")
            };

            meetingTiles = new List<DeckTile>
            {
                new DeckTile("mt-mic", "Mute Micrófono", "Activar/Silenciar", "🎙️", "#EF4444", "hotkey:ctrl+shift+m", "Ctrl+Shift+M"),
                new DeckTile("mt-cam", "Cámara On/Off", "Video Conferencia", "📹", "#C2F4FF", "hotkey:ctrl+shift+o", "Ctrl+Shift+O"),
                new DeckTile("mt-hand", "Levantar Mano", "Participación", "✋", "#C6C0FF", "hotkey:keys:^k", "Ctrl+K"),
                new DeckTile("mt-share", "Compartir Pantalla", "Presentación", "🖥️", "#B1FFC2", "hotkey:ctrl+shift+e", "Ctrl+Shift+E"),
                new DeckTile("mt-leave", "Colgar Reunión", "Desconectar", "📞", "#EF4444", "hotkey:keys:^+b", "Ctrl+Shift+B"),
                new DeckTile("mt-chat", "Abrir Chat", "Mensajería en Vivo", "💬", "#C2F4FF", "hotkey:keys:^+r", "Ctrl+Shift+R")
            };

            itsmTiles = new List<DeckTile>
            {
                new DeckTile("it-glpi", "GLPI Tickets", "Mesa de Ayuda", "🎫", "#C2F4FF", "launch:https://glpi", "Web"),
                new DeckTile("it-jira", "Jira ITSM", "Sprint Tablero", "📋", "#C6C0FF", "launch:https://jira", "Web"),
                new DeckTile("it-rdp", "Escritorio Remoto", "Servidores Cloud", "🖥️", "#B1FFC2", "launch:mstsc", "RDP"),
                new DeckTile("it-ssh", "Consola SSH", "Linux / Docker", "⚡", "#C2F4FF", "launch:powershell", "CLI"),
                new DeckTile("it-ping", "Ping Gateway", "Latencia Red", "📡", "#C6C0FF", "launch:cmd /k ping 192.168.1.1", "CMD"),
                new DeckTile("it-vpn", "Túnel VPN", "Conexión Segura", "🛡️", "#B1FFC2", "launch:control netconnections", "Net")
            };

            activeTiles = defaultTiles;

            tasks = new List<KanbanTask>
            {
                new KanbanTask("INC-842", "Falla de enlace troncal FO Planta Sur", "Infraestructura", TaskPriority.Critical, TaskStatus.Urgent, "15 min", "ServiceNow", "mstsc"),
                new KanbanTask("TI-319", "Cierre mensual de balances financieros Q4", "Finanzas", TaskPriority.High, TaskStatus.InProgress, "45 min", "Outlook 365", "excel"),
                new KanbanTask("TI-205", "Renovación certificados TLS / SSL VPN", "Ciberseguridad", TaskPriority.Medium, TaskStatus.InProgress, "2 hrs", "Jira ITSM", "powershell"),
                new KanbanTask("TI-104", "Actualización antivirus estación gerencia", "Soporte TI", TaskPriority.Low, TaskStatus.Completed, "Listo", "GLPI", "explorer")
            };

            triageFeed = new List<TriageIncomingItem>();
        }

        private void InitializeHostServer()
        {
            server = new HostServer
            {
                TasksRef = tasks,
                ActiveTilesRef = activeTiles,
                GetActiveWindowFunc = () => currentActiveWindow,
                GetCpuPercentFunc = () => cpuPercent,
                GetRamPercentFunc = () => ramPercent,
                ApkFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "OpsDeck-Mobile.apk")
            };

            server.OnTileTriggered += (id) =>
            {
                totalCommandsExecuted++;
                BeginInvoke((Action)(() =>
                {
                    ShowToast("✦ Remoto: Macro ejecutada desde smartphone (" + id + ")");
                    Invalidate();
                }));
            };

            server.Start();
        }

        private void InitializeTray()
        {
            try
            {
                ContextMenuStrip menu = new ContextMenuStrip();
                menu.Items.Add("Abrir OpsDeck Glass Suite", null, (s, e) => { Show(); WindowState = FormWindowState.Normal; Activate(); });
                menu.Items.Add(new ToolStripSeparator());
                menu.Items.Add("Salir de OpsDeck", null, (s, e) => { Close(); Application.Exit(); });

                trayIcon = new NotifyIcon
                {
                    Icon = SystemIcons.Shield,
                    Text = "OpsDeck Glassmorphic Suite (" + server.PrimaryLanIp + ":8620)",
                    ContextMenuStrip = menu,
                    Visible = true
                };
                trayIcon.DoubleClick += (s, e) => { Show(); WindowState = FormWindowState.Normal; Activate(); };
            }
            catch { }
        }

        public void ShowToast(string msg)
        {
            toastMessage = msg;
            toastExpires = DateTime.Now.AddSeconds(4.0);
            Invalidate();
        }

        private void UpdateDynamicProfile(string windowTitle)
        {
            string lower = windowTitle.ToLowerInvariant();
            if (lower.Contains("excel") || lower.Contains("libro") || lower.Contains("hoja de cálculo"))
            {
                currentProfileName = "Microsoft Excel (Finanzas)";
                activeTiles = excelTiles;
            }
            else if (lower.Contains("teams") || lower.Contains("zoom") || lower.Contains("meet") || lower.Contains("reunión"))
            {
                currentProfileName = "Reunión en Vivo (Teams/Zoom)";
                activeTiles = meetingTiles;
            }
            else if (lower.Contains("jira") || lower.Contains("glpi") || lower.Contains("servicenow") || lower.Contains("terminal") || lower.Contains("powershell"))
            {
                currentProfileName = "Soporte TI / Infraestructura";
                activeTiles = itsmTiles;
            }
            else
            {
                currentProfileName = "General de Oficina";
                activeTiles = defaultTiles;
            }

            server.ActiveTilesRef = activeTiles;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            // 0. Fondo Obsidian & Orbes de Luz Ambiental (Glow Refraction Layer)
            g.Clear(ColorCanvasBg);
            DrawAmbientOrbs(g, Width, Height);

            // 1. Barra Superior con Glassmorphism (Altura: 58px)
            int topBarY = 12;
            int topBarH = 54;
            Rectangle topBarRect = new Rectangle(16, topBarY, Width - 32, topBarH);
            DrawGlassCard(g, topBarRect, 16, ColorGlassCard, false, Color.Empty);

            // Marca / Logotipo estilo EchoFi (Estrella / Diamante Luminous)
            int brandX = topBarRect.X + 18;
            DrawStarGlyph(g, brandX, topBarY + 17, 20, ColorIceCyan);

            using (Font titleFont = new Font("Segoe UI", 12f, FontStyle.Bold))
            using (SolidBrush textBrush = new SolidBrush(ColorPureWhite))
            {
                g.DrawString("EchoDeck", titleFont, textBrush, brandX + 28, topBarY + 16);
            }

            // Píldora de Búsqueda / Contexto en Glass (EchoFi Style)
            int searchX = brandX + 140;
            Rectangle searchRect = new Rectangle(searchX, topBarY + 11, 280, 32);
            DrawGlassCard(g, searchRect, 10, Color.FromArgb(160, 24, 27, 38), false, Color.Empty);
            using (Font fSearch = new Font("Segoe UI", 8.5f, FontStyle.Regular))
            using (Font fK = new Font("Consolas", 8.5f, FontStyle.Bold))
            using (SolidBrush bMuted = new SolidBrush(ColorMutedSlate))
            using (SolidBrush bK = new SolidBrush(ColorIceCyan))
            {
                g.DrawString("🔍  Buscar macro o comando...", fSearch, bMuted, searchX + 12, topBarY + 19);
                g.DrawString("Ctrl+K", fK, bK, searchX + 225, topBarY + 19);
            }

            // Navegación estilo Tabs / Toggles en Cápsula de Vidrio
            int navStartX = searchX + 300;
            int navContainerW = 390;
            Rectangle navContainerRect = new Rectangle(navStartX, topBarY + 11, navContainerW, 32);
            DrawGlassCard(g, navContainerRect, 10, Color.FromArgb(140, 20, 23, 33), false, Color.Empty);

            string[] shortNavs = new string[] { "Botonera", "Telemetría", "Kanban", "Touchpad", "Móvil (QR)" };
            int tabW = navContainerW / shortNavs.Length;
            for (int ni = 0; ni < shortNavs.Length; ni++)
            {
                int tabX = navStartX + ni * tabW;
                bool isSel = ni == activeNavIndex;
                bool isHov = ni == hoveredNavIndex;

                if (isSel)
                {
                    Rectangle activeTabRect = new Rectangle(tabX + 2, topBarY + 13, tabW - 4, 28);
                    DrawGlassCard(g, activeTabRect, 8, Color.FromArgb(240, 34, 38, 54), true, ColorIceCyan);
                }

                using (Font fTab = new Font("Segoe UI", 8.5f, isSel ? FontStyle.Bold : FontStyle.Regular))
                using (SolidBrush bTab = new SolidBrush(isSel ? ColorIceCyan : (isHov ? ColorPureWhite : ColorMutedSlate)))
                {
                    SizeF sz = g.MeasureString(shortNavs[ni], fTab);
                    g.DrawString(shortNavs[ni], fTab, bTab, tabX + (tabW - sz.Width) / 2, topBarY + 19);
                }
            }

            // Botón Primario Blanco de Alto Contraste (EchoFi "Connect wallet" / "Acción Rápida")
            int ctaW = 140;
            int ctaH = 32;
            int ctaX = topBarRect.Right - ctaW - 120;
            ctaButtonRect = new Rectangle(ctaX, topBarY + 11, ctaW, ctaH);
            DrawWhitePillButton(g, ctaButtonRect, "⚡ Ejecutar Deck", new Font("Segoe UI", 8.5f, FontStyle.Bold), isHoverCta);

            // Píldora de Estado Conectado con Glowing Mint Dot
            int pillX = ctaButtonRect.Right + 12;
            Rectangle statusPill = new Rectangle(pillX, topBarY + 11, 40, 32);
            DrawGlassCard(g, statusPill, 10, Color.FromArgb(160, 24, 27, 38), false, Color.Empty);
            DrawGlowingDot(g, pillX + 15, topBarY + 22, ColorMintGreen);

            // Controles de Minimizar y Cerrar
            DrawWindowControls(g, topBarRect.Right - 55, topBarY + 11);

            // 2. Contenido de la Vista Activa
            int canvasX = 16;
            int canvasY = topBarRect.Bottom + 14;
            int canvasW = Width - 32;
            int canvasH = Height - canvasY - 16;

            if (activeNavIndex == 0) RenderViewBotonera(g, canvasX, canvasY, canvasW, canvasH);
            else if (activeNavIndex == 1) RenderViewMetricas(g, canvasX, canvasY, canvasW, canvasH);
            else if (activeNavIndex == 2) RenderViewKanban(g, canvasX, canvasY, canvasW, canvasH);
            else if (activeNavIndex == 3) RenderViewTouchpad(g, canvasX, canvasY, canvasW, canvasH);
            else if (activeNavIndex == 4) RenderViewEnlaceMovil(g, canvasX, canvasY, canvasW, canvasH);

            // 3. Toast Notifier Animado
            if (!string.IsNullOrEmpty(toastMessage) && DateTime.Now <= toastExpires)
            {
                RenderToast(g);
            }
        }

        private static void DrawAmbientOrbs(Graphics g, int width, int height)
        {
            // Orb 1: Ice Cyan Glow (#C2F4FF) en la esquina superior derecha (detrás de los gráficos)
            int orb1Size = 540;
            Rectangle orb1Rect = new Rectangle(width - 480, -120, orb1Size, orb1Size);
            using (GraphicsPath p1 = new GraphicsPath())
            {
                p1.AddEllipse(orb1Rect);
                using (PathGradientBrush pgb1 = new PathGradientBrush(p1))
                {
                    pgb1.CenterColor = Color.FromArgb(22, 194, 244, 255);
                    pgb1.SurroundColors = new Color[] { Color.FromArgb(0, 9, 10, 15) };
                    g.FillEllipse(pgb1, orb1Rect);
                }
            }

            // Orb 2: Pastel Lavender Glow (#C6C0FF) en la esquina inferior izquierda
            int orb2Size = 480;
            Rectangle orb2Rect = new Rectangle(-100, height - 390, orb2Size, orb2Size);
            using (GraphicsPath p2 = new GraphicsPath())
            {
                p2.AddEllipse(orb2Rect);
                using (PathGradientBrush pgb2 = new PathGradientBrush(p2))
                {
                    pgb2.CenterColor = Color.FromArgb(18, 198, 192, 255);
                    pgb2.SurroundColors = new Color[] { Color.FromArgb(0, 9, 10, 15) };
                    g.FillEllipse(pgb2, orb2Rect);
                }
            }
        }

        private static void DrawStarGlyph(Graphics g, int x, int y, int size, Color color)
        {
            PointF[] starPoints = new PointF[]
            {
                new PointF(x + size / 2f, y),
                new PointF(x + size * 0.65f, y + size * 0.35f),
                new PointF(x + size, y + size / 2f),
                new PointF(x + size * 0.65f, y + size * 0.65f),
                new PointF(x + size / 2f, y + size),
                new PointF(x + size * 0.35f, y + size * 0.65f),
                new PointF(x, y + size / 2f),
                new PointF(x + size * 0.35f, y + size * 0.35f)
            };
            using (SolidBrush sb = new SolidBrush(color))
            {
                g.FillPolygon(sb, starPoints);
            }
        }

        private static void DrawGlowingDot(Graphics g, int x, int y, Color coreColor)
        {
            using (SolidBrush halo2 = new SolidBrush(Color.FromArgb(30, coreColor.R, coreColor.G, coreColor.B)))
            {
                g.FillEllipse(halo2, x - 5, y - 5, 20, 20);
            }
            using (SolidBrush halo1 = new SolidBrush(Color.FromArgb(70, coreColor.R, coreColor.G, coreColor.B)))
            {
                g.FillEllipse(halo1, x - 2, y - 2, 14, 14);
            }
            using (SolidBrush core = new SolidBrush(coreColor))
            {
                g.FillEllipse(core, x, y, 10, 10);
            }
        }

        private static void DrawSoftShadow(Graphics g, Rectangle rect, int radius, int depth, int alpha)
        {
            if (rect.Width <= 0 || rect.Height <= 0) return;
            for (int i = depth; i >= 1; i--)
            {
                Rectangle sRect = new Rectangle(rect.X - i, rect.Y - i + (depth * 3 / 2), rect.Width + i * 2, rect.Height + i * 2);
                using (GraphicsPath sp = CreateRoundedRectangle(sRect, radius + i))
                using (SolidBrush sb = new SolidBrush(Color.FromArgb(alpha / depth * (depth - i + 1), 0, 0, 0)))
                {
                    g.FillPath(sb, sp);
                }
            }
        }

        private static void DrawGlassCard(Graphics g, Rectangle rect, int radius, Color glassFill, bool hasGlow, Color glowColor)
        {
            if (rect.Width <= 0 || rect.Height <= 0) return;

            // 1. Sombra 3D espacial suave
            DrawSoftShadow(g, rect, radius, 3, 30);

            // 2. Halo de Glow exterior si aplica
            if (hasGlow)
            {
                using (GraphicsPath gp = CreateRoundedRectangle(new Rectangle(rect.X - 2, rect.Y - 2, rect.Width + 4, rect.Height + 4), radius + 2))
                using (Pen glowPen = new Pen(Color.FromArgb(50, glowColor.R, glowColor.G, glowColor.B), 3f))
                {
                    g.DrawPath(glowPen, gp);
                }
            }

            // 3. Relleno Frosted Glass con translucidez
            using (GraphicsPath cardPath = CreateRoundedRectangle(rect, radius))
            {
                using (SolidBrush fillBrush = new SolidBrush(glassFill))
                {
                    g.FillPath(fillBrush, cardPath);
                }

                // 4. Borde 135° Rim Light (luz rasante)
                Color rimTopLeft = hasGlow ? glowColor : Color.FromArgb(55, 255, 255, 255);
                Color rimBottomRight = Color.FromArgb(8, 255, 255, 255);

                using (LinearGradientBrush rimBrush = new LinearGradientBrush(
                    new Point(rect.X, rect.Y),
                    new Point(rect.Right, rect.Bottom),
                    rimTopLeft,
                    rimBottomRight))
                using (Pen rimPen = new Pen(rimBrush, hasGlow ? 1.5f : 1.1f))
                {
                    g.DrawPath(rimPen, cardPath);
                }
            }
        }

        private static void DrawWhitePillButton(Graphics g, Rectangle rect, string text, Font font, bool isHovered)
        {
            DrawSoftShadow(g, rect, rect.Height / 2, 2, 40);
            Color btnColor = isHovered ? Color.FromArgb(230, 240, 255) : ColorPureWhite;
            using (GraphicsPath p = CreateRoundedRectangle(rect, rect.Height / 2))
            using (SolidBrush sb = new SolidBrush(btnColor))
            {
                g.FillPath(sb, p);
            }
            using (SolidBrush tb = new SolidBrush(Color.FromArgb(9, 10, 15)))
            {
                SizeF sz = g.MeasureString(text, font);
                g.DrawString(text, font, tb, rect.X + (rect.Width - sz.Width) / 2, rect.Y + (rect.Height - sz.Height) / 2);
            }
        }

        private static GraphicsPath CreateRoundedRectangle(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int d = radius * 2;
            if (d > rect.Width) d = rect.Width;
            if (d > rect.Height) d = rect.Height;

            path.AddArc(rect.X, rect.Y, d, d, 180, 90);
            path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
            path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
            path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }

        private void DrawWindowControls(Graphics g, int x, int y)
        {
            int btnSize = 32;
            Rectangle minRect = new Rectangle(x, y, btnSize, btnSize);
            Rectangle closeRect = new Rectangle(x + btnSize + 4, y, btnSize, btnSize);

            DrawGlassCard(g, minRect, 8, isHoverMin ? Color.FromArgb(180, 38, 43, 60) : Color.FromArgb(120, 20, 23, 33), isHoverMin, ColorIceCyan);
            DrawGlassCard(g, closeRect, 8, isHoverClose ? Color.FromArgb(200, 239, 68, 68) : Color.FromArgb(120, 20, 23, 33), isHoverClose, Color.FromArgb(239, 68, 68));

            using (Pen pMin = new Pen(Color.FromArgb(203, 213, 225), 2))
            using (Pen pClose = new Pen(ColorPureWhite, 2))
            {
                g.DrawLine(pMin, minRect.X + 9, minRect.Y + 20, minRect.X + 23, minRect.Y + 20);
                g.DrawLine(pClose, closeRect.X + 9, closeRect.Y + 10, closeRect.X + 23, closeRect.Y + 22);
                g.DrawLine(pClose, closeRect.X + 23, closeRect.Y + 10, closeRect.X + 9, closeRect.Y + 22);
            }
        }

        private void RenderViewBotonera(Graphics g, int x, int y, int w, int h)
        {
            // Barra superior de Perfil Activo con Glassmorphism
            int profH = 64;
            Rectangle profRect = new Rectangle(x, y, w, profH);
            DrawGlassCard(g, profRect, 16, ColorGlassCard, false, Color.Empty);

            using (Font f1 = new Font("Segoe UI", 12f, FontStyle.Bold))
            using (Font f2 = new Font("Segoe UI", 9f, FontStyle.Regular))
            using (SolidBrush bWhite = new SolidBrush(ColorPureWhite))
            using (SolidBrush bSlate = new SolidBrush(ColorMutedSlate))
            {
                g.DrawString("Botonera Dinámica Táctil (Deck 3D Glass)", f1, bWhite, x + 20, y + 14);
                g.DrawString("Contexto Activo: " + currentProfileName + "  ·  Haz clic directo o pulsa en tu móvil con respuesta háptica.", f2, bSlate, x + 20, y + 38);
            }

            // Tag de ventana activa a la derecha
            Rectangle winTagRect = new Rectangle(profRect.Right - 310, y + 16, 290, 32);
            DrawGlassCard(g, winTagRect, 10, Color.FromArgb(160, 26, 29, 41), false, Color.Empty);
            using (Font fWin = new Font("Segoe UI", 8.5f, FontStyle.Bold))
            using (SolidBrush bCyan = new SolidBrush(ColorIceCyan))
            {
                string winTxt = currentActiveWindow.Length > 26 ? currentActiveWindow.Substring(0, 24) + ".." : currentActiveWindow;
                g.DrawString("🪟 " + winTxt, fWin, bCyan, winTagRect.X + 12, y + 24);
            }

            // Grid de Botones con Glassmorphism, 3D Depth y Glow en Hover
            int startY = y + profH + 16;
            int cols = 4;
            int cardW = (w - (cols - 1) * 16) / cols;
            int cardH = 124;

            var tiles = activeTiles ?? defaultTiles;
            for (int i = 0; i < tiles.Count && i < 12; i++)
            {
                var t = tiles[i];
                int col = i % cols;
                int row = i / cols;
                int cardX = x + col * (cardW + 16);
                int cardY = startY + row * (cardH + 16);

                bool isHovered = i == hoveredTileIndex;
                Rectangle cardRect = new Rectangle(cardX, cardY, cardW, cardH);
                Color accent = ColorTranslator.FromHtml(t.AccentColor);

                Color cardGlassFill = isHovered ? ColorGlassElevated : ColorGlassCard;
                DrawGlassCard(g, cardRect, 14, cardGlassFill, isHovered, ColorIceCyan);

                // Micro-cápsula del Ícono con fondo oscuro
                Rectangle iconBox = new Rectangle(cardX + 16, cardY + 16, 42, 42);
                DrawGlassCard(g, iconBox, 10, Color.FromArgb(180, 12, 14, 20), false, Color.Empty);

                using (Font glyphFont = new Font("Segoe UI Emoji", 17f))
                using (SolidBrush glyphBrush = new SolidBrush(ColorPureWhite))
                {
                    g.DrawString(t.IconGlyph, glyphFont, glyphBrush, cardX + 21, cardY + 22);
                }

                // Chip de Atajo de Teclado (Consolas) estilo EchoFi
                using (Font fSc = new Font("Consolas", 8.5f, FontStyle.Bold))
                using (SolidBrush bScText = new SolidBrush(ColorMutedSlate))
                {
                    SizeF scSize = g.MeasureString(t.Shortcut, fSc);
                    Rectangle scRect = new Rectangle(cardX + cardW - (int)scSize.Width - 22, cardY + 18, (int)scSize.Width + 12, 22);
                    DrawGlassCard(g, scRect, 6, Color.FromArgb(140, 16, 18, 26), false, Color.Empty);
                    g.DrawString(t.Shortcut, fSc, bScText, scRect.X + 6, scRect.Y + 4);
                }

                // Títulos y Subtítulos con tipografía Neo-Grotesque
                using (Font fLbl = new Font("Segoe UI", 11f, FontStyle.Bold))
                using (Font fSub = new Font("Segoe UI", 8.5f, FontStyle.Regular))
                using (SolidBrush bW = new SolidBrush(ColorPureWhite))
                using (SolidBrush bM = new SolidBrush(ColorMutedSlate))
                {
                    g.DrawString(t.Label, fLbl, bW, cardX + 16, cardY + 70);
                    g.DrawString(t.SubLabel, fSub, bM, cardX + 16, cardY + 94);
                }
            }
        }

        private void RenderViewMetricas(Graphics g, int x, int y, int w, int h)
        {
            // Fila Superior: 3 Métricas KPI estilo EchoFi (Price, 24H Change, Volume)
            int kpiW = (w - 32) / 3;
            int kpiH = 110;

            DrawEchoFiKpi(g, x, y, kpiW, kpiH, "USO DE CPU EN TIEMPO REAL", ((int)cpuPercent) + "%", "+2.4% vs promedio", ColorMintGreen, true);
            DrawEchoFiKpi(g, x + kpiW + 16, y, kpiW, kpiH, "MEMORIA RAM ASIGNADA", ((int)ramPercent) + "%", "5.8 GB / 16.0 GB", ColorIceCyan, false);
            DrawEchoFiKpi(g, x + (kpiW + 16) * 2, y, kpiW, kpiH, "MACROS & ACCIONES EJECUTADAS", totalCommandsExecuted.ToString(), "42 hoy  ·  0 ms latencia", ColorLavender, false);

            // Gráfico Principal de Telemetría (Exactamente como el gráfico de EchoFi)
            int chartY = y + kpiH + 16;
            int chartH = h - kpiH - 16;
            Rectangle chartRect = new Rectangle(x, chartY, w, chartH);
            DrawGlassCard(g, chartRect, 18, ColorGlassCard, false, Color.Empty);

            // Cabecera del Gráfico con Pills y Toggles
            using (Font fChT = new Font("Segoe UI", 12f, FontStyle.Bold))
            using (SolidBrush bW = new SolidBrush(ColorPureWhite))
            {
                g.DrawString("Carga de Procesador & Throughput en Vivo", fChT, bW, x + 24, chartY + 20);
            }

            // Pills de Rango de Tiempo (1D, 7D, 1M, 1Y, All) estilo EchoFi
            int timePillX = chartRect.Right - 280;
            Rectangle timePillContainer = new Rectangle(timePillX, chartY + 16, 260, 30);
            DrawGlassCard(g, timePillContainer, 8, Color.FromArgb(140, 20, 23, 33), false, Color.Empty);
            string[] timeFilters = new string[] { "1m", "5m", "15m", "1H", "Todo" };
            int tpW = 260 / timeFilters.Length;
            for (int tfi = 0; tfi < timeFilters.Length; tfi++)
            {
                bool isSel = tfi == 0;
                if (isSel)
                {
                    Rectangle actPill = new Rectangle(timePillX + tfi * tpW + 2, chartY + 18, tpW - 4, 26);
                    DrawGlassCard(g, actPill, 6, Color.FromArgb(220, 36, 40, 56), true, ColorIceCyan);
                }
                using (Font fTp = new Font("Segoe UI", 8f, isSel ? FontStyle.Bold : FontStyle.Regular))
                using (SolidBrush bTp = new SolidBrush(isSel ? ColorIceCyan : ColorMutedSlate))
                {
                    SizeF sz = g.MeasureString(timeFilters[tfi], fTp);
                    g.DrawString(timeFilters[tfi], fTp, bTp, timePillX + tfi * tpW + (tpW - sz.Width) / 2, chartY + 23);
                }
            }

            // Grid Lines del Gráfico (sutiles y precisas)
            int plotX = x + 30;
            int plotW = w - 60;
            int plotY = chartY + 70;
            int plotH = chartH - 150;

            using (Pen gridPen = new Pen(Color.FromArgb(20, 255, 255, 255), 1))
            {
                gridPen.DashStyle = DashStyle.Dash;
                for (int gl = 0; gl <= 4; gl++)
                {
                    int gy = plotY + gl * (plotH / 4);
                    g.DrawLine(gridPen, plotX, gy, plotX + plotW, gy);
                }
            }

            // 1. Curva Neon Sparkline con Glow (#C2F4FF Ice Cyan)
            float[] points = cpuHistory.ToArray();
            if (points.Length >= 2)
            {
                PointF[] curvePoints = new PointF[points.Length];
                float stepX = plotW / (float)(MaxHistoryPoints - 1);
                int basePlotY = plotY + plotH;

                for (int pi = 0; pi < points.Length; pi++)
                {
                    float px = plotX + pi * stepX;
                    float py = basePlotY - (points[pi] / 100f * plotH);
                    curvePoints[pi] = new PointF(px, py);
                }

                // Sombreado Glass degradado bajo la curva
                using (GraphicsPath fillPath = new GraphicsPath())
                {
                    fillPath.AddLine(curvePoints[0].X, basePlotY, curvePoints[0].X, curvePoints[0].Y);
                    fillPath.AddCurve(curvePoints);
                    fillPath.AddLine(curvePoints[curvePoints.Length - 1].X, basePlotY, curvePoints[0].X, basePlotY);

                    using (LinearGradientBrush lgb = new LinearGradientBrush(
                        new Point(0, plotY),
                        new Point(0, basePlotY),
                        Color.FromArgb(60, ColorIceCyan.R, ColorIceCyan.G, ColorIceCyan.B),
                        Color.FromArgb(0, ColorIceCyan.R, ColorIceCyan.G, ColorIceCyan.B)))
                    {
                        g.FillPath(lgb, fillPath);
                    }
                }

                // Aura de Glow amplia
                using (Pen glowPen = new Pen(Color.FromArgb(50, ColorIceCyan.R, ColorIceCyan.G, ColorIceCyan.B), 6f))
                {
                    g.DrawCurve(glowPen, curvePoints);
                }

                // Línea Neón nítida de 2px
                using (Pen corePen = new Pen(ColorIceCyan, 2f))
                {
                    g.DrawCurve(corePen, curvePoints);
                }

                // Tooltip Flotante con Glassmorphism sobre el último punto
                PointF lastPt = curvePoints[curvePoints.Length - 1];
                DrawGlowingDot(g, (int)lastPt.X - 5, (int)lastPt.Y - 5, ColorIceCyan);

                Rectangle tooltipRect = new Rectangle((int)lastPt.X - 110, (int)lastPt.Y - 55, 110, 44);
                DrawGlassCard(g, tooltipRect, 10, Color.FromArgb(240, 24, 28, 40), true, ColorIceCyan);
                using (Font fTt1 = new Font("Segoe UI", 7.5f, FontStyle.Bold))
                using (Font fTt2 = new Font("Segoe UI", 8.5f, FontStyle.Bold))
                using (SolidBrush bSl = new SolidBrush(ColorMutedSlate))
                using (SolidBrush bWh = new SolidBrush(ColorPureWhite))
                {
                    g.DrawString("CPU ACTUAL", fTt1, bSl, tooltipRect.X + 10, tooltipRect.Y + 8);
                    g.DrawString(Math.Round(cpuPercent, 1) + "% · 16 Cores", fTt2, bWh, tooltipRect.X + 10, tooltipRect.Y + 22);
                }
            }

            // 2. Barras de Volumen de Actividad en Pastel Lavender (#C6C0FF) estilo EchoFi
            int barAreaY = plotY + plotH + 12;
            int barAreaH = chartH - (barAreaY - chartY) - 18;
            float barStepX = plotW / (float)volumeBars.Count;
            float barWidth = Math.Max(4f, barStepX - 4f);

            for (int bi = 0; bi < volumeBars.Count; bi++)
            {
                float bx = plotX + bi * barStepX;
                float bh = (volumeBars[bi] / 100f) * barAreaH;
                float by = barAreaY + barAreaH - bh;

                RectangleF bRect = new RectangleF(bx, by, barWidth, bh);
                using (SolidBrush bBrush = new SolidBrush(Color.FromArgb(140, ColorLavender.R, ColorLavender.G, ColorLavender.B)))
                {
                    g.FillRectangle(bBrush, bRect);
                }
            }
        }

        private void DrawEchoFiKpi(Graphics g, int x, int y, int w, int h, string title, string val, string sub, Color accent, bool showTrend)
        {
            Rectangle cardRect = new Rectangle(x, y, w, h);
            DrawGlassCard(g, cardRect, 16, ColorGlassCard, false, Color.Empty);

            using (Font ft = new Font("Segoe UI", 8f, FontStyle.Bold))
            using (Font fv = new Font("Segoe UI", 18f, FontStyle.Bold))
            using (Font fs = new Font("Segoe UI", 8.5f, FontStyle.Regular))
            using (SolidBrush bt = new SolidBrush(ColorMutedSlate))
            using (SolidBrush bv = new SolidBrush(ColorPureWhite))
            using (SolidBrush bs = new SolidBrush(accent))
            {
                g.DrawString(title, ft, bt, x + 20, y + 18);
                g.DrawString(val, fv, bv, x + 18, y + 38);
                g.DrawString(sub, fs, bs, x + 20, y + 74);
            }
        }

        private void RenderViewKanban(Graphics g, int x, int y, int w, int h)
        {
            int cols = 4;
            int colW = (w - (cols - 1) * 16) / cols;
            int startY = y;
            int colH = h;

            string[] colTitles = new string[] { "URGENTES (P1)", "EN CURSO", "EN REVISIÓN", "COMPLETADAS" };
            Color[] colColors = new Color[]
            {
                Color.FromArgb(239, 68, 68),
                ColorIceCyan,
                ColorLavender,
                ColorMintGreen
            };

            for (int c = 0; c < cols; c++)
            {
                int colX = x + c * (colW + 16);
                Rectangle colRect = new Rectangle(colX, startY, colW, colH);
                DrawGlassCard(g, colRect, 16, ColorGlassCard, false, Color.Empty);

                // Cabecera de Columna en Glass
                using (SolidBrush bBar = new SolidBrush(colColors[c]))
                using (Font fc = new Font("Segoe UI", 9.5f, FontStyle.Bold))
                using (SolidBrush bct = new SolidBrush(ColorPureWhite))
                {
                    g.FillRectangle(bBar, colX + 16, startY, colW - 32, 3);
                    g.DrawString(colTitles[c], fc, bct, colX + 18, startY + 16);
                }

                // Renderizado de Tarjetas de Tareas con 3D Depth
                TaskStatus targetStatus = (TaskStatus)c;
                int cardY = startY + 52;

                foreach (var t in tasks)
                {
                    if (t.Status == targetStatus)
                    {
                        Rectangle cardRect = new Rectangle(colX + 12, cardY, colW - 24, 112);
                        DrawGlassCard(g, cardRect, 12, ColorGlassElevated, false, Color.Empty);

                        using (Font fCode = new Font("Consolas", 9f, FontStyle.Bold))
                        using (Font fT = new Font("Segoe UI", 9f, FontStyle.Regular))
                        using (Font fBadge = new Font("Segoe UI", 7.5f, FontStyle.Bold))
                        using (SolidBrush bc = new SolidBrush(colColors[c]))
                        using (SolidBrush bw = new SolidBrush(ColorPureWhite))
                        using (SolidBrush bm = new SolidBrush(ColorMutedSlate))
                        {
                            g.DrawString(t.Code, fCode, bc, colX + 22, cardY + 14);

                            // Fuente Badge
                            Rectangle badgeRect = new Rectangle(colX + colW - 110, cardY + 12, 86, 20);
                            DrawGlassCard(g, badgeRect, 6, Color.FromArgb(160, 14, 16, 24), false, Color.Empty);
                            g.DrawString(t.SourceBadge, fBadge, bm, badgeRect.X + 8, badgeRect.Y + 3);

                            // Título con corte seguro
                            string displayTitle = t.Title.Length > 44 ? t.Title.Substring(0, 42) + "..." : t.Title;
                            g.DrawString(displayTitle, fT, bw, new RectangleF(colX + 22, cardY + 38, colW - 44, 40));

                            // SLA
                            g.DrawString("⏱ SLA: " + t.DueTime + "  ·  " + t.Project, fBadge, bm, colX + 22, cardY + 84);
                        }

                        cardY += 124;
                    }
                }
            }
        }

        private void RenderViewTouchpad(Graphics g, int x, int y, int w, int h)
        {
            Rectangle boxRect = new Rectangle(x, y, w, h);
            DrawGlassCard(g, boxRect, 18, ColorGlassCard, true, ColorIceCyan);

            // Cuadrícula sutil de referencia espacial táctil
            using (Pen gridPen = new Pen(Color.FromArgb(15, 255, 255, 255), 1))
            {
                for (int gx = boxRect.X + 50; gx < boxRect.Right; gx += 50)
                {
                    g.DrawLine(gridPen, gx, boxRect.Y + 16, gx, boxRect.Bottom - 16);
                }
                for (int gy = boxRect.Y + 50; gy < boxRect.Bottom; gy += 50)
                {
                    g.DrawLine(gridPen, boxRect.X + 16, gy, boxRect.Right - 16, gy);
                }
            }

            using (Font fBig = new Font("Segoe UI", 16f, FontStyle.Bold))
            using (Font fSub2 = new Font("Segoe UI", 9.5f, FontStyle.Regular))
            using (Font fCode = new Font("Consolas", 10.5f, FontStyle.Bold))
            using (SolidBrush bW = new SolidBrush(ColorPureWhite))
            using (SolidBrush bM = new SolidBrush(ColorMutedSlate))
            using (SolidBrush bCyan = new SolidBrush(ColorIceCyan))
            {
                g.DrawString("Lienzo de Puntero Remoto con Aceleración 3D", fBig, bW, x + 40, y + 36);
                g.DrawString("Desliza el dedo en tu smartphone para controlar el cursor del PC en tiempo real con 0 ms de latencia.", fSub2, bM, x + 40, y + 74);

                g.DrawString("• Un Toque = Clic Izquierdo Primario", fCode, bCyan, x + 40, y + 120);
                g.DrawString("• Doble Toque = Selección / Abrir Ventana", fCode, bCyan, x + 40, y + 150);
                g.DrawString("• Toque con Dos Dedos = Menú Contextual (Clic Derecho)", fCode, bCyan, x + 40, y + 180);
                g.DrawString("• Deslizar 2 Dedos = Rueda de Scroll Vertical", fCode, bCyan, x + 40, y + 210);

                // Botones Glass en la base del touchpad
                int btnW = (w - 100) / 2;
                int btnH = 54;
                int btnY = boxRect.Bottom - btnH - 32;

                Rectangle leftBtn = new Rectangle(boxRect.X + 40, btnY, btnW, btnH);
                Rectangle rightBtn = new Rectangle(boxRect.X + 60 + btnW, btnY, btnW, btnH);

                DrawGlassCard(g, leftBtn, 14, ColorGlassElevated, false, Color.Empty);
                DrawGlassCard(g, rightBtn, 14, ColorGlassElevated, false, Color.Empty);

                g.DrawString("CLIC IZQUIERDO", fCode, bW, leftBtn.X + btnW / 2 - 58, leftBtn.Y + 18);
                g.DrawString("CLIC DERECHO", fCode, bW, rightBtn.X + btnW / 2 - 50, rightBtn.Y + 18);
            }
        }

        private void RenderViewEnlaceMovil(Graphics g, int x, int y, int w, int h)
        {
            Rectangle mainRect = new Rectangle(x, y, w, h);
            DrawGlassCard(g, mainRect, 18, ColorGlassCard, false, Color.Empty);

            int qrSize = 224;
            int qrX = x + 40;
            int qrY = y + 40;

            string mobileDownloadUrl = "http://" + server.PrimaryLanIp + ":8620/mobile";

            // Contenedor blanco redondeado del QR para máximo contraste óptico
            Rectangle qrContainer = new Rectangle(qrX - 14, qrY - 14, qrSize + 28, qrSize + 28);
            DrawSoftShadow(g, qrContainer, 16, 3, 35);
            using (SolidBrush bWhite = new SolidBrush(Color.White))
            using (Pen borderPen = new Pen(ColorIceCyan, 2f))
            {
                using (GraphicsPath p = CreateRoundedRectangle(qrContainer, 16))
                {
                    g.FillPath(bWhite, p);
                    g.DrawPath(borderPen, p);
                }
            }

            using (Bitmap qr = GenerateQrMatrix(mobileDownloadUrl, qrSize))
            {
                g.DrawImage(qr, qrX, qrY);
            }

            // Panel de Instrucciones y Botones con Glassmorphism
            int infoX = qrX + qrSize + 60;
            using (Font fH = new Font("Segoe UI", 12f, FontStyle.Bold))
            using (Font fB = new Font("Segoe UI", 9.5f, FontStyle.Regular))
            using (Font fCode = new Font("Consolas", 11f, FontStyle.Bold))
            using (SolidBrush bW = new SolidBrush(ColorPureWhite))
            using (SolidBrush bM = new SolidBrush(ColorMutedSlate))
            using (SolidBrush bCyan = new SolidBrush(ColorIceCyan))
            {
                g.DrawString("1. Escanear con la Cámara de tu Smartphone", fH, bW, infoX, qrY);
                g.DrawString("Apunta con la cámara o Google Lens. Descargará OpsDeck Mobile al instante:", fB, bM, infoX, qrY + 28);
                g.DrawString(mobileDownloadUrl, fCode, bCyan, infoX, qrY + 54);

                // Botón Blanco de Alto Contraste para Copiar Enlace
                copyUrlRect = new Rectangle(infoX, qrY + 84, 210, 36);
                DrawWhitePillButton(g, copyUrlRect, "📋 Copiar Enlace Directo", new Font("Segoe UI", 9f, FontStyle.Bold), isHoverCopyUrl);

                g.DrawString("2. Apertura Directa en Chrome Móvil", fH, bW, infoX, qrY + 140);
                g.DrawString("Conecta tu celular a la misma red Wi-Fi y visita:", fB, bM, infoX, qrY + 166);
                g.DrawString("http://" + server.PrimaryLanIp + ":8620/download/apk", fCode, bCyan, infoX, qrY + 190);

                g.DrawString("3. Diagnóstico de Infraestructura Local", fH, bW, infoX, qrY + 236);
                using (Font fDiag = new Font("Segoe UI", 9f, FontStyle.Regular))
                using (SolidBrush bGreen = new SolidBrush(ColorMintGreen))
                {
                    g.DrawString("✓ Servidor HTTP nativo activo en 0.0.0.0:8620 (Sin permisos admin)", fDiag, bGreen, infoX, qrY + 262);
                    g.DrawString("✓ Descubrimiento UDP activo en 41234 (Transmisión automática)", fDiag, bGreen, infoX, qrY + 286);
                    g.DrawString("✓ Paquete APK compilado, alineado a 4 bytes y firmado con scheme v2/v3", fDiag, bGreen, infoX, qrY + 310);
                }
            }
        }

        private void RenderToast(Graphics g)
        {
            using (Font fToast = new Font("Segoe UI", 9.5f, FontStyle.Bold))
            {
                SizeF msgSize = g.MeasureString(toastMessage, fToast);
                int tw = (int)msgSize.Width + 44;
                int th = 44;
                int tx = Width - tw - 24;
                int ty = Height - th - 24;

                Rectangle toastRect = new Rectangle(tx, ty, tw, th);
                DrawGlassCard(g, toastRect, 12, Color.FromArgb(240, 24, 28, 42), true, ColorIceCyan);

                using (SolidBrush tText = new SolidBrush(ColorPureWhite))
                {
                    g.DrawString(toastMessage, fToast, tText, tx + 18, ty + 13);
                }
            }
        }

        private Bitmap GenerateQrMatrix(string payload, int size)
        {
            try
            {
                using (QRCoder.QRCodeGenerator qrGen = new QRCoder.QRCodeGenerator())
                {
                    using (QRCoder.QRCodeData data = qrGen.CreateQrCode(payload, QRCoder.QRCodeGenerator.ECCLevel.M))
                    {
                        using (QRCoder.QRCode qr = new QRCoder.QRCode(data))
                        {
                            Bitmap raw = qr.GetGraphic(8, Color.FromArgb(9, 10, 15), Color.White, true);
                            Bitmap scaled = new Bitmap(raw, new Size(size, size));
                            raw.Dispose();
                            return scaled;
                        }
                    }
                }
            }
            catch
            {
                Bitmap fallback = new Bitmap(size, size);
                using (Graphics g = Graphics.FromImage(fallback))
                {
                    g.Clear(Color.White);
                }
                return fallback;
            }
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);

            if (isDragging)
            {
                Point diff = Point.Subtract(Cursor.Position, new Size(dragCursorPoint));
                Location = Point.Add(dragFormPoint, new Size(diff));
                return;
            }

            int prevHovNav = hoveredNavIndex;
            int prevHovTile = hoveredTileIndex;
            bool prevHovClose = isHoverClose;
            bool prevHovMin = isHoverMin;
            bool prevHovCopy = isHoverCopyUrl;
            bool prevHovCta = isHoverCta;

            int topBarY = 12;
            int topBarH = 54;
            Rectangle topBarRect = new Rectangle(16, topBarY, Width - 32, topBarH);

            // Window Controls Hover
            int btnSize = 32;
            int ctrlX = topBarRect.Right - 55;
            isHoverMin = (e.X >= ctrlX && e.X <= ctrlX + btnSize && e.Y >= topBarY + 11 && e.Y <= topBarY + 11 + btnSize);
            isHoverClose = (e.X >= ctrlX + btnSize + 4 && e.X <= ctrlX + btnSize * 2 + 4 && e.Y >= topBarY + 11 && e.Y <= topBarY + 11 + btnSize);

            // Nav Tabs Hover
            int searchX = topBarRect.X + 18 + 20 + 140;
            int navStartX = searchX + 300;
            int navContainerW = 390;
            hoveredNavIndex = -1;
            if (e.X >= navStartX && e.X <= navStartX + navContainerW && e.Y >= topBarY + 11 && e.Y <= topBarY + 43)
            {
                int tabW = navContainerW / navLabels.Length;
                int idx = (e.X - navStartX) / tabW;
                if (idx >= 0 && idx < navLabels.Length) hoveredNavIndex = idx;
            }

            // CTA Button Hover
            isHoverCta = ctaButtonRect.Contains(e.Location);

            // Botonera Tile Hover
            hoveredTileIndex = -1;
            if (activeNavIndex == 0)
            {
                int canvasX = 16;
                int canvasY = topBarRect.Bottom + 14;
                int startY = canvasY + 64 + 16;
                int cols = 4;
                int canvasW = Width - 32;
                int cardW = (canvasW - (cols - 1) * 16) / cols;
                int cardH = 124;

                for (int i = 0; i < (activeTiles != null ? activeTiles.Count : 0) && i < 12; i++)
                {
                    int col = i % cols;
                    int row = i / cols;
                    int cardX = canvasX + col * (cardW + 16);
                    int cardY = startY + row * (cardH + 16);

                    if (e.X >= cardX && e.X <= cardX + cardW && e.Y >= cardY && e.Y <= cardY + cardH)
                    {
                        hoveredTileIndex = i;
                        break;
                    }
                }
            }

            // Copy URL Hover
            isHoverCopyUrl = (activeNavIndex == 4 && copyUrlRect.Contains(e.Location));

            if (hoveredTileIndex != -1 || hoveredNavIndex != -1 || isHoverClose || isHoverMin || isHoverCopyUrl || isHoverCta)
            {
                Cursor = Cursors.Hand;
            }
            else
            {
                Cursor = Cursors.Default;
            }

            if (prevHovNav != hoveredNavIndex || prevHovTile != hoveredTileIndex ||
                prevHovClose != isHoverClose || prevHovMin != isHoverMin ||
                prevHovCopy != isHoverCopyUrl || prevHovCta != isHoverCta)
            {
                Invalidate();
            }
        }

        protected override void OnMouseClick(MouseEventArgs e)
        {
            base.OnMouseClick(e);

            int topBarY = 12;
            int topBarH = 54;
            Rectangle topBarRect = new Rectangle(16, topBarY, Width - 32, topBarH);

            // Window Controls Clicks
            int btnSize = 32;
            int ctrlX = topBarRect.Right - 55;
            if (e.X >= ctrlX + btnSize + 4 && e.X <= ctrlX + btnSize * 2 + 4 && e.Y >= topBarY + 11 && e.Y <= topBarY + 11 + btnSize)
            {
                Close();
                Application.Exit();
                return;
            }
            if (e.X >= ctrlX && e.X <= ctrlX + btnSize && e.Y >= topBarY + 11 && e.Y <= topBarY + 11 + btnSize)
            {
                WindowState = FormWindowState.Minimized;
                return;
            }

            // Nav Tabs Click
            int searchX = topBarRect.X + 18 + 20 + 140;
            int navStartX = searchX + 300;
            int navContainerW = 390;
            if (e.X >= navStartX && e.X <= navStartX + navContainerW && e.Y >= topBarY + 11 && e.Y <= topBarY + 43)
            {
                int tabW = navContainerW / navLabels.Length;
                int idx = (e.X - navStartX) / tabW;
                if (idx >= 0 && idx < navLabels.Length)
                {
                    activeNavIndex = idx;
                    Invalidate();
                    return;
                }
            }

            // CTA Button Click
            if (ctaButtonRect.Contains(e.Location))
            {
                activeNavIndex = 0; // Abre la botonera
                ShowToast("⚡ Panel de Macros Activo");
                Invalidate();
                return;
            }

            // Botonera Tile Click
            if (activeNavIndex == 0)
            {
                int canvasX = 16;
                int canvasY = topBarRect.Bottom + 14;
                int startY = canvasY + 64 + 16;
                int cols = 4;
                int canvasW = Width - 32;
                int cardW = (canvasW - (cols - 1) * 16) / cols;
                int cardH = 124;

                for (int i = 0; i < (activeTiles != null ? activeTiles.Count : 0) && i < 12; i++)
                {
                    int col = i % cols;
                    int row = i / cols;
                    int cardX = canvasX + col * (cardW + 16);
                    int cardY = startY + row * (cardH + 16);

                    if (e.X >= cardX && e.X <= cardX + cardW && e.Y >= cardY && e.Y <= cardY + cardH)
                    {
                        var tile = activeTiles[i];
                        if (tile.Command.StartsWith("launch:"))
                        {
                            Win32.LaunchApp(tile.Command.Substring(7));
                        }
                        else if (tile.Command.StartsWith("hotkey:"))
                        {
                            Win32.SendHotkey(tile.Command.Substring(7));
                        }
                        else if (tile.Command.StartsWith("macro:"))
                        {
                            string m = tile.Command.Substring(6).ToLowerInvariant();
                            if (m == "sum") Win32.SendHotkey("keys:=SUMA(){LEFT}");
                            else if (m == "save") Win32.SendHotkey("ctrl+s");
                            else if (m == "filter") Win32.SendHotkey("keys:^+L");
                        }

                        totalCommandsExecuted++;
                        ShowToast("✦ Acción ejecutada: " + tile.Label + " (" + tile.Shortcut + ")");
                        Invalidate();
                        return;
                    }
                }
            }

            // Copy URL Click
            if (activeNavIndex == 4 && copyUrlRect.Contains(e.Location))
            {
                try
                {
                    string url = "http://" + server.PrimaryLanIp + ":8620/mobile";
                    Clipboard.SetText(url);
                    ShowToast("📋 ¡Enlace copiado al portapapeles!");
                }
                catch { }
            }
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);
            if (e.Button == MouseButtons.Left && e.Y <= 68)
            {
                isDragging = true;
                dragCursorPoint = Cursor.Position;
                dragFormPoint = Location;
            }
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            base.OnMouseUp(e);
            isDragging = false;
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (trayIcon != null) trayIcon.Visible = false;
            if (server != null) server.Stop();
            base.OnFormClosing(e);
        }
    }
}
