using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Instalador de OpsDeck Enterprise")]
[assembly: AssemblyProduct("OpsDeck Enterprise v2.5 Setup")]
[assembly: AssemblyCompany("OpsDeck Enterprise")]
[assembly: AssemblyVersion("2.5.0.0")]
[assembly: AssemblyFileVersion("2.5.0.0")]

namespace OpsDeck.Installer
{
    public class SetupForm : Form
    {
        private ProgressBar progressBar;
        private Label lblStatus;
        private Button btnInstall;
        private Button btnCancel;
        private CheckBox chkLaunch;
        private TextBox txtInstallDir;

        private string defaultInstallPath;

        public SetupForm()
        {
            defaultInstallPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs",
                "OpsDeck Enterprise"
            );

            Text = "Instalador de OpsDeck Enterprise v2.5";
            Size = new Size(620, 420);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            BackColor = Color.FromArgb(11, 15, 25);
            ForeColor = Color.FromArgb(248, 250, 252);
            Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            BuildUi();
        }

        private void BuildUi()
        {
            Panel header = new Panel
            {
                Dock = DockStyle.Top,
                Height = 72,
                BackColor = Color.FromArgb(17, 24, 39)
            };

            Label title = new Label
            {
                Text = "INSTALADOR DE OPSDECK ENTERPRISE",
                Font = new Font("Segoe UI", 12f, FontStyle.Bold),
                ForeColor = Color.FromArgb(248, 250, 252),
                AutoSize = true,
                Location = new Point(24, 16)
            };

            Label sub = new Label
            {
                Text = "Versión 2.5.0 · Software Nativo Local de Control PC, Botonera y Triaje IA",
                Font = new Font("Segoe UI", 8.5f, FontStyle.Regular),
                ForeColor = Color.FromArgb(148, 163, 184),
                AutoSize = true,
                Location = new Point(24, 42)
            };

            header.Controls.Add(title);
            header.Controls.Add(sub);
            Controls.Add(header);

            // Body Controls
            Label lblDir = new Label
            {
                Text = "Carpeta de instalación en tu PC:",
                ForeColor = Color.FromArgb(203, 213, 225),
                AutoSize = true,
                Location = new Point(24, 96)
            };
            Controls.Add(lblDir);

            txtInstallDir = new TextBox
            {
                Text = defaultInstallPath,
                Location = new Point(24, 122),
                Size = new Size(460, 28),
                BackColor = Color.FromArgb(30, 41, 59),
                ForeColor = Color.White,
                BorderStyle = BorderStyle.FixedSingle
            };
            Controls.Add(txtInstallDir);

            Button btnBrowse = new Button
            {
                Text = "Examinar...",
                Location = new Point(494, 120),
                Size = new Size(96, 30),
                BackColor = Color.FromArgb(51, 65, 85),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            btnBrowse.Click += (s, e) =>
            {
                FolderBrowserDialog fbd = new FolderBrowserDialog { SelectedPath = txtInstallDir.Text };
                if (fbd.ShowDialog() == DialogResult.OK)
                {
                    txtInstallDir.Text = fbd.SelectedPath;
                }
            };
            Controls.Add(btnBrowse);

            chkLaunch = new CheckBox
            {
                Text = "Iniciar OpsDeck Enterprise al finalizar la instalación",
                Checked = true,
                ForeColor = Color.FromArgb(203, 213, 225),
                AutoSize = true,
                Location = new Point(24, 168)
            };
            Controls.Add(chkLaunch);

            lblStatus = new Label
            {
                Text = "Listo para instalar en tu equipo.",
                ForeColor = Color.FromArgb(148, 163, 184),
                AutoSize = true,
                Location = new Point(24, 215)
            };
            Controls.Add(lblStatus);

            progressBar = new ProgressBar
            {
                Location = new Point(24, 240),
                Size = new Size(566, 16),
                Value = 0
            };
            Controls.Add(progressBar);

            // Bottom Buttons
            btnInstall = new Button
            {
                Text = "INSTALAR AHORA",
                Location = new Point(340, 310),
                Size = new Size(150, 42),
                BackColor = Color.FromArgb(34, 211, 238),
                ForeColor = Color.FromArgb(11, 15, 25),
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                FlatStyle = FlatStyle.Flat
            };
            btnInstall.Click += (s, e) => PerformInstallation();
            Controls.Add(btnInstall);

            btnCancel = new Button
            {
                Text = "Cancelar",
                Location = new Point(500, 310),
                Size = new Size(90, 42),
                BackColor = Color.FromArgb(30, 41, 59),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            btnCancel.Click += (s, e) => Close();
            Controls.Add(btnCancel);
        }

        private void PerformInstallation()
        {
            btnInstall.Enabled = false;
            btnCancel.Enabled = false;

            string targetDir = txtInstallDir.Text.Trim();
            if (string.IsNullOrEmpty(targetDir)) targetDir = defaultInstallPath;

            try
            {
                lblStatus.Text = "Creando directorios...";
                progressBar.Value = 20;
                Directory.CreateDirectory(targetDir);

                lblStatus.Text = "Copiando binarios nativos...";
                progressBar.Value = 50;

                string srcBase = AppDomain.CurrentDomain.BaseDirectory;
                string exeSrc = Path.Combine(srcBase, "OpsDeck.exe");
                string apkSrc = Path.Combine(srcBase, "OpsDeck-Mobile.apk");
                string iconSrc = Path.Combine(srcBase, "icon.ico");
                string qrSrc = Path.Combine(srcBase, "QRCoder.dll");

                string targetExe = Path.Combine(targetDir, "OpsDeck.exe");
                string targetApk = Path.Combine(targetDir, "OpsDeck-Mobile.apk");
                string targetIcon = Path.Combine(targetDir, "icon.ico");
                string targetQr = Path.Combine(targetDir, "QRCoder.dll");

                if (File.Exists(exeSrc)) File.Copy(exeSrc, targetExe, true);
                if (File.Exists(apkSrc)) File.Copy(apkSrc, targetApk, true);
                if (File.Exists(iconSrc)) File.Copy(iconSrc, targetIcon, true);
                if (File.Exists(qrSrc)) File.Copy(qrSrc, targetQr, true);

                lblStatus.Text = "Creando accesos directos en Escritorio y Menú Inicio...";
                progressBar.Value = 75;

                CreateShortcuts(targetExe, targetIcon);
                RegisterInWindows(targetDir, targetExe, targetIcon);

                progressBar.Value = 100;
                lblStatus.Text = "¡Instalación completada con éxito!";

                if (chkLaunch.Checked && File.Exists(targetExe))
                {
                    Process.Start(new ProcessStartInfo(targetExe) { UseShellExecute = true });
                }

                MessageBox.Show(
                    "OpsDeck Enterprise v2.5 se ha instalado correctamente en:\n" + targetDir + "\n\nSe creó un acceso directo en tu Escritorio.",
                    "Instalación Exitosa",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );

                Close();
            }
            catch (Exception ex)
            {
                lblStatus.Text = "Error durante la instalación.";
                MessageBox.Show("Error instalando OpsDeck: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                btnInstall.Enabled = true;
                btnCancel.Enabled = true;
            }
        }

        private void CreateShortcuts(string targetExe, string iconPath)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;
                dynamic shell = Activator.CreateInstance(shellType);

                // Desktop shortcut
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string desktopLnk = Path.Combine(desktopPath, "OpsDeck Enterprise.lnk");
                dynamic shortcutDesktop = shell.CreateShortcut(desktopLnk);
                shortcutDesktop.TargetPath = targetExe;
                shortcutDesktop.WorkingDirectory = Path.GetDirectoryName(targetExe);
                shortcutDesktop.Description = "OpsDeck Enterprise v2.5 — Centro de Mando Nativo";
                if (File.Exists(iconPath)) shortcutDesktop.IconLocation = iconPath + ",0";
                shortcutDesktop.Save();

                // Start Menu shortcut
                string startMenuPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "OpsDeck Enterprise");
                Directory.CreateDirectory(startMenuPath);
                string startLnk = Path.Combine(startMenuPath, "OpsDeck Enterprise.lnk");
                dynamic shortcutStart = shell.CreateShortcut(startLnk);
                shortcutStart.TargetPath = targetExe;
                shortcutStart.WorkingDirectory = Path.GetDirectoryName(targetExe);
                shortcutStart.Description = "OpsDeck Enterprise v2.5";
                if (File.Exists(iconPath)) shortcutStart.IconLocation = iconPath + ",0";
                shortcutStart.Save();
            }
            catch { }
        }

        private void RegisterInWindows(string targetDir, string targetExe, string iconPath)
        {
            try
            {
                string keyPath = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\OpsDeckEnterprise";
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(keyPath))
                {
                    if (key != null)
                    {
                        key.SetValue("DisplayName", "OpsDeck Enterprise v2.5");
                        key.SetValue("DisplayVersion", "2.5.0");
                        key.SetValue("Publisher", "OpsDeck Enterprise");
                        key.SetValue("InstallLocation", targetDir);
                        key.SetValue("DisplayIcon", File.Exists(iconPath) ? iconPath : targetExe);
                        key.SetValue("UninstallString", "cmd.exe /c rd /s /q \"" + targetDir + "\"");
                    }
                }
            }
            catch { }
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupForm());
        }
    }
}
