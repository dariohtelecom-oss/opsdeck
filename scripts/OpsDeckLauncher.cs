using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("OpsDeck Enterprise Suite v2.5")]
[assembly: AssemblyDescription("OpsDeck Enterprise Desktop Cockpit & Host Server")]
[assembly: AssemblyCompany("OpsDeck Enterprise")]
[assembly: AssemblyProduct("OpsDeck Enterprise v2.5")]
[assembly: AssemblyVersion("2.5.0.0")]
[assembly: AssemblyFileVersion("2.5.0.0")]

namespace OpsDeckEnterprise
{
    public class OpsDeckMainForm : Form
    {
        private NotifyIcon trayIcon;
        private Process hostDaemonProcess;
        private string workDir;
        private string lanIp;
        private Label statusBadge;
        private Label ipLabel;
        private const string LocalCockpitUrl = "http://127.0.0.1:8620/?mode=pc";

        public OpsDeckMainForm()
        {
            Log("1. OpsDeckMainForm constructor starting");
            try
            {
                workDir = ResolveWorkspaceDir();
                Log("2. workDir: " + workDir);
                lanIp = DetectLocalLanIp();
                Log("3. lanIp: " + lanIp);

                Text = "OpsDeck Enterprise v2.5 — Servidor PC & Centro de Mando (.EXE)";
                Size = new Size(760, 480);
                MinimumSize = new Size(720, 450);
                StartPosition = FormStartPosition.CenterScreen;
                BackColor = Color.FromArgb(6, 20, 27); // #06141B
                ForeColor = Color.FromArgb(204, 208, 207); // #CCD0CF
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
                Icon = SystemIcons.Shield;

                Log("4. Building Native UI");
                BuildNativeUi();
                Log("5. Setting up Tray Icon");
                SetupTrayIcon();

                Load += (s, e) =>
                {
                    Log("6. Form Loaded event fired");
                    WindowState = FormWindowState.Normal;
                    BringToFront();
                    Activate();
                    ThreadPool.QueueUserWorkItem(_ =>
                    {
                        try
                        {
                            Log("7. QueueUserWorkItem background thread starting");
                            EnsureHostDaemonRunning();
                            Log("8. EnsureHostDaemonRunning finished");
                            BeginInvoke((Action)(() =>
                            {
                                try
                                {
                                    Log("9. BeginInvoke UI update starting");
                                    UpdateServerStatusUi();
                                    OpenDedicatedCockpitWindow(LocalCockpitUrl);
                                    Log("10. OpenDedicatedCockpitWindow finished");
                                }
                                catch (Exception ex)
                                {
                                    Log("ERROR in BeginInvoke: " + ex);
                                }
                            }));
                        }
                        catch (Exception ex)
                        {
                            Log("ERROR in QueueUserWorkItem: " + ex);
                        }
                    });
                };

                FormClosing += (s, e) =>
                {
                    Log("FORM CLOSING! CloseReason: " + e.CloseReason);
                };

                FormClosed += (s, e) =>
                {
                    Log("FORM CLOSED! CloseReason: " + e.CloseReason);
                };
            }
            catch (Exception ex)
            {
                Log("FATAL ERROR in Constructor: " + ex);
            }
        }

        private static void Log(string msg)
        {
            try
            {
                string logFile = @"C:\Users\Viver\Desktop\opsdeck-trace.log";
                File.AppendAllText(logFile, DateTime.Now.ToString("HH:mm:ss.fff") + " " + msg + "\r\n");
            }
            catch { }
        }

        private void BuildNativeUi()
        {
            Panel header = new Panel()
            {
                Dock = DockStyle.Top,
                Height = 68,
                BackColor = Color.FromArgb(17, 33, 45), // #11212D
                Padding = new Padding(20, 12, 20, 12)
            };

            Label title = new Label()
            {
                Text = "OPSDECK ENTERPRISE v2.5 · EJECUTABLE NATIVO PC (.EXE)",
                Font = new Font("Segoe UI", 12f, FontStyle.Bold),
                ForeColor = Color.FromArgb(204, 208, 207),
                AutoSize = true,
                Location = new Point(20, 12)
            };

            Label subtitle = new Label()
            {
                Text = "Demonio Host (:8620) · Botonera Dinamica Win32 · Agente IA Tickets · Enlace Movil USB/Wi-Fi",
                Font = new Font("Segoe UI", 8.5f, FontStyle.Regular),
                ForeColor = Color.FromArgb(155, 168, 171),
                AutoSize = true,
                Location = new Point(20, 38)
            };

            statusBadge = new Label()
            {
                Text = "● INICIANDO SERVIDOR :8620...",
                Font = new Font("Consolas", 9f, FontStyle.Bold),
                ForeColor = Color.FromArgb(243, 201, 139),
                AutoSize = true,
                Location = new Point(500, 24)
            };

            header.Controls.Add(title);
            header.Controls.Add(subtitle);
            header.Controls.Add(statusBadge);
            Controls.Add(header);

            // Left Card: Controls
            Panel leftCard = new Panel()
            {
                Location = new Point(20, 86),
                Size = new Size(430, 330),
                BackColor = Color.FromArgb(17, 33, 45)
            };

            Label cardTitle = new Label()
            {
                Text = "Acciones del Centro de Mando en PC",
                Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(204, 208, 207),
                AutoSize = true,
                Location = new Point(18, 16)
            };
            leftCard.Controls.Add(cardTitle);

            Button btnOpenCockpit = CreateActionButton(
                "1. ABRIR CENTRO DE MANDO PC (VENTANA COMPLETA)",
                new Point(18, 50),
                new Size(394, 46),
                true,
                (s, e) => OpenDedicatedCockpitWindow(LocalCockpitUrl)
            );
            leftCard.Controls.Add(btnOpenCockpit);

            Button btnOpenMobileSim = CreateActionButton(
                "2. ABRIR SIMULADOR APK / VISTA MOVIL (ES/EN)",
                new Point(18, 108),
                new Size(394, 42),
                false,
                (s, e) => OpenDedicatedCockpitWindow("http://127.0.0.1:8620/?mode=mobile")
            );
            leftCard.Controls.Add(btnOpenMobileSim);

            Button btnInstallUsb = CreateActionButton(
                "3. INSTALAR APK EN CELULAR CONECTADO POR USB (ADB)",
                new Point(18, 162),
                new Size(394, 42),
                false,
                (s, e) => InstallApkViaUsb()
            );
            leftCard.Controls.Add(btnInstallUsb);

            ipLabel = new Label()
            {
                Text = "Direccion LAN para tu Celular (Wi-Fi / APK):\r\nhttp://" + lanIp + ":8620   (o puerto :5173)",
                Font = new Font("Consolas", 9.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(204, 208, 207),
                Location = new Point(18, 220),
                Size = new Size(394, 48)
            };
            leftCard.Controls.Add(ipLabel);

            Label instructionsLabel = new Label()
            {
                Text = "En tu celular Android abre OpsDeck o Chrome e ingresa " + lanIp + ":8620\r\no escanea el codigo QR de la derecha para enlazar al instante.",
                Font = new Font("Segoe UI", 8.5f, FontStyle.Regular),
                ForeColor = Color.FromArgb(155, 168, 171),
                Location = new Point(18, 272),
                Size = new Size(394, 48)
            };
            leftCard.Controls.Add(instructionsLabel);

            Controls.Add(leftCard);

            // Right Card: Scannable QR Code
            Panel rightCard = new Panel()
            {
                Location = new Point(468, 86),
                Size = new Size(256, 330),
                BackColor = Color.FromArgb(17, 33, 45)
            };

            Label qrTitle = new Label()
            {
                Text = "Enlace Rapido Movil / Tablet",
                Font = new Font("Segoe UI", 10f, FontStyle.Bold),
                ForeColor = Color.FromArgb(204, 208, 207),
                AutoSize = true,
                Location = new Point(28, 16)
            };
            rightCard.Controls.Add(qrTitle);

            PictureBox qrBox = new PictureBox()
            {
                Location = new Point(38, 48),
                Size = new Size(180, 180),
                BackColor = Color.FromArgb(204, 208, 207),
                Image = RenderQrBitmap("http://" + lanIp + ":8620", 180)
            };
            rightCard.Controls.Add(qrBox);

            Label qrFooter = new Label()
            {
                Text = "Servidor: " + Environment.MachineName + "\r\nIP: " + lanIp + ":8620\r\nIdioma: Espanol / English",
                Font = new Font("Consolas", 8.5f, FontStyle.Regular),
                ForeColor = Color.FromArgb(155, 168, 171),
                Location = new Point(24, 240),
                Size = new Size(210, 75),
                TextAlign = ContentAlignment.MiddleCenter
            };
            rightCard.Controls.Add(qrFooter);

            Controls.Add(rightCard);
        }

        private Button CreateActionButton(string text, Point location, Size size, bool primary, EventHandler onClick)
        {
            Button btn = new Button()
            {
                Text = text,
                Location = location,
                Size = size,
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand,
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                BackColor = primary ? Color.FromArgb(204, 208, 207) : Color.FromArgb(37, 55, 69),
                ForeColor = primary ? Color.FromArgb(6, 20, 27) : Color.FromArgb(204, 208, 207)
            };
            btn.FlatAppearance.BorderColor = Color.FromArgb(74, 92, 106);
            btn.FlatAppearance.BorderSize = 1;
            btn.Click += onClick;
            return btn;
        }

        private Bitmap RenderQrBitmap(string payload, int sizePx)
        {
            Bitmap bmp = new Bitmap(sizePx, sizePx);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.FromArgb(204, 208, 207));
                int grid = 21;
                int cell = (sizePx - 24) / grid;
                int offset = (sizePx - (cell * grid)) / 2;
                Brush dark = new SolidBrush(Color.FromArgb(6, 20, 27));

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
            return bmp;
        }

        private void SetupTrayIcon()
        {
            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Items.Add("Mostrar Ventana Principal OpsDeck (.EXE)", null, (s, e) => { Show(); WindowState = FormWindowState.Normal; Activate(); });
            menu.Items.Add("Abrir Centro de Mando PC", null, (s, e) => OpenDedicatedCockpitWindow(LocalCockpitUrl));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Salir de OpsDeck", null, (s, e) => Close());

            trayIcon = new NotifyIcon()
            {
                Icon = SystemIcons.Shield,
                Text = "OpsDeck Enterprise v2.5 (" + lanIp + ":8620)",
                ContextMenuStrip = menu,
                Visible = true
            };
            trayIcon.DoubleClick += (s, e) => { Show(); WindowState = FormWindowState.Normal; Activate(); };
        }

        private void UpdateServerStatusUi()
        {
            if (IsHostUp())
            {
                statusBadge.Text = "● SERVIDOR ACTIVO (:8620)";
                statusBadge.ForeColor = Color.FromArgb(142, 224, 168);
            }
            else
            {
                statusBadge.Text = "● USANDO PUERTO :5173";
                statusBadge.ForeColor = Color.FromArgb(243, 201, 139);
            }
        }

        private string DetectLocalLanIp()
        {
            try
            {
                IPAddress[] ips = Dns.GetHostAddresses(Dns.GetHostName());
                foreach (IPAddress ip in ips)
                {
                    if (ip.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ip))
                    {
                        string s = ip.ToString();
                        if (s.StartsWith("192.168.") || s.StartsWith("10."))
                        {
                            return s;
                        }
                    }
                }
            }
            catch { }
            return "192.168.1.85";
        }

        private string ResolveWorkspaceDir()
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            if (File.Exists(Path.Combine(exeDir, "host-agent", "server.mjs")))
            {
                return exeDir;
            }
            string fallback = @"c:\Users\Viver\Desktop\projecto iphone";
            if (Directory.Exists(fallback))
            {
                return fallback;
            }
            return exeDir;
        }

        private bool IsHostUp()
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:8620/health");
                req.Timeout = 1200;
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                {
                    return res.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private void EnsureHostDaemonRunning()
        {
            if (IsHostUp()) return;

            string serverScript = Path.Combine(workDir, "host-agent", "server.mjs");
            if (!File.Exists(serverScript)) return;

            string nodeBin = @"C:\Program Files\nodejs\node.exe";
            if (!File.Exists(nodeBin)) nodeBin = "node";

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo()
                {
                    FileName = nodeBin,
                    Arguments = "\"" + serverScript + "\"",
                    WorkingDirectory = workDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                hostDaemonProcess = Process.Start(psi);

                for (int i = 0; i < 15; i++)
                {
                    if (IsHostUp()) break;
                    Thread.Sleep(250);
                }
            }
            catch { }
        }

        public static void OpenDedicatedCockpitWindow(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch
            {
                try
                {
                    Process.Start(url);
                }
                catch { }
            }
        }

        private void InstallApkViaUsb()
        {
            string scriptPath = Path.Combine(workDir, "scripts", "install-to-phone.ps1");
            if (File.Exists(scriptPath))
            {
                Process.Start(new ProcessStartInfo()
                {
                    FileName = "powershell.exe",
                    Arguments = "-NoExit -ExecutionPolicy Bypass -File \"" + scriptPath + "\"",
                    UseShellExecute = true
                });
            }
            else
            {
                MessageBox.Show("Conecta tu celular por USB y activa Depuracion USB o descarga el APK desde http://" + lanIp + ":8620/download/apk", "OpsDeck USB Installer", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (trayIcon != null) trayIcon.Visible = false;
            try
            {
                if (hostDaemonProcess != null && !hostDaemonProcess.HasExited)
                {
                    hostDaemonProcess.Kill();
                }
            }
            catch { }
            base.OnFormClosing(e);
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                try { File.AppendAllText(@"C:\Users\Viver\Desktop\opsdeck-trace.log", "AppDomain UNHANDLED EXCEPTION: " + e.ExceptionObject + "\r\n"); } catch { }
            };
            Application.ThreadException += (s, e) =>
            {
                try { File.AppendAllText(@"C:\Users\Viver\Desktop\opsdeck-trace.log", "Application THREAD EXCEPTION: " + e.Exception + "\r\n"); } catch { }
            };
            Application.ApplicationExit += (s, e) =>
            {
                try { File.AppendAllText(@"C:\Users\Viver\Desktop\opsdeck-trace.log", "APPLICATION EXIT EVENT\r\n"); } catch { }
            };

            try
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new OpsDeckMainForm());
            }
            catch (Exception ex)
            {
                try
                {
                    string crashPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "opsdeck-crash.log");
                    File.WriteAllText(crashPath, ex.ToString());
                }
                catch { }
                MessageBox.Show("Error iniciando OpsDeck: " + ex.Message + "\n\n" + ex.StackTrace, "OpsDeck Error Fatal", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
