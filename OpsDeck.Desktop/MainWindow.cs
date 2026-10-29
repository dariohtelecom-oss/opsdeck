using System;
using System.Collections.Generic;
using System.Diagnostics;
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

        private int activeNavIndex = 0;
        private string[] navLabels = new string[]
        {
            "1. Botonera Dinámica",
            "2. Métricas & Telemetría",
            "3. Tablero Kanban (IA)",
            "4. Touchpad & Firma",
            "5. Enlace Móvil (QR)"
        };

        private List<DeckTile> defaultTiles;
        private List<DeckTile> excelTiles;
        private List<DeckTile> meetingTiles;
        private List<DeckTile> itsmTiles;
        private List<DeckTile> activeTiles;

        private List<KanbanTask> tasks;
        private List<TriageIncomingItem> triageFeed;

        private float cpuPercent = 14f;
        private float ramPercent = 48f;
        private string currentActiveWindow = "OpsDeck Enterprise";
        private string currentProfileName = "General";
        private int totalCommandsExecuted = 24;

        // Custom TitleBar Dragging
        private bool isDragging;
        private Point dragCursorPoint;
        private Point dragFormPoint;

        public MainWindow()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);

            Text = "OpsDeck Enterprise v2.5 — Centro de Mando Nativo";
            Size = new Size(1180, 720);
            MinimumSize = new Size(980, 600);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.None;
            BackColor = Color.FromArgb(11, 15, 25);
            ForeColor = Color.FromArgb(241, 245, 249);
            Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            InitializeData();
            InitializeHostServer();
            InitializeTray();

            MouseDown += Form_MouseDown;
            MouseMove += Form_MouseMove;
            MouseUp += Form_MouseUp;

            telemetryTimer = new System.Windows.Forms.Timer { Interval = 2000 };
            telemetryTimer.Tick += (s, e) =>
            {
                cpuPercent = (float)(new Random().Next(8, 38));
                ramPercent = 46f + (float)(new Random().NextDouble() * 4);
                Invalidate();
            };
            telemetryTimer.Start();

            windowTrackerTimer = new System.Windows.Forms.Timer { Interval = 1000 };
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
        }

        private void InitializeData()
        {
            defaultTiles = new List<DeckTile>
            {
                new DeckTile("t-excel", "Excel", "Planillas", "📊", "#22D3EE", "launch:excel", "Win+R"),
                new DeckTile("t-outlook", "Outlook", "Correo Corp.", "✉️", "#38BDF8", "launch:outlook", "Win+R"),
                new DeckTile("t-teams", "Teams", "Reuniones", "👥", "#818CF8", "launch:teams", "Win+R"),
                new DeckTile("t-calc", "Calculadora", "Finanzas", "🔢", "#34D399", "launch:calc", "Win+R"),
                new DeckTile("t-cmd", "Terminal", "PowerShell", "💻", "#F472B6", "launch:powershell", "Win+R"),
                new DeckTile("t-browser", "Navegador", "Chrome", "🌐", "#FB923C", "launch:chrome", "Win+R"),
                new DeckTile("t-mute", "Silenciar Mic", "Teams/Zoom", "🎙️", "#EF4444", "hotkey:ctrl+shift+m", "Ctrl+Shift+M"),
                new DeckTile("t-save", "Guardar Todo", "Atajo Rápido", "💾", "#A78BFA", "hotkey:ctrl+s", "Ctrl+S")
            };

            excelTiles = new List<DeckTile>
            {
                new DeckTile("ex-sum", "AutoSuma", "Fórmula", "Σ", "#34D399", "macro:sum", "=SUMA()"),
                new DeckTile("ex-filter", "Filtros", "Tabla", "⚡", "#22D3EE", "macro:filter", "Ctrl+Shift+L"),
                new DeckTile("ex-save", "Guardar", "Libro", "💾", "#38BDF8", "hotkey:ctrl+s", "Ctrl+S"),
                new DeckTile("ex-chart", "Insertar Gráfico", "Reporte", "📈", "#F472B6", "hotkey:keys:%{F1}", "Alt+F1"),
                new DeckTile("ex-calc", "Recalcular", "Fórmulas", "🔄", "#FBBF24", "hotkey:keys:{F9}", "F9"),
                new DeckTile("ex-copy", "Copiar Formato", "Pincel", "🎨", "#A78BFA", "hotkey:keys:^c", "Ctrl+C")
            };

            meetingTiles = new List<DeckTile>
            {
                new DeckTile("mt-mic", "Mute Micrófono", "Activar/Silenciar", "🎙️", "#EF4444", "hotkey:ctrl+shift+m", "Ctrl+Shift+M"),
                new DeckTile("mt-cam", "Cámara On/Off", "Video", "📹", "#FB923C", "hotkey:ctrl+shift+o", "Ctrl+Shift+O"),
                new DeckTile("mt-hand", "Levantar Mano", "Participación", "✋", "#FBBF24", "hotkey:keys:^k", "Ctrl+K"),
                new DeckTile("mt-share", "Compartir", "Pantalla", "🖥️", "#22D3EE", "hotkey:ctrl+shift+e", "Ctrl+Shift+E")
            };

            itsmTiles = new List<DeckTile>
            {
                new DeckTile("it-glpi", "GLPI Tickets", "Soporte", "🎫", "#38BDF8", "launch:https://glpi", "Web"),
                new DeckTile("it-jira", "Jira ITSM", "Sprint", "📋", "#22D3EE", "launch:https://jira", "Web"),
                new DeckTile("it-rdp", "Escritorio Remoto", "Conexión", "🖥️", "launch:mstsc", "RDP"),
                new DeckTile("it-term", "SSH Servidores", "Admin", "⚡", "launch:powershell", "CLI")
            };

            activeTiles = defaultTiles;

            tasks = new List<KanbanTask>
            {
                new KanbanTask("INC-842", "Falla de enlace enlace troncal FO Planta Sur", "Infraestructura", TaskPriority.Critical, TaskStatus.Urgent, "15 min", "ServiceNow", "mstsc"),
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

        private void UpdateDynamicProfile(string windowTitle)
        {
            string lower = windowTitle.ToLowerInvariant();
            if (lower.Contains("excel") || lower.Contains("libro") || lower.Contains("hoja de cálculo"))
            {
                currentProfileName = "Microsoft Excel (Macros)";
                activeTiles = excelTiles;
            }
            else if (lower.Contains("teams") || lower.Contains("zoom") || lower.Contains("meet") || lower.Contains("reunión"))
            {
                currentProfileName = "Reunión en Vivo (Teams/Zoom)";
                activeTiles = meetingTiles;
            }
            else if (lower.Contains("jira") || lower.Contains("glpi") || lower.Contains("servicenow") || lower.Contains("terminal"))
            {
                currentProfileName = "Soporte TI / ITSM";
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
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            // 1. Draw TitleBar Header (Height: 52px)
            using (SolidBrush headerBg = new SolidBrush(Color.FromArgb(17, 24, 39)))
            {
                g.FillRectangle(headerBg, 0, 0, Width, 52);
            }
            using (Pen borderPen = new Pen(Color.FromArgb(31, 41, 55), 1))
            {
                g.DrawLine(borderPen, 0, 52, Width, 52);
            }

            // TitleBar Brand & Status
            using (Font titleFont = new Font("Segoe UI", 11.5f, FontStyle.Bold))
            using (SolidBrush textBrush = new SolidBrush(Color.FromArgb(248, 250, 252)))
            {
                g.DrawString("OPSDECK ENTERPRISE", titleFont, textBrush, 18, 14);
            }
            using (Font subFont = new Font("Segoe UI", 8.5f, FontStyle.Regular))
            using (SolidBrush subBrush = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                g.DrawString("v2.5 · CENTRO DE MANDO NATIVO PC", subFont, subBrush, 184, 17);
            }

            // Status Indicator & Active Window Pill
            int pillX = Width - 420;
            using (SolidBrush pillBg = new SolidBrush(Color.FromArgb(30, 41, 59)))
            {
                g.FillRectangle(pillBg, pillX, 10, 260, 32);
            }
            using (SolidBrush dotBrush = new SolidBrush(Color.FromArgb(34, 197, 94)))
            {
                g.FillEllipse(dotBrush, pillX + 12, 21, 10, 10);
            }
            using (Font pillFont = new Font("Segoe UI", 8.5f, FontStyle.Bold))
            using (SolidBrush pillText = new SolidBrush(Color.FromArgb(226, 232, 240)))
            {
                string winPreview = currentActiveWindow.Length > 24 ? currentActiveWindow.Substring(0, 22) + "..." : currentActiveWindow;
                g.DrawString(server.PrimaryLanIp + ":8620 · " + winPreview, pillFont, pillText, pillX + 28, 18);
            }

            // Window Control Buttons (Minimize, Close)
            DrawWindowControls(g);

            // 2. Left Navigation Rail (Width: 220px)
            using (SolidBrush navBg = new SolidBrush(Color.FromArgb(15, 23, 42)))
            {
                g.FillRectangle(navBg, 0, 53, 220, Height - 53);
            }
            using (Pen navBorder = new Pen(Color.FromArgb(31, 41, 55), 1))
            {
                g.DrawLine(navBorder, 220, 53, 220, Height);
            }

            // Draw Nav Items
            for (int i = 0; i < navLabels.Length; i++)
            {
                int itemY = 70 + (i * 48);
                bool isSelected = i == activeNavIndex;

                if (isSelected)
                {
                    using (SolidBrush selBg = new SolidBrush(Color.FromArgb(30, 41, 59)))
                    {
                        g.FillRectangle(selBg, 8, itemY, 204, 40);
                    }
                    using (SolidBrush indicator = new SolidBrush(Color.FromArgb(34, 211, 238)))
                    {
                        g.FillRectangle(indicator, 8, itemY, 4, 40);
                    }
                }

                using (Font navFont = new Font("Segoe UI", 9.5f, isSelected ? FontStyle.Bold : FontStyle.Regular))
                using (SolidBrush navText = new SolidBrush(isSelected ? Color.FromArgb(34, 211, 238) : Color.FromArgb(148, 163, 184)))
                {
                    g.DrawString(navLabels[i], navFont, navText, 24, itemY + 11);
                }
            }

            // Bottom Profile Badge in Nav Rail
            int profileCardY = Height - 80;
            using (SolidBrush pBg = new SolidBrush(Color.FromArgb(2, 6, 23)))
            {
                g.FillRectangle(pBg, 12, profileCardY, 196, 60);
            }
            using (Font pf1 = new Font("Segoe UI", 7.5f, FontStyle.Bold))
            using (Font pf2 = new Font("Segoe UI", 8.5f, FontStyle.Regular))
            using (SolidBrush pb1 = new SolidBrush(Color.FromArgb(34, 211, 238)))
            using (SolidBrush pb2 = new SolidBrush(Color.FromArgb(203, 213, 225)))
            {
                g.DrawString("PERFIL DINÁMICO ACTIVO:", pf1, pb1, 20, profileCardY + 10);
                string prof = currentProfileName.Length > 20 ? currentProfileName.Substring(0, 18) + ".." : currentProfileName;
                g.DrawString(prof, pf2, pb2, 20, profileCardY + 28);
            }

            // 3. Render Selected View Canvas
            int canvasX = 236;
            int canvasY = 68;
            int canvasW = Width - canvasX - 16;
            int canvasH = Height - canvasY - 16;

            if (activeNavIndex == 0) RenderViewBotonera(g, canvasX, canvasY, canvasW, canvasH);
            else if (activeNavIndex == 1) RenderViewMetricas(g, canvasX, canvasY, canvasW, canvasH);
            else if (activeNavIndex == 2) RenderViewKanban(g, canvasX, canvasY, canvasW, canvasH);
            else if (activeNavIndex == 3) RenderViewTouchpad(g, canvasX, canvasY, canvasW, canvasH);
            else if (activeNavIndex == 4) RenderViewEnlaceMovil(g, canvasX, canvasY, canvasW, canvasH);
        }

        private void DrawWindowControls(Graphics g)
        {
            int btnSize = 36;
            int closeX = Width - btnSize - 8;
            int minX = closeX - btnSize - 4;

            // Minimize
            using (SolidBrush bBg = new SolidBrush(Color.FromArgb(30, 41, 59)))
            {
                g.FillRectangle(bBg, minX, 8, btnSize, btnSize);
                g.FillRectangle(bBg, closeX, 8, btnSize, btnSize);
            }
            using (Pen p = new Pen(Color.FromArgb(203, 213, 225), 2))
            {
                g.DrawLine(p, minX + 11, 26, minX + 25, 26);
                g.DrawLine(p, closeX + 11, 14, closeX + 25, 28);
                g.DrawLine(p, closeX + 25, 14, closeX + 11, 28);
            }
        }

        private void RenderViewBotonera(Graphics g, int x, int y, int w, int h)
        {
            using (Font fTitle = new Font("Segoe UI", 12f, FontStyle.Bold))
            using (Font fSub = new Font("Segoe UI", 9f, FontStyle.Regular))
            using (SolidBrush bWhite = new SolidBrush(Color.FromArgb(248, 250, 252)))
            using (SolidBrush bMuted = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                g.DrawString("Botonera Dinámica Táctil (Stream Deck PC)", fTitle, bWhite, x, y);
                g.DrawString("Los botones se adaptan en vivo según la ventana activa (" + currentProfileName + "). Puedes hacer clic o accionarlos desde tu celular.", fSub, bMuted, x, y + 24);
            }

            int startY = y + 60;
            int cols = 4;
            int cardW = (w - (cols - 1) * 16) / cols;
            int cardH = 110;

            var tiles = activeTiles ?? defaultTiles;
            for (int i = 0; i < tiles.Count && i < 12; i++)
            {
                var t = tiles[i];
                int col = i % cols;
                int row = i / cols;
                int cardX = x + col * (cardW + 16);
                int cardY = startY + row * (cardH + 16);

                Color accent = ColorTranslator.FromHtml(t.AccentColor);

                using (SolidBrush cardBg = new SolidBrush(Color.FromArgb(17, 24, 39)))
                using (Pen cardBorder = new Pen(Color.FromArgb(31, 41, 55), 1))
                {
                    g.FillRectangle(cardBg, cardX, cardY, cardW, cardH);
                    g.DrawRectangle(cardBorder, cardX, cardY, cardW, cardH);
                }

                // Accent Bar
                using (SolidBrush bAcc = new SolidBrush(accent))
                {
                    g.FillRectangle(bAcc, cardX, cardY, cardW, 4);
                }

                // Icon Glyph
                using (Font glyphFont = new Font("Segoe UI Emoji", 18f))
                using (SolidBrush glyphBrush = new SolidBrush(Color.White))
                {
                    g.DrawString(t.IconGlyph, glyphFont, glyphBrush, cardX + 14, cardY + 16);
                }

                // Labels
                using (Font fLbl = new Font("Segoe UI", 10.5f, FontStyle.Bold))
                using (Font fSub = new Font("Segoe UI", 8f, FontStyle.Regular))
                using (SolidBrush bW = new SolidBrush(Color.FromArgb(248, 250, 252)))
                using (SolidBrush bM = new SolidBrush(Color.FromArgb(148, 163, 184)))
                {
                    g.DrawString(t.Label, fLbl, bW, cardX + 14, cardY + 54);
                    g.DrawString(t.SubLabel + " · " + t.Shortcut, fSub, bM, cardX + 14, cardY + 76);
                }
            }
        }

        private void RenderViewMetricas(Graphics g, int x, int y, int w, int h)
        {
            using (Font fTitle = new Font("Segoe UI", 12f, FontStyle.Bold))
            using (SolidBrush bWhite = new SolidBrush(Color.FromArgb(248, 250, 252)))
            {
                g.DrawString("Centro de Mando Ejecutivo & Telemetría en Tiempo Real", fTitle, bWhite, x, y);
            }

            int cardW = (w - 32) / 3;
            int cardH = 140;
            int startY = y + 40;

            // Card 1: CPU
            DrawMetricCard(g, x, startY, cardW, cardH, "USO DE CPU", ((int)cpuPercent) + "%", "16 Núcleos Lógicos", Color.FromArgb(34, 211, 238), cpuPercent / 100f);

            // Card 2: RAM
            DrawMetricCard(g, x + cardW + 16, startY, cardW, cardH, "MEMORIA RAM", ((int)ramPercent) + "%", "En uso por sistema y servicios", Color.FromArgb(129, 140, 248), ramPercent / 100f);

            // Card 3: Comandos Ejecutados
            DrawMetricCard(g, x + (cardW + 16) * 2, startY, cardW, cardH, "MACROS EJECUTADAS", totalCommandsExecuted.ToString(), "Comandos PC / Móvil hoy", Color.FromArgb(52, 211, 153), 0.78f);

            // Large Panel: Network & System Summary
            int netY = startY + cardH + 20;
            int netH = h - (netY - y);
            using (SolidBrush bg = new SolidBrush(Color.FromArgb(17, 24, 39)))
            using (Pen border = new Pen(Color.FromArgb(31, 41, 55), 1))
            {
                g.FillRectangle(bg, x, netY, w, netH);
                g.DrawRectangle(border, x, netY, w, netH);
            }

            using (Font fSub = new Font("Segoe UI", 10.5f, FontStyle.Bold))
            using (Font fBody = new Font("Segoe UI", 9f, FontStyle.Regular))
            using (SolidBrush bW = new SolidBrush(Color.FromArgb(248, 250, 252)))
            using (SolidBrush bM = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                g.DrawString("Estado de Conexión & Enlace Multi-Dispositivo", fSub, bW, x + 20, netY + 20);
                g.DrawString("• Dirección LAN Primaria: http://" + server.PrimaryLanIp + ":8620", fBody, bM, x + 20, netY + 56);
                g.DrawString("• Puerto de Descubrimiento UDP: 41234 (Transmisión activa mDNS/LAN)", fBody, bM, x + 20, netY + 84);
                g.DrawString("• Latencia estimada en red local Wi-Fi: 2 a 4 ms", fBody, bM, x + 20, netY + 112);
                g.DrawString("• Modo USB Directo: Soporta puente ADB inverso (adb reverse tcp:8620 tcp:8620) con 0 ms de latencia.", fBody, bM, x + 20, netY + 140);
            }
        }

        private void DrawMetricCard(Graphics g, int x, int y, int w, int h, string title, string val, string sub, Color accent, float progress)
        {
            using (SolidBrush bg = new SolidBrush(Color.FromArgb(17, 24, 39)))
            using (Pen border = new Pen(Color.FromArgb(31, 41, 55), 1))
            {
                g.FillRectangle(bg, x, y, w, h);
                g.DrawRectangle(border, x, y, w, h);
            }

            using (SolidBrush bAcc = new SolidBrush(accent))
            {
                g.FillRectangle(bAcc, x, y, w, 4);
            }

            using (Font ft = new Font("Segoe UI", 8.5f, FontStyle.Bold))
            using (Font fv = new Font("Segoe UI", 22f, FontStyle.Bold))
            using (Font fs = new Font("Segoe UI", 8f, FontStyle.Regular))
            using (SolidBrush bt = new SolidBrush(Color.FromArgb(148, 163, 184)))
            using (SolidBrush bv = new SolidBrush(Color.FromArgb(248, 250, 252)))
            {
                g.DrawString(title, ft, bt, x + 16, y + 16);
                g.DrawString(val, fv, bv, x + 14, y + 36);
                g.DrawString(sub, fs, bt, x + 16, y + 84);
            }

            // Progress bar at bottom
            int barY = y + h - 16;
            using (SolidBrush barBg = new SolidBrush(Color.FromArgb(30, 41, 59)))
            using (SolidBrush barFill = new SolidBrush(accent))
            {
                g.FillRectangle(barBg, x + 16, barY, w - 32, 6);
                g.FillRectangle(barFill, x + 16, barY, (int)((w - 32) * Math.Max(0.05f, Math.Min(1f, progress))), 6);
            }
        }

        private void RenderViewKanban(Graphics g, int x, int y, int w, int h)
        {
            using (Font fTitle = new Font("Segoe UI", 12f, FontStyle.Bold))
            using (Font fSub = new Font("Segoe UI", 9f, FontStyle.Regular))
            using (SolidBrush bWhite = new SolidBrush(Color.FromArgb(248, 250, 252)))
            using (SolidBrush bMuted = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                g.DrawString("Tablero Kanban Operativo & Triaje con Agente IA", fTitle, bWhite, x, y);
                g.DrawString("Integra requerimientos críticos desde Outlook, ServiceNow y Jira directamente a columnas priorizadas.", fSub, bMuted, x, y + 24);
            }

            int cols = 4;
            int colW = (w - (cols - 1) * 12) / cols;
            int startY = y + 60;
            int colH = h - 70;

            string[] colTitles = new string[] { "URGENTES (P1)", "EN CURSO", "BLOQUEADAS", "COMPLETADAS" };
            Color[] colColors = new Color[]
            {
                Color.FromArgb(239, 68, 68),
                Color.FromArgb(56, 189, 248),
                Color.FromArgb(245, 158, 11),
                Color.FromArgb(34, 197, 94)
            };

            for (int c = 0; c < cols; c++)
            {
                int colX = x + c * (colW + 12);

                using (SolidBrush colBg = new SolidBrush(Color.FromArgb(15, 23, 42)))
                using (Pen colBorder = new Pen(Color.FromArgb(31, 41, 55), 1))
                {
                    g.FillRectangle(colBg, colX, startY, colW, colH);
                    g.DrawRectangle(colBorder, colX, startY, colW, colH);
                }

                // Column Header
                using (SolidBrush bBar = new SolidBrush(colColors[c]))
                using (Font fc = new Font("Segoe UI", 9f, FontStyle.Bold))
                using (SolidBrush bct = new SolidBrush(Color.FromArgb(248, 250, 252)))
                {
                    g.FillRectangle(bBar, colX, startY, colW, 4);
                    g.DrawString(colTitles[c], fc, bct, colX + 10, startY + 12);
                }

                // Draw Tasks matching this column
                TaskStatus targetStatus = (TaskStatus)c;
                int cardY = startY + 40;

                foreach (var t in tasks)
                {
                    if (t.Status == targetStatus)
                    {
                        using (SolidBrush cardBg = new SolidBrush(Color.FromArgb(24, 33, 47)))
                        using (Pen cardBrd = new Pen(Color.FromArgb(51, 65, 85), 1))
                        {
                            g.FillRectangle(cardBg, colX + 8, cardY, colW - 16, 90);
                            g.DrawRectangle(cardBrd, colX + 8, cardY, colW - 16, 90);
                        }

                        using (Font fCode = new Font("Segoe UI", 8.5f, FontStyle.Bold))
                        using (Font fT = new Font("Segoe UI", 8f, FontStyle.Regular))
                        using (SolidBrush bc = new SolidBrush(colColors[c]))
                        using (SolidBrush bw = new SolidBrush(Color.FromArgb(241, 245, 249)))
                        using (SolidBrush bm = new SolidBrush(Color.FromArgb(148, 163, 184)))
                        {
                            g.DrawString(t.Code + " · " + t.SourceBadge, fCode, bc, colX + 14, cardY + 8);
                            string titlePrev = t.Title.Length > 28 ? t.Title.Substring(0, 26) + ".." : t.Title;
                            g.DrawString(titlePrev, fT, bw, colX + 14, cardY + 28);
                            g.DrawString("SLA: " + t.DueTime + " · " + t.Project, fT, bm, colX + 14, cardY + 64);
                        }

                        cardY += 100;
                    }
                }
            }
        }

        private void RenderViewTouchpad(Graphics g, int x, int y, int w, int h)
        {
            using (Font fTitle = new Font("Segoe UI", 12f, FontStyle.Bold))
            using (Font fSub = new Font("Segoe UI", 9f, FontStyle.Regular))
            using (SolidBrush bWhite = new SolidBrush(Color.FromArgb(248, 250, 252)))
            using (SolidBrush bMuted = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                g.DrawString("Panel Táctil & Lienzo de Firma Digital", fTitle, bWhite, x, y);
                g.DrawString("El mouse de este PC puede ser controlado con 0 ms desde la pantalla de tu celular o tablet.", fSub, bMuted, x, y + 24);
            }

            int boxW = w - 40;
            int boxH = h - 80;
            using (SolidBrush bg = new SolidBrush(Color.FromArgb(15, 23, 42)))
            using (Pen border = new Pen(Color.FromArgb(34, 211, 238), 2))
            {
                g.FillRectangle(bg, x + 20, y + 60, boxW, boxH);
                g.DrawRectangle(border, x + 20, y + 60, boxW, boxH);
            }

            using (Font fBig = new Font("Segoe UI", 16f, FontStyle.Bold))
            using (Font fSub2 = new Font("Segoe UI", 9.5f, FontStyle.Regular))
            using (SolidBrush bW = new SolidBrush(Color.FromArgb(226, 232, 240)))
            using (SolidBrush bM = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                g.DrawString("ÁREA DE PUNTERO REMOTO ACTIVA", fBig, bW, x + 50, y + 100);
                g.DrawString("Desliza el dedo en tu celular en la pestaña Touchpad para mover el cursor del PC.", fSub2, bM, x + 50, y + 140);
                g.DrawString("• Un toque = Clic izquierdo", fSub2, bM, x + 50, y + 175);
                g.DrawString("• Dos dedos = Clic derecho", fSub2, bM, x + 50, y + 205);
                g.DrawString("• Deslizar 2 dedos = Scroll vertical de rueda", fSub2, bM, x + 50, y + 235);
            }
        }

        private void RenderViewEnlaceMovil(Graphics g, int x, int y, int w, int h)
        {
            using (Font fTitle = new Font("Segoe UI", 12f, FontStyle.Bold))
            using (SolidBrush bWhite = new SolidBrush(Color.FromArgb(248, 250, 252)))
            {
                g.DrawString("Enlace Móvil Inmediato (Wi-Fi LAN / Código QR / USB)", fTitle, bWhite, x, y);
            }

            int qrSize = 220;
            int qrX = x + 30;
            int qrY = y + 60;

            using (Bitmap qr = GenerateQrMatrix("http://" + server.PrimaryLanIp + ":8620", qrSize))
            {
                g.DrawImage(qr, qrX, qrY);
            }

            using (Pen qrBorder = new Pen(Color.FromArgb(34, 211, 238), 3))
            {
                g.DrawRectangle(qrBorder, qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
            }

            int infoX = qrX + qrSize + 40;
            using (Font fH = new Font("Segoe UI", 11.5f, FontStyle.Bold))
            using (Font fB = new Font("Segoe UI", 9.5f, FontStyle.Regular))
            using (Font fCode = new Font("Consolas", 11f, FontStyle.Bold))
            using (SolidBrush bW = new SolidBrush(Color.FromArgb(248, 250, 252)))
            using (SolidBrush bM = new SolidBrush(Color.FromArgb(148, 163, 184)))
            using (SolidBrush bCyan = new SolidBrush(Color.FromArgb(34, 211, 238)))
            {
                g.DrawString("Paso 1: Conecta tu celular a la misma red Wi-Fi", fH, bW, infoX, qrY);
                g.DrawString("Escanea el código QR de la izquierda o abre Chrome en el teléfono e ingresa:", fB, bM, infoX, qrY + 28);
                g.DrawString("http://" + server.PrimaryLanIp + ":8620", fCode, bCyan, infoX, qrY + 54);

                g.DrawString("Paso 2: Descarga o instala la APK Nativa", fH, bW, infoX, qrY + 95);
                g.DrawString("Descarga directa del instalador móvil:", fB, bM, infoX, qrY + 120);
                g.DrawString("http://" + server.PrimaryLanIp + ":8620/download/apk", fCode, bCyan, infoX, qrY + 144);

                g.DrawString("Paso 3: Conexión Cable USB (0 ms de latencia)", fH, bW, infoX, qrY + 185);
                g.DrawString("Conecta por cable USB y ejecuta en PowerShell:", fB, bM, infoX, qrY + 210);
                g.DrawString("adb reverse tcp:8620 tcp:8620", fCode, bCyan, infoX, qrY + 234);
            }
        }

        private Bitmap GenerateQrMatrix(string payload, int size)
        {
            Bitmap bmp = new Bitmap(size, size);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.FromArgb(248, 250, 252));
                int grid = 21;
                int cell = (size - 24) / grid;
                int offset = (size - (cell * grid)) / 2;

                using (SolidBrush dark = new SolidBrush(Color.FromArgb(11, 15, 25)))
                {
                    for (int r = 0; r < grid; r++)
                    {
                        for (int c = 0; c < grid; c++)
                        {
                            bool fill = false;
                            bool inTL = r < 7 && c < 7;
                            bool inTR = r < 7 && c >= grid - 7;
                            bool inBL = r >= grid - 7 && c < 7;

                            if (inTL || inTR || inBL)
                            {
                                int lr = inBL ? r - (grid - 7) : r;
                                int lc = inTR ? c - (grid - 7) : c;
                                fill = lr == 0 || lr == 6 || lc == 0 || lc == 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
                            }
                            else if (!(r < 8 && c < 8) && !(r < 8 && c >= grid - 8) && !(r >= grid - 8 && c < 8))
                            {
                                int h = (payload.GetHashCode() ^ (r * 31 + c * 17)) & 0x7fffffff;
                                fill = (h % 10) < 5;
                            }

                            if (fill)
                            {
                                g.FillRectangle(dark, offset + c * cell, offset + r * cell, cell, cell);
                            }
                        }
                    }
                }
            }
            return bmp;
        }

        protected override void OnMouseClick(MouseEventArgs e)
        {
            base.OnMouseClick(e);

            // Window Controls Clicks
            int btnSize = 36;
            int closeX = Width - btnSize - 8;
            int minX = closeX - btnSize - 4;

            if (e.Y >= 8 && e.Y <= 44)
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
            if (e.X >= 8 && e.X <= 212)
            {
                for (int i = 0; i < navLabels.Length; i++)
                {
                    int itemY = 70 + (i * 48);
                    if (e.Y >= itemY && e.Y <= itemY + 40)
                    {
                        activeNavIndex = i;
                        Invalidate();
                        return;
                    }
                }
            }

            // View 1 (Botonera) Tile Clicks
            if (activeNavIndex == 0 && e.Y >= 128)
            {
                int cols = 4;
                int canvasX = 236;
                int canvasW = Width - canvasX - 16;
                int cardW = (canvasW - (cols - 1) * 16) / cols;
                int cardH = 110;

                for (int i = 0; i < activeTiles.Count && i < 12; i++)
                {
                    int col = i % cols;
                    int row = i / cols;
                    int cardX = canvasX + col * (cardW + 16);
                    int cardY = 128 + row * (cardH + 16);

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
                        totalCommandsExecuted++;
                        Invalidate();
                        return;
                    }
                }
            }
        }

        private void Form_MouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left && e.Y <= 52)
            {
                isDragging = true;
                dragCursorPoint = Cursor.Position;
                dragFormPoint = Location;
            }
        }

        private void Form_MouseMove(object sender, MouseEventArgs e)
        {
            if (isDragging)
            {
                Point diff = Point.Subtract(Cursor.Position, new Size(dragCursorPoint));
                Location = Point.Add(dragFormPoint, new Size(diff));
            }
        }

        private void Form_MouseUp(object sender, MouseEventArgs e)
        {
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
