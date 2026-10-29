using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("OpsDeck Enterprise Suite v2.5")]
[assembly: AssemblyDescription("OpsDeck Enterprise Desktop Cockpit & Host Daemon (:8620)")]
[assembly: AssemblyCompany("OpsDeck Enterprise")]
[assembly: AssemblyProduct("OpsDeck Enterprise v2.5")]
[assembly: AssemblyVersion("2.5.0.0")]
[assembly: AssemblyFileVersion("2.5.0.0")]

namespace OpsDeckEnterprise
{
    public class OpsDeckTrayContext : ApplicationContext
    {
        private NotifyIcon trayIcon;
        private Process hostDaemonProcess;
        private string workDir;
        private const string AppUrl = "http://127.0.0.1:8620/?mode=pc";

        public OpsDeckTrayContext()
        {
            workDir = ResolveWorkspaceDir();
            EnsureHostDaemonRunning();

            ContextMenuStrip menu = new ContextMenuStrip();
            ToolStripMenuItem headerItem = new ToolStripMenuItem("OpsDeck Enterprise v2.5 (Host :8620 Activo)");
            headerItem.Enabled = false;
            menu.Items.Add(headerItem);
            menu.Items.Add(new ToolStripSeparator());

            menu.Items.Add("Abrir Centro de Mando PC (.EXE)", null, (s, e) => OpenNativeAppWindow(AppUrl));
            menu.Items.Add("Abrir Vista Movil / Simulador APK", null, (s, e) => OpenNativeAppWindow("http://127.0.0.1:8620/?mode=mobile"));
            menu.Items.Add("Repositorio Cloud (GitHub)", null, (s, e) => Process.Start("https://github.com/dariohtelecom-oss/opsdeck"));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Salir de OpsDeck", null, OnExit);

            trayIcon = new NotifyIcon()
            {
                Icon = SystemIcons.Shield,
                Text = "OpsDeck Enterprise v2.5 - Host :8620 Activo",
                ContextMenuStrip = menu,
                Visible = true
            };
            trayIcon.DoubleClick += (s, e) => OpenNativeAppWindow(AppUrl);

            trayIcon.ShowBalloonTip(
                3500,
                "OpsDeck Enterprise v2.5 Activo",
                "Servidor local (:8620) y autodescubrimiento movil (UDP 41234) en ejecucion.",
                ToolTipIcon.Info
            );

            OpenNativeAppWindow(AppUrl);
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

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo()
                {
                    FileName = "node",
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
            catch
            {
                // Ignore if node is already managed externally
            }
        }

        public static void OpenNativeAppWindow(string url)
        {
            string[] browserCandidates = new string[]
            {
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
            };

            foreach (string browser in browserCandidates)
            {
                if (File.Exists(browser))
                {
                    ProcessStartInfo psi = new ProcessStartInfo()
                    {
                        FileName = browser,
                        Arguments = "--app=" + url + " --window-size=1480,920",
                        UseShellExecute = true
                    };
                    Process.Start(psi);
                    return;
                }
            }

            Process.Start(url);
        }

        private void OnExit(object sender, EventArgs e)
        {
            trayIcon.Visible = false;
            try
            {
                if (hostDaemonProcess != null && !hostDaemonProcess.HasExited)
                {
                    hostDaemonProcess.Kill();
                }
            }
            catch { }
            Application.Exit();
        }
    }

    static class Program
    {
        private static Mutex singleInstanceMutex;

        [STAThread]
        static void Main()
        {
            bool createdNew;
            singleInstanceMutex = new Mutex(true, "Global\\OpsDeckEnterpriseV25Mutex", out createdNew);
            if (!createdNew)
            {
                OpsDeckTrayContext.OpenNativeAppWindow("http://127.0.0.1:8620/?mode=pc");
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new OpsDeckTrayContext());
        }
    }
}
