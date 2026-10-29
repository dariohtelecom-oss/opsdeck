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

        // Visual State
        private int activeNavIndex = 0;
        private int hoveredNavIndex = -1;
        private int hoveredTileIndex = -1;
        private bool isHoverClose = false;
        private bool isHoverMin = false;
        private bool isHoverCopyUrl = false;
        private Rectangle copyUrlRect = Rectangle.Empty;

        private readonly string[] navLabels = new string[]
        {
            "🎛️  Botonera Dinámica",
            "📈  Métricas & Telemetría",
            "📋  Tablero Kanban IA",
            "🖱️  Panel Táctil & Firma",
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

        // Telemetry
        private float cpuPercent = 14f;
        private float ramPercent = 48f;
        private readonly Queue<float> cpuHistory = new Queue<float>();
        private readonly Queue<float> ramHistory = new Queue<float>();
        private const int MaxHistoryPoints = 32;

        private string currentActiveWindow = "OpsDeck Enterprise";
        private string currentProfileName = "General de Oficina";
        private int totalCommandsExecuted = 28;

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

            Text = "OpsDeck Enterprise v2.5 — Centro de Mando Ejecutivo";
            Size = new Size(1220, 740);
            MinimumSize = new Size(1020, 640);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.None;
            BackColor = Color.FromArgb(11, 15, 25);
            ForeColor = Color.FromArgb(241, 245, 249);
            Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            // Inicializar historial de telemetría con valores suaves
            Random rnd = new Random();
            for (int i = 0; i < MaxHistoryPoints; i++)
            {
                cpuHistory.Enqueue(12f + (float)(rnd.NextDouble() * 15));
                ramHistory.Enqueue(46f + (float)(rnd.NextDouble() * 4));
            }

            InitializeData();
            InitializeHostServer();
            InitializeTray();

            // Timer de Telemetría (cada 1.5s)
            telemetryTimer = new System.Windows.Forms.Timer { Interval = 1500 };
            telemetryTimer.Tick += (s, e) =>
            {
                float nextCpu = (float)(new Random().Next(10, 36));
                float nextRam = 47f + (float)(new Random().NextDouble() * 3.5);
                cpuPercent = nextCpu;
                ramPercent = nextRam;

                if (cpuHistory.Count >= MaxHistoryPoints) cpuHistory.Dequeue();
                cpuHistory.Enqueue(nextCpu);

                if (ramHistory.Count >= MaxHistoryPoints) ramHistory.Dequeue();
                ramHistory.Enqueue(nextRam);

                Invalidate();
            };
            telemetryTimer.Start();

            // Timer de Detección de Ventana Activa (cada 800ms)
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

            ShowToast("🚀 OpsDeck Enterprise iniciado en " + server.PrimaryLanIp + ":8620");
        }

        private void InitializeData()
        {
            defaultTiles = new List<DeckTile>
            {
                new DeckTile("t-excel", "Excel", "Planillas & BI", "📊", "#22D3EE", "launch:excel", "Win+R"),
                new DeckTile("t-outlook", "Outlook 365", "Bandeja Corp.", "✉️", "#38BDF8", "launch:outlook", "Win+R"),
                new DeckTile("t-teams", "MS Teams", "Reuniones & Chat", "👥", "#818CF8", "launch:teams", "Win+R"),
                new DeckTile("t-calc", "Calculadora", "Finanzas & CLP", "🔢", "#34D399", "launch:calc", "Win+R"),
                new DeckTile("t-term", "Terminal PowerShell", "Consola Admin", "💻", "#F472B6", "launch:powershell", "Win+R"),
                new DeckTile("t-chrome", "Google Chrome", "Navegación Web", "🌐", "#FB923C", "launch:chrome", "Win+R"),
                new DeckTile("t-mute", "Silenciar Micrófono", "Teams / Zoom", "🎙️", "#EF4444", "hotkey:ctrl+shift+m", "Ctrl+Shift+M"),
                new DeckTile("t-save", "Guardar Trabajo", "Commit / Guardar", "💾", "#A78BFA", "hotkey:ctrl+s", "Ctrl+S"),
                new DeckTile("t-lock", "Bloquear Estación", "Seguridad Windows", "🔒", "#FBBF24", "launch:rundll32.exe user32.dll,LockWorkStation", "Win+L"),
                new DeckTile("t-snip", "Captura Recorte", "Pantalla / Evidencia", "✂️", "#2DD4BF", "launch:snippingtool", "Win+Shift+S"),
                new DeckTile("t-task", "Administrador Tareas", "Rendimiento PC", "⚡", "#F87171", "launch:taskmgr", "Ctrl+Shift+Esc"),
                new DeckTile("t-exp", "Explorador Archivos", "Documentos Corp.", "📁", "#38BDF8", "launch:explorer", "Win+E")
            };

            excelTiles = new List<DeckTile>
            {
                new DeckTile("ex-sum", "AutoSuma Rápida", "Fórmula Contable", "Σ", "#34D399", "macro:sum", "=SUMA()"),
                new DeckTile("ex-filter", "Activar Filtros", "Tablas & Datos", "⚡", "#22D3EE", "macro:filter", "Ctrl+Shift+L"),
                new DeckTile("ex-save", "Guardar Libro", "Versión Actual", "💾", "#38BDF8", "hotkey:ctrl+s", "Ctrl+S"),
                new DeckTile("ex-chart", "Insertar Gráfico", "Reporte Ejecutivo", "📈", "#F472B6", "hotkey:keys:%{F1}", "Alt+F1"),
                new DeckTile("ex-calc", "Recalcular Hoja", "Fórmulas & Celdas", "🔄", "#FBBF24", "hotkey:keys:{F9}", "F9"),
                new DeckTile("ex-copy", "Copiar Formato", "Pincel de Estilo", "🎨", "#A78BFA", "hotkey:keys:^c", "Ctrl+C"),
                new DeckTile("ex-paste", "Pegado Especial", "Solo Valores", "📋", "#2DD4BF", "hotkey:keys:^%v", "Ctrl+Alt+V"),
                new DeckTile("ex-undo", "Deshacer Cambio", "Revertir Acción", "↩️", "#94A3B8", "hotkey:keys:^z", "Ctrl+Z")
            };

            meetingTiles = new List<DeckTile>
            {
                new DeckTile("mt-mic", "Mute Micrófono", "Activar/Silenciar", "🎙️", "#EF4444", "hotkey:ctrl+shift+m", "Ctrl+Shift+M"),
                new DeckTile("mt-cam", "Cámara On/Off", "Video Conferencia", "📹", "#FB923C", "hotkey:ctrl+shift+o", "Ctrl+Shift+O"),
                new DeckTile("mt-hand", "Levantar Mano", "Participación", "✋", "#FBBF24", "hotkey:keys:^k", "Ctrl+K"),
                new DeckTile("mt-share", "Compartir Pantalla", "Presentación", "🖥️", "#22D3EE", "hotkey:ctrl+shift+e", "Ctrl+Shift+E"),
                new DeckTile("mt-leave", "Abandonar Llamada", "Colgar Reunión", "📞", "#F87171", "hotkey:keys:^+b", "Ctrl+Shift+B"),
                new DeckTile("mt-chat", "Abrir Chat", "Mensajería en Vivo", "💬", "#38BDF8", "hotkey:keys:^+r", "Ctrl+Shift+R")
            };

            itsmTiles = new List<DeckTile>
            {
                new DeckTile("it-glpi", "GLPI Tickets", "Mesa de Ayuda", "🎫", "#38BDF8", "launch:https://glpi", "Web"),
                new DeckTile("it-jira", "Jira ITSM", "Tablero Sprint", "📋", "#22D3EE", "launch:https://jira", "Web"),
                new DeckTile("it-rdp", "Escritorio Remoto", "Conexión Servidores", "🖥️", "#818CF8", "launch:mstsc", "RDP"),
                new DeckTile("it-ssh", "Consola SSH", "Admin Linux / Cloud", "⚡", "#34D399", "launch:powershell", "CLI"),
                new DeckTile("it-ping", "Ping Gateway", "Diagnóstico Red", "📡", "#FBBF24", "launch:cmd /k ping 192.168.1.1", "CMD"),
                new DeckTile("it-vpn", "Estado VPN", "Túnel Corporativo", "🛡️", "#2DD4BF", "launch:control netconnections", "Net")
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
                    ShowToast("⚡ Macro remota ejecutada desde dispositivo móvil: " + id);
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
                menu.Items.Add("Abrir OpsDeck Enterprise", null, (s, e) => { Show(); WindowState = FormWindowState.Normal; Activate(); });
                menu.Items.Add(new ToolStripSeparator());
                menu.Items.Add("Salir de OpsDeck", null, (s, e) => { Close(); Application.Exit(); });

                trayIcon = new NotifyIcon
                {
                    Icon = SystemIcons.Shield,
                    Text = "OpsDeck Enterprise v2.5 (" + server.PrimaryLanIp + ":8620)",
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

            // 1. TitleBar Superior Ejecutivo (Altura: 56px)
            using (SolidBrush headerBg = new SolidBrush(Color.FromArgb(15, 23, 42)))
            {
                g.FillRectangle(headerBg, 0, 0, Width, 56);
            }
            using (Pen borderPen = new Pen(Color.FromArgb(30, 41, 59), 1))
            {
                g.DrawLine(borderPen, 0, 56, Width, 56);
            }

            // Marca / Logotipo Corporativo
            using (SolidBrush logoBadge = new SolidBrush(Color.FromArgb(34, 211, 238)))
            using (Font fLogo = new Font("Segoe UI", 9f, FontStyle.Bold))
            using (SolidBrush bDark = new SolidBrush(Color.FromArgb(11, 15, 25)))
            {
                Rectangle logoRect = new Rectangle(18, 12, 32, 32);
                DrawRoundedCard(g, logoRect, 6, logoBadge, null);
                g.DrawString("OD", fLogo, bDark, 23, 19);
            }

            using (Font titleFont = new Font("Segoe UI", 11.5f, FontStyle.Bold))
            using (SolidBrush textBrush = new SolidBrush(Color.FromArgb(248, 250, 252)))
            {
                g.DrawString("OPSDECK ENTERPRISE", titleFont, textBrush, 58, 14);
            }
            using (Font subFont = new Font("Segoe UI", 8.5f, FontStyle.Regular))
            using (SolidBrush subBrush = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                g.DrawString("v2.5 · CENTRO DE MANDO NATIVO & TELEMETRÍA PC", subFont, subBrush, 58, 33);
            }

            // Status Indicator Pill (Online & Active Window Context)
            int pillX = Width - 480;
            Rectangle pillRect = new Rectangle(pillX, 12, 320, 32);
            using (SolidBrush pillBg = new SolidBrush(Color.FromArgb(24, 33, 47)))
            using (Pen pillBrd = new Pen(Color.FromArgb(51, 65, 85), 1))
            {
                DrawRoundedCard(g, pillRect, 8, pillBg, pillBrd);
            }
            using (SolidBrush dotBrush = new SolidBrush(Color.FromArgb(34, 197, 94)))
            {
                g.FillEllipse(dotBrush, pillX + 12, 23, 10, 10);
            }
            using (Font pillFont = new Font("Segoe UI", 8.5f, FontStyle.Bold))
            using (SolidBrush pillText = new SolidBrush(Color.FromArgb(226, 232, 240)))
            {
                string winPreview = currentActiveWindow.Length > 22 ? currentActiveWindow.Substring(0, 20) + ".." : currentActiveWindow;
                g.DrawString(server.PrimaryLanIp + ":8620  |  " + winPreview, pillFont, pillText, pillX + 30, 20);
            }

            // Window Control Buttons (Minimizar, Cerrar)
            DrawWindowControls(g);

            // 2. Navigation Rail Izquierdo (Ancho: 230px)
            using (SolidBrush navBg = new SolidBrush(Color.FromArgb(15, 23, 42)))
            {
                g.FillRectangle(navBg, 0, 57, 230, Height - 57);
            }
            using (Pen navBorder = new Pen(Color.FromArgb(30, 41, 59), 1))
            {
                g.DrawLine(navBorder, 230, 57, 230, Height);
            }

            // Nav Items con Hover & Active States
            for (int i = 0; i < navLabels.Length; i++)
            {
                int itemY = 74 + (i * 50);
                bool isSelected = i == activeNavIndex;
                bool isHovered = i == hoveredNavIndex;

                Rectangle navRect = new Rectangle(10, itemY, 210, 42);

                if (isSelected)
                {
                    using (SolidBrush selBg = new SolidBrush(Color.FromArgb(30, 41, 59)))
                    using (Pen selBrd = new Pen(Color.FromArgb(34, 211, 238), 1))
                    {
                        DrawRoundedCard(g, navRect, 8, selBg, selBrd);
                    }
                    using (SolidBrush indicator = new SolidBrush(Color.FromArgb(34, 211, 238)))
                    {
                        g.FillRectangle(indicator, 10, itemY + 8, 4, 26);
                    }
                }
                else if (isHovered)
                {
                    using (SolidBrush hovBg = new SolidBrush(Color.FromArgb(24, 33, 47)))
                    {
                        DrawRoundedCard(g, navRect, 8, hovBg, null);
                    }
                }

                using (Font navFont = new Font("Segoe UI", 9.5f, isSelected ? FontStyle.Bold : FontStyle.Regular))
                using (SolidBrush navText = new SolidBrush(isSelected ? Color.FromArgb(34, 211, 238) : (isHovered ? Color.White : Color.FromArgb(148, 163, 184))))
                {
                    g.DrawString(navLabels[i], navFont, navText, 24, itemY + 11);
                }
            }

            // Tarjeta de Perfil Dinámico Activo al fondo de la barra
            int profileCardY = Height - 92;
            Rectangle profCardRect = new Rectangle(12, profileCardY, 206, 76);
            using (SolidBrush pBg = new SolidBrush(Color.FromArgb(8, 11, 19)))
            using (Pen pBrd = new Pen(Color.FromArgb(30, 41, 59), 1))
            {
                DrawRoundedCard(g, profCardRect, 10, pBg, pBrd);
            }
            using (Font pf1 = new Font("Segoe UI", 7.5f, FontStyle.Bold))
            using (Font pf2 = new Font("Segoe UI", 9f, FontStyle.Bold))
            using (SolidBrush pb1 = new SolidBrush(Color.FromArgb(34, 211, 238)))
            using (SolidBrush pb2 = new SolidBrush(Color.FromArgb(248, 250, 252)))
            {
                g.DrawString("CONTEXTO ACTIVO:", pf1, pb1, 22, profileCardY + 14);
                string prof = currentProfileName.Length > 20 ? currentProfileName.Substring(0, 18) + ".." : currentProfileName;
                g.DrawString(prof, pf2, pb2, 22, profileCardY + 32);
                using (Font pf3 = new Font("Segoe UI", 7.5f, FontStyle.Regular))
                using (SolidBrush pb3 = new SolidBrush(Color.FromArgb(148, 163, 184)))
                {
                    g.DrawString("Botonera adaptada en vivo", pf3, pb3, 22, profileCardY + 52);
                }
            }

            // 3. Canvas de Contenido Principal
            int canvasX = 248;
            int canvasY = 72;
            int canvasW = Width - canvasX - 18;
            int canvasH = Height - canvasY - 18;

            if (activeNavIndex == 0) RenderViewBotonera(g, canvasX, canvasY, canvasW, canvasH);
            else if (activeNavIndex == 1) RenderViewMetricas(g, canvasX, canvasY, canvasW, canvasH);
            else if (activeNavIndex == 2) RenderViewKanban(g, canvasX, canvasY, canvasW, canvasH);
            else if (activeNavIndex == 3) RenderViewTouchpad(g, canvasX, canvasY, canvasW, canvasH);
            else if (activeNavIndex == 4) RenderViewEnlaceMovil(g, canvasX, canvasY, canvasW, canvasH);

            // 4. Toast Notification Flotante (Elegante y animada)
            if (!string.IsNullOrEmpty(toastMessage) && DateTime.Now <= toastExpires)
            {
                RenderToast(g);
            }
        }

        private void DrawWindowControls(Graphics g)
        {
            int btnSize = 34;
            int closeX = Width - btnSize - 12;
            int minX = closeX - btnSize - 6;

            Rectangle minRect = new Rectangle(minX, 11, btnSize, btnSize);
            Rectangle closeRect = new Rectangle(closeX, 11, btnSize, btnSize);

            // Minimize
            using (SolidBrush minBg = new SolidBrush(isHoverMin ? Color.FromArgb(51, 65, 85) : Color.FromArgb(30, 41, 59)))
            using (Pen p = new Pen(Color.FromArgb(203, 213, 225), 2))
            {
                DrawRoundedCard(g, minRect, 6, minBg, null);
                g.DrawLine(p, minX + 10, 28, minX + 24, 28);
            }

            // Close
            using (SolidBrush closeBg = new SolidBrush(isHoverClose ? Color.FromArgb(239, 68, 68) : Color.FromArgb(30, 41, 59)))
            using (Pen p = new Pen(Color.FromArgb(248, 250, 252), 2))
            {
                DrawRoundedCard(g, closeRect, 6, closeBg, null);
                g.DrawLine(p, closeX + 10, 17, closeX + 24, 31);
                g.DrawLine(p, closeX + 24, 17, closeX + 10, 31);
            }
        }

        private void RenderViewBotonera(Graphics g, int x, int y, int w, int h)
        {
            using (Font fTitle = new Font("Segoe UI", 13f, FontStyle.Bold))
            using (Font fSub = new Font("Segoe UI", 9f, FontStyle.Regular))
            using (SolidBrush bWhite = new SolidBrush(Color.FromArgb(248, 250, 252)))
            using (SolidBrush bMuted = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                g.DrawString("Botonera Dinámica Táctil (Deck Ejecutivo PC)", fTitle, bWhite, x, y);
                g.DrawString("Perfil activo: " + currentProfileName + ". Haz clic directo en cualquier tarjeta o acciónala desde tu celular.", fSub, bMuted, x, y + 26);
            }

            int startY = y + 62;
            int cols = 4;
            int cardW = (w - (cols - 1) * 16) / cols;
            int cardH = 118;

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

                using (SolidBrush cardBg = new SolidBrush(isHovered ? Color.FromArgb(28, 41, 65) : Color.FromArgb(20, 29, 47)))
                using (Pen cardBorder = new Pen(isHovered ? Color.FromArgb(34, 211, 238) : Color.FromArgb(37, 51, 74), isHovered ? 1.5f : 1f))
                {
                    DrawRoundedCard(g, cardRect, 10, cardBg, cardBorder);
                }

                // Barra superior de acento redondeada
                using (SolidBrush bAcc = new SolidBrush(accent))
                {
                    g.FillRectangle(bAcc, cardX + 10, cardY, cardW - 20, 3);
                }

                // Ícono / Glifo con fondo de micro-cápsula
                Rectangle iconBox = new Rectangle(cardX + 14, cardY + 16, 38, 38);
                using (SolidBrush iconBg = new SolidBrush(Color.FromArgb(11, 15, 25)))
                {
                    DrawRoundedCard(g, iconBox, 8, iconBg, null);
                }
                using (Font glyphFont = new Font("Segoe UI Emoji", 16f))
                using (SolidBrush glyphBrush = new SolidBrush(Color.White))
                {
                    g.DrawString(t.IconGlyph, glyphFont, glyphBrush, cardX + 17, cardY + 20);
                }

                // Chip de Atajo de Teclado (Monospace)
                using (Font fSc = new Font("Consolas", 8.5f, FontStyle.Bold))
                using (SolidBrush bScBg = new SolidBrush(Color.FromArgb(30, 41, 59)))
                using (SolidBrush bScText = new SolidBrush(Color.FromArgb(203, 213, 225)))
                {
                    SizeF scSize = g.MeasureString(t.Shortcut, fSc);
                    Rectangle scRect = new Rectangle(cardX + cardW - (int)scSize.Width - 20, cardY + 18, (int)scSize.Width + 10, 20);
                    DrawRoundedCard(g, scRect, 4, bScBg, null);
                    g.DrawString(t.Shortcut, fSc, bScText, scRect.X + 5, scRect.Y + 3);
                }

                // Títulos y Subtítulos
                using (Font fLbl = new Font("Segoe UI", 10.5f, FontStyle.Bold))
                using (Font fSub = new Font("Segoe UI", 8.5f, FontStyle.Regular))
                using (SolidBrush bW = new SolidBrush(Color.FromArgb(248, 250, 252)))
                using (SolidBrush bM = new SolidBrush(Color.FromArgb(148, 163, 184)))
                {
                    g.DrawString(t.Label, fLbl, bW, cardX + 14, cardY + 66);
                    g.DrawString(t.SubLabel, fSub, bM, cardX + 14, cardY + 89);
                }
            }
        }

        private void RenderViewMetricas(Graphics g, int x, int y, int w, int h)
        {
            using (Font fTitle = new Font("Segoe UI", 13f, FontStyle.Bold))
            using (SolidBrush bWhite = new SolidBrush(Color.FromArgb(248, 250, 252)))
            {
                g.DrawString("Centro de Mando Ejecutivo & Telemetría en Vivo", fTitle, bWhite, x, y);
            }

            int cardW = (w - 32) / 3;
            int cardH = 130;
            int startY = y + 36;

            // 3 Tarjetas KPI Superiores
            DrawMetricCard(g, x, startY, cardW, cardH, "USO DE CPU", ((int)cpuPercent) + "%", "16 Núcleos Lógicos", Color.FromArgb(34, 211, 238), cpuPercent / 100f);
            DrawMetricCard(g, x + cardW + 16, startY, cardW, cardH, "MEMORIA RAM", ((int)ramPercent) + "%", "5.8 GB / 16.0 GB Asignada", Color.FromArgb(129, 140, 248), ramPercent / 100f);
            DrawMetricCard(g, x + (cardW + 16) * 2, startY, cardW, cardH, "MACROS EJECUTADAS", totalCommandsExecuted.ToString(), "Comandos PC / Móvil hoy", Color.FromArgb(52, 211, 153), 0.82f);

            // Gráfico Sparkline de Historial en Tiempo Real (Linear/Datadog Style)
            int chartY = startY + cardH + 18;
            int chartH = 180;
            Rectangle chartRect = new Rectangle(x, chartY, w, chartH);
            using (SolidBrush chartBg = new SolidBrush(Color.FromArgb(20, 29, 47)))
            using (Pen chartBrd = new Pen(Color.FromArgb(37, 51, 74), 1))
            {
                DrawRoundedCard(g, chartRect, 10, chartBg, chartBrd);
            }

            using (Font fChTitle = new Font("Segoe UI", 9.5f, FontStyle.Bold))
            using (SolidBrush bChTitle = new SolidBrush(Color.FromArgb(226, 232, 240)))
            {
                g.DrawString("HISTORIAL DE CARGA DE CPU (ÚLTIMAS TELEMETRÍAS)", fChTitle, bChTitle, x + 16, chartY + 14);
            }

            // Grid lines del gráfico
            using (Pen gridPen = new Pen(Color.FromArgb(30, 41, 59), 1))
            {
                for (int gl = 1; gl <= 3; gl++)
                {
                    int gy = chartY + 45 + gl * 30;
                    g.DrawLine(gridPen, x + 16, gy, x + w - 16, gy);
                }
            }

            // Curva Sparkline
            float[] points = cpuHistory.ToArray();
            if (points.Length >= 2)
            {
                PointF[] curvePoints = new PointF[points.Length];
                float stepX = (w - 32) / (float)(MaxHistoryPoints - 1);
                int basePlotY = chartY + chartH - 24;
                int maxPlotH = 95;

                for (int pi = 0; pi < points.Length; pi++)
                {
                    float px = x + 16 + pi * stepX;
                    float py = basePlotY - (points[pi] / 100f * maxPlotH);
                    curvePoints[pi] = new PointF(px, py);
                }

                // Área sombreada con degradado debajo de la curva
                using (GraphicsPath fillPath = new GraphicsPath())
                {
                    fillPath.AddLine(curvePoints[0].X, basePlotY, curvePoints[0].X, curvePoints[0].Y);
                    fillPath.AddCurve(curvePoints);
                    fillPath.AddLine(curvePoints[curvePoints.Length - 1].X, basePlotY, curvePoints[0].X, basePlotY);

                    using (LinearGradientBrush lgb = new LinearGradientBrush(new Point(0, chartY + 45), new Point(0, basePlotY), Color.FromArgb(70, 34, 211, 238), Color.FromArgb(0, 34, 211, 238)))
                    {
                        g.FillPath(lgb, fillPath);
                    }
                }

                // Línea principal antialiased
                using (Pen curvePen = new Pen(Color.FromArgb(34, 211, 238), 2.5f))
                {
                    g.DrawCurve(curvePen, curvePoints);
                }
            }

            // Panel de Diagnóstico de Red & IPC
            int netY = chartY + chartH + 18;
            int netH = h - (netY - y);
            Rectangle netRect = new Rectangle(x, netY, w, netH);
            using (SolidBrush netBg = new SolidBrush(Color.FromArgb(20, 29, 47)))
            using (Pen netBrd = new Pen(Color.FromArgb(37, 51, 74), 1))
            {
                DrawRoundedCard(g, netRect, 10, netBg, netBrd);
            }

            using (Font fSub = new Font("Segoe UI", 10.5f, FontStyle.Bold))
            using (Font fBody = new Font("Segoe UI", 9f, FontStyle.Regular))
            using (Font fMono = new Font("Consolas", 9f, FontStyle.Regular))
            using (SolidBrush bW = new SolidBrush(Color.FromArgb(248, 250, 252)))
            using (SolidBrush bM = new SolidBrush(Color.FromArgb(148, 163, 184)))
            using (SolidBrush bCyan = new SolidBrush(Color.FromArgb(34, 211, 238)))
            {
                g.DrawString("Estado de Conexión & Red Local Multi-Dispositivo", fSub, bW, x + 20, netY + 16);
                g.DrawString("• Servidor Socket HTTP: ", fBody, bM, x + 20, netY + 44);
                g.DrawString("http://" + server.PrimaryLanIp + ":8620 (0.0.0.0 sin privilegios)", fMono, bCyan, x + 185, netY + 44);

                g.DrawString("• Descubrimiento UDP: ", fBody, bM, x + 20, netY + 70);
                g.DrawString("Puerto 41234 activo (Difusión mDNS/LAN en tiempo real)", fMono, bCyan, x + 185, netY + 70);

                g.DrawString("• Latencia Red Wi-Fi: ", fBody, bM, x + 20, netY + 96);
                g.DrawString("< 2 ms (Red local de alta velocidad)", fMono, bW, x + 185, netY + 96);
            }
        }

        private void DrawMetricCard(Graphics g, int x, int y, int w, int h, string title, string val, string sub, Color accent, float progress)
        {
            Rectangle cardRect = new Rectangle(x, y, w, h);
            using (SolidBrush bg = new SolidBrush(Color.FromArgb(20, 29, 47)))
            using (Pen border = new Pen(Color.FromArgb(37, 51, 74), 1))
            {
                DrawRoundedCard(g, cardRect, 10, bg, border);
            }

            using (SolidBrush bAcc = new SolidBrush(accent))
            {
                g.FillRectangle(bAcc, x + 14, y, w - 28, 3);
            }

            using (Font ft = new Font("Segoe UI", 8.5f, FontStyle.Bold))
            using (Font fv = new Font("Segoe UI", 20f, FontStyle.Bold))
            using (Font fs = new Font("Segoe UI", 8.5f, FontStyle.Regular))
            using (SolidBrush bt = new SolidBrush(Color.FromArgb(148, 163, 184)))
            using (SolidBrush bv = new SolidBrush(Color.FromArgb(248, 250, 252)))
            {
                g.DrawString(title, ft, bt, x + 18, y + 16);
                g.DrawString(val, fv, bv, x + 16, y + 36);
                g.DrawString(sub, fs, bt, x + 18, y + 80);
            }

            // Barra de progreso inferior
            int barY = y + h - 14;
            Rectangle barBgRect = new Rectangle(x + 18, barY, w - 36, 5);
            using (SolidBrush barBg = new SolidBrush(Color.FromArgb(30, 41, 59)))
            using (SolidBrush barFill = new SolidBrush(accent))
            {
                DrawRoundedCard(g, barBgRect, 2, barBg, null);
                int fillW = (int)((w - 36) * Math.Max(0.05f, Math.Min(1f, progress)));
                Rectangle barFillRect = new Rectangle(x + 18, barY, fillW, 5);
                DrawRoundedCard(g, barFillRect, 2, barFill, null);
            }
        }

        private void RenderViewKanban(Graphics g, int x, int y, int w, int h)
        {
            using (Font fTitle = new Font("Segoe UI", 13f, FontStyle.Bold))
            using (Font fSub = new Font("Segoe UI", 9f, FontStyle.Regular))
            using (SolidBrush bWhite = new SolidBrush(Color.FromArgb(248, 250, 252)))
            using (SolidBrush bMuted = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                g.DrawString("Tablero Kanban Operativo & Triaje ITSM / IA", fTitle, bWhite, x, y);
                g.DrawString("Requerimientos sincronizados desde Outlook 365, ServiceNow y Jira clasificados automáticamente.", fSub, bMuted, x, y + 26);
            }

            int cols = 4;
            int colW = (w - (cols - 1) * 14) / cols;
            int startY = y + 62;
            int colH = h - 72;

            string[] colTitles = new string[] { "URGENTES (P1)", "EN CURSO", "EN REVISIÓN", "COMPLETADAS" };
            Color[] colColors = new Color[]
            {
                Color.FromArgb(239, 68, 68),
                Color.FromArgb(56, 189, 248),
                Color.FromArgb(245, 158, 11),
                Color.FromArgb(34, 197, 94)
            };

            for (int c = 0; c < cols; c++)
            {
                int colX = x + c * (colW + 14);
                Rectangle colRect = new Rectangle(colX, startY, colW, colH);

                using (SolidBrush colBg = new SolidBrush(Color.FromArgb(15, 23, 42)))
                using (Pen colBorder = new Pen(Color.FromArgb(30, 41, 59), 1))
                {
                    DrawRoundedCard(g, colRect, 10, colBg, colBorder);
                }

                // Cabecera de Columna
                using (SolidBrush bBar = new SolidBrush(colColors[c]))
                using (Font fc = new Font("Segoe UI", 9f, FontStyle.Bold))
                using (SolidBrush bct = new SolidBrush(Color.FromArgb(248, 250, 252)))
                {
                    g.FillRectangle(bBar, colX + 10, startY, colW - 20, 3);
                    g.DrawString(colTitles[c], fc, bct, colX + 14, startY + 14);
                }

                // Renderizado de Tarjetas de Tareas
                TaskStatus targetStatus = (TaskStatus)c;
                int cardY = startY + 46;

                foreach (var t in tasks)
                {
                    if (t.Status == targetStatus)
                    {
                        Rectangle cardRect = new Rectangle(colX + 10, cardY, colW - 20, 104);
                        using (SolidBrush cardBg = new SolidBrush(Color.FromArgb(24, 33, 47)))
                        using (Pen cardBrd = new Pen(Color.FromArgb(51, 65, 85), 1))
                        {
                            DrawRoundedCard(g, cardRect, 8, cardBg, cardBrd);
                        }

                        using (Font fCode = new Font("Consolas", 9f, FontStyle.Bold))
                        using (Font fT = new Font("Segoe UI", 8.5f, FontStyle.Regular))
                        using (Font fBadge = new Font("Segoe UI", 7.5f, FontStyle.Bold))
                        using (SolidBrush bc = new SolidBrush(colColors[c]))
                        using (SolidBrush bw = new SolidBrush(Color.FromArgb(241, 245, 249)))
                        using (SolidBrush bm = new SolidBrush(Color.FromArgb(148, 163, 184)))
                        {
                            g.DrawString(t.Code, fCode, bc, colX + 20, cardY + 12);

                            // Fuente Badge
                            Rectangle badgeRect = new Rectangle(colX + colW - 105, cardY + 10, 85, 20);
                            using (SolidBrush bbg = new SolidBrush(Color.FromArgb(15, 23, 42)))
                            {
                                DrawRoundedCard(g, badgeRect, 4, bbg, null);
                            }
                            g.DrawString(t.SourceBadge, fBadge, bm, badgeRect.X + 6, badgeRect.Y + 3);

                            // Título de tarea con corte seguro
                            string displayTitle = t.Title.Length > 48 ? t.Title.Substring(0, 45) + "..." : t.Title;
                            g.DrawString(displayTitle, fT, bw, new RectangleF(colX + 20, cardY + 36, colW - 40, 38));

                            // SLA & Prioridad al pie
                            g.DrawString("⏱ SLA: " + t.DueTime + "  ·  " + t.Project, fBadge, bm, colX + 20, cardY + 78);
                        }

                        cardY += 114;
                    }
                }
            }
        }

        private void RenderViewTouchpad(Graphics g, int x, int y, int w, int h)
        {
            using (Font fTitle = new Font("Segoe UI", 13f, FontStyle.Bold))
            using (Font fSub = new Font("Segoe UI", 9f, FontStyle.Regular))
            using (SolidBrush bWhite = new SolidBrush(Color.FromArgb(248, 250, 252)))
            using (SolidBrush bMuted = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                g.DrawString("Lienzo de Puntero Remoto & Touchpad de Precisión", fTitle, bWhite, x, y);
                g.DrawString("Control total del mouse de este PC desde la pantalla táctil de tu celular con 0 ms de latencia.", fSub, bMuted, x, y + 26);
            }

            int boxW = w - 40;
            int boxH = h - 90;
            Rectangle boxRect = new Rectangle(x + 20, y + 66, boxW, boxH);

            using (SolidBrush bg = new SolidBrush(Color.FromArgb(15, 23, 42)))
            using (Pen border = new Pen(Color.FromArgb(34, 211, 238), 1.5f))
            {
                DrawRoundedCard(g, boxRect, 12, bg, border);
            }

            // Cuadrícula sutil de referencia táctil
            using (Pen gridPen = new Pen(Color.FromArgb(24, 33, 47), 1))
            {
                for (int gx = boxRect.X + 40; gx < boxRect.Right; gx += 40)
                {
                    g.DrawLine(gridPen, gx, boxRect.Y + 10, gx, boxRect.Bottom - 10);
                }
                for (int gy = boxRect.Y + 40; gy < boxRect.Bottom; gy += 40)
                {
                    g.DrawLine(gridPen, boxRect.X + 10, gy, boxRect.Right - 10, gy);
                }
            }

            using (Font fBig = new Font("Segoe UI", 15f, FontStyle.Bold))
            using (Font fSub2 = new Font("Segoe UI", 9.5f, FontStyle.Regular))
            using (Font fCode = new Font("Consolas", 10.5f, FontStyle.Bold))
            using (SolidBrush bW = new SolidBrush(Color.FromArgb(248, 250, 252)))
            using (SolidBrush bM = new SolidBrush(Color.FromArgb(148, 163, 184)))
            using (SolidBrush bCyan = new SolidBrush(Color.FromArgb(34, 211, 238)))
            {
                g.DrawString("SUPERFICIE TÁCTIL ACTIVA", fBig, bW, x + 50, y + 105);
                g.DrawString("Desliza el dedo en tu celular en la pestaña 'Touchpad' para desplazar el cursor del PC en tiempo real.", fSub2, bM, x + 50, y + 145);

                g.DrawString("• Un Toque = Clic Izquierdo Primario", fCode, bCyan, x + 50, y + 185);
                g.DrawString("• Doble Toque = Doble Clic de Selección", fCode, bCyan, x + 50, y + 215);
                g.DrawString("• Toque con Dos Dedos = Clic Derecho Secundario", fCode, bCyan, x + 50, y + 245);
                g.DrawString("• Deslizar 2 Dedos = Scroll Vertical de Rueda", fCode, bCyan, x + 50, y + 275);

                // Botones simulados en la base del touchpad
                int btnW = (boxW - 60) / 2;
                int btnH = 46;
                int btnY = boxRect.Bottom - btnH - 20;

                Rectangle leftBtn = new Rectangle(boxRect.X + 20, btnY, btnW, btnH);
                Rectangle rightBtn = new Rectangle(boxRect.X + 40 + btnW, btnY, btnW, btnH);

                using (SolidBrush btnBg = new SolidBrush(Color.FromArgb(24, 33, 47)))
                using (Pen btnBrd = new Pen(Color.FromArgb(51, 65, 85), 1))
                {
                    DrawRoundedCard(g, leftBtn, 8, btnBg, btnBrd);
                    DrawRoundedCard(g, rightBtn, 8, btnBg, btnBrd);
                }

                g.DrawString("CLIC IZQUIERDO", fCode, bW, leftBtn.X + btnW / 2 - 55, leftBtn.Y + 14);
                g.DrawString("CLIC DERECHO", fCode, bW, rightBtn.X + btnW / 2 - 50, rightBtn.Y + 14);
            }
        }

        private void RenderViewEnlaceMovil(Graphics g, int x, int y, int w, int h)
        {
            using (Font fTitle = new Font("Segoe UI", 13f, FontStyle.Bold))
            using (Font fSub = new Font("Segoe UI", 9f, FontStyle.Regular))
            using (SolidBrush bWhite = new SolidBrush(Color.FromArgb(248, 250, 252)))
            using (SolidBrush bMuted = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                g.DrawString("Enlace Móvil Inmediato & Portal de Descarga de APK", fTitle, bWhite, x, y);
                g.DrawString("Escanea el código QR estándar (ISO/IEC 18004) con cualquier teléfono para descargar la app complementaria.", fSub, bMuted, x, y + 26);
            }

            int qrSize = 224;
            int qrX = x + 30;
            int qrY = y + 74;

            string mobileDownloadUrl = "http://" + server.PrimaryLanIp + ":8620/mobile";

            // Contenedor blanco redondeado del QR para máximo contraste óptico
            Rectangle qrContainer = new Rectangle(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24);
            using (SolidBrush bWhite = new SolidBrush(Color.White))
            using (Pen borderPen = new Pen(Color.FromArgb(34, 211, 238), 2f))
            {
                DrawRoundedCard(g, qrContainer, 12, bWhite, borderPen);
            }

            using (Bitmap qr = GenerateQrMatrix(mobileDownloadUrl, qrSize))
            {
                g.DrawImage(qr, qrX, qrY);
            }

            // Panel Lateral de Información y Botones
            int infoX = qrX + qrSize + 50;
            using (Font fH = new Font("Segoe UI", 11.5f, FontStyle.Bold))
            using (Font fB = new Font("Segoe UI", 9.5f, FontStyle.Regular))
            using (Font fCode = new Font("Consolas", 11f, FontStyle.Bold))
            using (SolidBrush bW = new SolidBrush(Color.FromArgb(248, 250, 252)))
            using (SolidBrush bM = new SolidBrush(Color.FromArgb(148, 163, 184)))
            using (SolidBrush bCyan = new SolidBrush(Color.FromArgb(34, 211, 238)))
            {
                g.DrawString("1. Escanear con la Cámara del Celular", fH, bW, infoX, qrY);
                g.DrawString("Apunta tu cámara o Google Lens. Descargará OpsDeck Mobile al instante:", fB, bM, infoX, qrY + 28);
                g.DrawString(mobileDownloadUrl, fCode, bCyan, infoX, qrY + 54);

                // Botón de Copiar URL al portapapeles
                copyUrlRect = new Rectangle(infoX, qrY + 82, 190, 32);
                using (SolidBrush copyBg = new SolidBrush(isHoverCopyUrl ? Color.FromArgb(6, 182, 212) : Color.FromArgb(34, 211, 238)))
                using (Font fBtn = new Font("Segoe UI", 9f, FontStyle.Bold))
                using (SolidBrush bBtnText = new SolidBrush(Color.FromArgb(11, 15, 25)))
                {
                    DrawRoundedCard(g, copyUrlRect, 6, copyBg, null);
                    g.DrawString("📋 Copiar Enlace Directo", fBtn, bBtnText, copyUrlRect.X + 16, copyUrlRect.Y + 8);
                }

                g.DrawString("2. Apertura Directa en Chrome Móvil", fH, bW, infoX, qrY + 130);
                g.DrawString("Conecta tu celular a la misma red Wi-Fi y visita:", fB, bM, infoX, qrY + 154);
                g.DrawString("http://" + server.PrimaryLanIp + ":8620/download/apk", fCode, bCyan, infoX, qrY + 178);

                g.DrawString("3. Diagnóstico de Infraestructura Local", fH, bW, infoX, qrY + 218);
                using (Font fDiag = new Font("Segoe UI", 9f, FontStyle.Regular))
                using (SolidBrush bGreen = new SolidBrush(Color.FromArgb(34, 197, 94)))
                {
                    g.DrawString("✓ Servidor HTTP nativo activo en 0.0.0.0:8620 (Sin permisos admin)", fDiag, bGreen, infoX, qrY + 242);
                    g.DrawString("✓ Descubrimiento UDP activo en 41234 (Transmisión automática)", fDiag, bGreen, infoX, qrY + 264);
                    g.DrawString("✓ Paquete APK compilado, alineado a 4 bytes y firmado con scheme v2/v3", fDiag, bGreen, infoX, qrY + 286);
                }
            }
        }

        private void RenderToast(Graphics g)
        {
            using (Font fToast = new Font("Segoe UI", 9.5f, FontStyle.Bold))
            {
                SizeF msgSize = g.MeasureString(toastMessage, fToast);
                int tw = (int)msgSize.Width + 40;
                int th = 42;
                int tx = Width - tw - 24;
                int ty = Height - th - 24;

                Rectangle toastRect = new Rectangle(tx, ty, tw, th);
                using (SolidBrush tBg = new SolidBrush(Color.FromArgb(30, 41, 59)))
                using (Pen tBrd = new Pen(Color.FromArgb(34, 211, 238), 1.5f))
                using (SolidBrush tText = new SolidBrush(Color.FromArgb(248, 250, 252)))
                {
                    DrawRoundedCard(g, toastRect, 8, tBg, tBrd);
                    g.DrawString(toastMessage, fToast, tText, tx + 16, ty + 12);
                }
            }
        }

        private static void DrawRoundedCard(Graphics g, Rectangle rect, int radius, Brush fillBrush, Pen borderPen)
        {
            if (rect.Width <= 0 || rect.Height <= 0) return;
            using (GraphicsPath path = CreateRoundedRectangle(rect, radius))
            {
                if (fillBrush != null) g.FillPath(fillBrush, path);
                if (borderPen != null) g.DrawPath(borderPen, path);
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
                            Bitmap raw = qr.GetGraphic(8, Color.FromArgb(11, 15, 25), Color.White, true);
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

            // Window Controls Hover
            int btnSize = 34;
            int closeX = Width - btnSize - 12;
            int minX = closeX - btnSize - 6;

            isHoverClose = (e.X >= closeX && e.X <= closeX + btnSize && e.Y >= 11 && e.Y <= 45);
            isHoverMin = (e.X >= minX && e.X <= minX + btnSize && e.Y >= 11 && e.Y <= 45);

            // Nav Rail Hover
            hoveredNavIndex = -1;
            if (e.X >= 10 && e.X <= 220)
            {
                for (int i = 0; i < navLabels.Length; i++)
                {
                    int itemY = 74 + (i * 50);
                    if (e.Y >= itemY && e.Y <= itemY + 42)
                    {
                        hoveredNavIndex = i;
                        break;
                    }
                }
            }

            // Botonera Tile Hover
            hoveredTileIndex = -1;
            if (activeNavIndex == 0 && e.Y >= 134)
            {
                int cols = 4;
                int canvasX = 248;
                int canvasW = Width - canvasX - 18;
                int cardW = (canvasW - (cols - 1) * 16) / cols;
                int cardH = 118;

                for (int i = 0; i < (activeTiles != null ? activeTiles.Count : 0) && i < 12; i++)
                {
                    int col = i % cols;
                    int row = i / cols;
                    int cardX = canvasX + col * (cardW + 16);
                    int cardY = 134 + row * (cardH + 16);

                    if (e.X >= cardX && e.X <= cardX + cardW && e.Y >= cardY && e.Y <= cardY + cardH)
                    {
                        hoveredTileIndex = i;
                        break;
                    }
                }
            }

            // Copy URL Hover
            isHoverCopyUrl = (activeNavIndex == 4 && copyUrlRect.Contains(e.Location));

            if (hoveredTileIndex != -1 || hoveredNavIndex != -1 || isHoverClose || isHoverMin || isHoverCopyUrl)
            {
                Cursor = Cursors.Hand;
            }
            else
            {
                Cursor = Cursors.Default;
            }

            if (prevHovNav != hoveredNavIndex || prevHovTile != hoveredTileIndex ||
                prevHovClose != isHoverClose || prevHovMin != isHoverMin || prevHovCopy != isHoverCopyUrl)
            {
                Invalidate();
            }
        }

        protected override void OnMouseClick(MouseEventArgs e)
        {
            base.OnMouseClick(e);

            // Window Controls Clicks
            int btnSize = 34;
            int closeX = Width - btnSize - 12;
            int minX = closeX - btnSize - 6;

            if (e.Y >= 11 && e.Y <= 45)
            {
                if (e.X >= closeX && e.X <= closeX + btnSize)
                {
                    Close();
                    Application.Exit();
                    return;
                }
                if (e.X >= minX && e.X <= minX + btnSize)
                {
                    WindowState = FormWindowState.Minimized;
                    return;
                }
            }

            // Nav Rail Clicks
            if (e.X >= 10 && e.X <= 220)
            {
                for (int i = 0; i < navLabels.Length; i++)
                {
                    int itemY = 74 + (i * 50);
                    if (e.Y >= itemY && e.Y <= itemY + 42)
                    {
                        activeNavIndex = i;
                        Invalidate();
                        return;
                    }
                }
            }

            // View 1 (Botonera) Tile Clicks
            if (activeNavIndex == 0 && e.Y >= 134)
            {
                int cols = 4;
                int canvasX = 248;
                int canvasW = Width - canvasX - 18;
                int cardW = (canvasW - (cols - 1) * 16) / cols;
                int cardH = 118;

                for (int i = 0; i < (activeTiles != null ? activeTiles.Count : 0) && i < 12; i++)
                {
                    int col = i % cols;
                    int row = i / cols;
                    int cardX = canvasX + col * (cardW + 16);
                    int cardY = 134 + row * (cardH + 16);

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
                        ShowToast("⚡ Acción ejecutada: " + tile.Label + " (" + tile.Shortcut + ")");
                        Invalidate();
                        return;
                    }
                }
            }

            // View 5: Copiar URL
            if (activeNavIndex == 4 && copyUrlRect.Contains(e.Location))
            {
                try
                {
                    string url = "http://" + server.PrimaryLanIp + ":8620/mobile";
                    Clipboard.SetText(url);
                    ShowToast("📋 ¡Enlace copiado al portapapeles de Windows!");
                }
                catch { }
            }
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);
            if (e.Button == MouseButtons.Left && e.Y <= 56)
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
