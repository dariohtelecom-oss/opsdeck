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
            bool createdNew;
            singleInstanceMutex = new Mutex(true, "OpsDeck_Enterprise_Native_Mutex", out createdNew);

            if (!createdNew)
            {
                MessageBox.Show("OpsDeck Enterprise ya se encuentra en ejecución en tu sistema.", "OpsDeck Enterprise", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            try
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new MainWindow());
            }
            finally
            {
                if (singleInstanceMutex != null) singleInstanceMutex.ReleaseMutex();
            }
        }
    }
}
