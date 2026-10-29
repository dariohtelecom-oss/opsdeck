using System;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("OpsDeck Enterprise Desktop Suite")]
[assembly: AssemblyDescription("Centro de Mando Nativo & Botonera Dinámica para PC")]
[assembly: AssemblyCompany("OpsDeck Enterprise")]
[assembly: AssemblyProduct("OpsDeck Enterprise")]
[assembly: AssemblyCopyright("Copyright © 2026 OpsDeck Enterprise")]
[assembly: AssemblyVersion("2.5.0.0")]
[assembly: AssemblyFileVersion("2.5.0.0")]

namespace OpsDeck.Desktop
{
    static class Program
    {
        private static Mutex singleInstanceMutex;

        [STAThread]
        static void Main()
        {
            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
            Application.ThreadException += (s, e) =>
            {
                try
                {
                    System.IO.File.AppendAllText(@"C:\Users\Viver\Desktop\opsdeck-debug.log", "[" + DateTime.Now.ToString("HH:mm:ss.fff") + "] ThreadException: " + e.Exception.ToString() + "\r\n");
                }
                catch { }
            };
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                try
                {
                    System.IO.File.AppendAllText(@"C:\Users\Viver\Desktop\opsdeck-debug.log", "[" + DateTime.Now.ToString("HH:mm:ss.fff") + "] AppDomain Exception: " + e.ExceptionObject.ToString() + "\r\n");
                }
                catch { }
            };

            try
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new MainWindow());
            }
            catch (Exception ex)
            {
                try
                {
                    System.IO.File.AppendAllText(@"C:\Users\Viver\Desktop\opsdeck-debug.log", "[" + DateTime.Now.ToString("HH:mm:ss.fff") + "] Main catch: " + ex.ToString() + "\r\n");
                }
                catch { }
            }
        }
    }
}
