using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;

namespace OpsDeck.Desktop
{
    public static class Win32
    {
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern int GetWindowTextLength(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        public const uint MOUSEEVENTF_MOVE = 0x0001;
        public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        public const uint MOUSEEVENTF_LEFTUP = 0x0004;
        public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
        public const uint MOUSEEVENTF_WHEEL = 0x0800;

        public const uint KEYEVENTF_KEYUP = 0x0002;

        public const byte VK_CONTROL = 0x11;
        public const byte VK_SHIFT = 0x10;
        public const byte VK_MENU = 0x12; // Alt
        public const byte VK_LWIN = 0x5B;

        public static string GetActiveWindowTitle()
        {
            try
            {
                IntPtr handle = GetForegroundWindow();
                if (handle == IntPtr.Zero) return "Escritorio";
                int len = GetWindowTextLength(handle);
                if (len <= 0) return "Escritorio";
                StringBuilder sb = new StringBuilder(len + 1);
                GetWindowText(handle, sb, sb.Capacity);
                string title = sb.ToString().Trim();
                return string.IsNullOrEmpty(title) ? "Escritorio" : title;
            }
            catch
            {
                return "Escritorio";
            }
        }

        public static void MoveCursorRelative(int dx, int dy)
        {
            mouse_event(MOUSEEVENTF_MOVE, (uint)dx, (uint)dy, 0, UIntPtr.Zero);
        }

        public static void LeftClick()
        {
            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
        }

        public static void RightClick()
        {
            mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, UIntPtr.Zero);
            mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, UIntPtr.Zero);
        }

        public static void MouseWheel(int delta)
        {
            mouse_event(MOUSEEVENTF_WHEEL, 0, 0, (uint)delta, UIntPtr.Zero);
        }

        public static void SendHotkey(string hotkey)
        {
            try
            {
                string hk = hotkey.ToLowerInvariant().Trim();
                if (hk == "ctrl+shift+m")
                {
                    keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
                    keybd_event(VK_SHIFT, 0, 0, UIntPtr.Zero);
                    keybd_event((byte)'M', 0, 0, UIntPtr.Zero);
                    keybd_event((byte)'M', 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                    keybd_event(VK_SHIFT, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                    keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                }
                else if (hk == "ctrl+shift+o")
                {
                    keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
                    keybd_event(VK_SHIFT, 0, 0, UIntPtr.Zero);
                    keybd_event((byte)'O', 0, 0, UIntPtr.Zero);
                    keybd_event((byte)'O', 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                    keybd_event(VK_SHIFT, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                    keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                }
                else if (hk == "ctrl+s")
                {
                    keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
                    keybd_event((byte)'S', 0, 0, UIntPtr.Zero);
                    keybd_event((byte)'S', 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                    keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                }
                else if (hk == "ctrl+c")
                {
                    SendKeys.SendWait("^c");
                }
                else if (hk == "ctrl+v")
                {
                    SendKeys.SendWait("^v");
                }
                else if (hk.StartsWith("keys:"))
                {
                    SendKeys.SendWait(hotkey.Substring(5));
                }
            }
            catch { }
        }

        public static bool LaunchApp(string target)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo(target)
                {
                    UseShellExecute = true
                };
                Process.Start(psi);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
