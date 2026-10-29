using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace OpsDeck.Desktop
{
    public class HostServer
    {
        private HttpListener httpListener;
        private UdpClient udpServer;
        private Thread httpThread;
        private Thread udpThread;
        private bool isRunning;
        private int port = 8620;
        private int udpPort = 41234;

        public event Action<string> OnLog;
        public event Action<string> OnTileTriggered;
        public event Action<int, int, string> OnTouchpadEvent;

        public string PrimaryLanIp { get; private set; }
        public List<KanbanTask> TasksRef { get; set; }
        public List<DeckTile> ActiveTilesRef { get; set; }
        public Func<string> GetActiveWindowFunc { get; set; }
        public Func<float> GetCpuPercentFunc { get; set; }
        public Func<float> GetRamPercentFunc { get; set; }
        public string ApkFilePath { get; set; }

        public HostServer()
        {
            PrimaryLanIp = DetectPrimaryLanIp();
        }

        public void Start()
        {
            if (isRunning) return;
            isRunning = true;

            try
            {
                httpListener = new HttpListener();
                httpListener.Prefixes.Add("http://*:" + port + "/");
                httpListener.Start();
                httpThread = new Thread(HttpWorker) { IsBackground = true };
                httpThread.Start();
                Log("Servidor HTTP iniciado en puerto " + port);
            }
            catch (Exception ex)
            {
                try
                {
                    httpListener = new HttpListener();
                    httpListener.Prefixes.Add("http://127.0.0.1:" + port + "/");
                    httpListener.Prefixes.Add("http://localhost:" + port + "/");
                    httpListener.Start();
                    httpThread = new Thread(HttpWorker) { IsBackground = true };
                    httpThread.Start();
                    Log("Servidor HTTP iniciado en localhost:" + port);
                }
                catch (Exception e2)
                {
                    Log("Error iniciando HTTP listener: " + e2.Message);
                }
            }

            try
            {
                udpServer = new UdpClient(udpPort);
                udpThread = new Thread(UdpWorker) { IsBackground = true };
                udpThread.Start();
                Log("Descubrimiento UDP activo en puerto " + udpPort);
            }
            catch (Exception ex)
            {
                Log("Advertencia UDP: " + ex.Message);
            }
        }

        public void Stop()
        {
            isRunning = false;
            try { if (httpListener != null) httpListener.Stop(); } catch { }
            try { if (udpServer != null) udpServer.Close(); } catch { }
        }

        private void Log(string msg)
        {
            if (OnLog != null) OnLog("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + msg);
        }

        private void UdpWorker()
        {
            IPEndPoint clientEp = new IPEndPoint(IPAddress.Any, 0);
            while (isRunning)
            {
                try
                {
                    byte[] data = udpServer.Receive(ref clientEp);
                    string msg = Encoding.UTF8.GetString(data).Trim();
                    if (msg.Contains("discover"))
                    {
                        string replyStr = "opsdeck:here:http://" + PrimaryLanIp + ":" + port;
                        byte[] reply = Encoding.UTF8.GetBytes(replyStr);
                        udpServer.Send(reply, reply.Length, clientEp);
                        Log("Dispositivo móvil detectado desde " + clientEp.Address + ". Respondiendo enlace.");
                    }
                }
                catch
                {
                    if (!isRunning) break;
                }
            }
        }

        private void HttpWorker()
        {
            while (isRunning && httpListener.IsListening)
            {
                try
                {
                    HttpListenerContext ctx = httpListener.GetContext();
                    ThreadPool.QueueUserWorkItem(_ => HandleRequest(ctx));
                }
                catch
                {
                    if (!isRunning) break;
                }
            }
        }

        private void HandleRequest(HttpListenerContext ctx)
        {
            HttpListenerRequest req = ctx.Request;
            HttpListenerResponse res = ctx.Response;

            res.Headers.Add("Access-Control-Allow-Origin", "*");
            res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");

            if (req.HttpMethod == "OPTIONS")
            {
                res.StatusCode = 204;
                res.Close();
                return;
            }

            string path = req.Url.AbsolutePath.ToLowerInvariant();

            try
            {
                if (path == "/health" || path == "/api/status")
                {
                    string win = GetActiveWindowFunc != null ? GetActiveWindowFunc() : "Escritorio";
                    float cpu = GetCpuPercentFunc != null ? GetCpuPercentFunc() : 12f;
                    float ram = GetRamPercentFunc != null ? GetRamPercentFunc() : 45f;

                    string json = string.Format(
                        "{{\"ok\":true,\"app\":\"opsdeck-native\",\"version\":\"2.5.0\",\"hostName\":\"{0}\",\"lanIp\":\"{1}\",\"activeWindow\":\"{2}\",\"cpu\":{3},\"ram\":{4}}}",
                        Escape(Environment.MachineName),
                        Escape(PrimaryLanIp),
                        Escape(win),
                        Math.Round(cpu, 1),
                        Math.Round(ram, 1)
                    );
                    SendJson(res, 200, json);
                    return;
                }

                if (path == "/api/context")
                {
                    string win = GetActiveWindowFunc != null ? GetActiveWindowFunc() : "Escritorio";
                    string json = string.Format("{{\"ok\":true,\"activeWindow\":\"{0}\"}}", Escape(win));
                    SendJson(res, 200, json);
                    return;
                }

                if (path == "/api/tiles")
                {
                    StringBuilder sb = new StringBuilder();
                    sb.Append("{\"ok\":true,\"tiles\":[");
                    var tiles = ActiveTilesRef ?? new List<DeckTile>();
                    for (int i = 0; i < tiles.Count; i++)
                    {
                        if (i > 0) sb.Append(",");
                        var t = tiles[i];
                        sb.Append(string.Format(
                            "{{\"id\":\"{0}\",\"label\":\"{1}\",\"subLabel\":\"{2}\",\"glyph\":\"{3}\",\"color\":\"{4}\",\"command\":\"{5}\",\"shortcut\":\"{6}\"}}",
                            Escape(t.Id), Escape(t.Label), Escape(t.SubLabel), Escape(t.IconGlyph), Escape(t.AccentColor), Escape(t.Command), Escape(t.Shortcut)
                        ));
                    }
                    sb.Append("]}");
                    SendJson(res, 200, sb.ToString());
                    return;
                }

                if (path == "/api/trigger" && req.HttpMethod == "POST")
                {
                    string body = ReadBody(req);
                    string tileId = ExtractJsonField(body, "id");
                    string cmd = ExtractJsonField(body, "command");

                    if (!string.IsNullOrEmpty(cmd))
                    {
                        ExecuteDeckCommand(cmd);
                    }

                    if (OnTileTriggered != null) OnTileTriggered(tileId ?? cmd);
                    SendJson(res, 200, "{\"ok\":true,\"triggered\":\"" + Escape(tileId) + "\"}");
                    return;
                }

                if (path == "/api/touchpad" && req.HttpMethod == "POST")
                {
                    string body = ReadBody(req);
                    int px;
                    int dx = int.TryParse(ExtractJsonField(body, "dx"), out px) ? px : 0;
                    int py;
                    int dy = int.TryParse(ExtractJsonField(body, "dy"), out py) ? py : 0;
                    string action = ExtractJsonField(body, "action");

                    if (action == "click") Win32.LeftClick();
                    else if (action == "rightclick") Win32.RightClick();
                    else if (action == "scroll") Win32.MouseWheel(dy * 15);
                    else Win32.MoveCursorRelative(dx, dy);

                    if (OnTouchpadEvent != null) OnTouchpadEvent(dx, dy, action);
                    SendJson(res, 200, "{\"ok\":true}");
                    return;
                }

                if (path == "/api/kanban")
                {
                    var tasks = TasksRef ?? new List<KanbanTask>();
                    StringBuilder sb = new StringBuilder();
                    sb.Append("{\"ok\":true,\"tasks\":[");
                    for (int i = 0; i < tasks.Count; i++)
                    {
                        if (i > 0) sb.Append(",");
                        var t = tasks[i];
                        sb.Append(string.Format(
                            "{{\"id\":\"{0}\",\"code\":\"{1}\",\"title\":\"{2}\",\"project\":\"{3}\",\"priority\":\"{4}\",\"status\":\"{5}\",\"dueTime\":\"{6}\",\"badge\":\"{7}\"}}",
                            Escape(t.Id), Escape(t.Code), Escape(t.Title), Escape(t.Project), t.Priority.ToString().ToLower(), t.Status.ToString().ToLower(), Escape(t.DueTime), Escape(t.SourceBadge)
                        ));
                    }
                    sb.Append("]}");
                    SendJson(res, 200, sb.ToString());
                    return;
                }

                if (path == "/download/apk")
                {
                    if (!string.IsNullOrEmpty(ApkFilePath) && File.Exists(ApkFilePath))
                    {
                        byte[] fileBytes = File.ReadAllBytes(ApkFilePath);
                        res.ContentType = "application/vnd.android.package-archive";
                        res.AddHeader("Content-Disposition", "attachment; filename=\"OpsDeck-Mobile.apk\"");
                        res.ContentLength64 = fileBytes.Length;
                        res.OutputStream.Write(fileBytes, 0, fileBytes.Length);
                        res.Close();
                        Log("APK descargado por cliente móvil.");
                        return;
                    }
                    SendJson(res, 404, "{\"error\":\"APK no encontrado\"}");
                    return;
                }

                SendJson(res, 404, "{\"error\":\"Ruta no encontrada\"}");
            }
            catch (Exception ex)
            {
                try
                {
                    SendJson(res, 500, "{\"error\":\"" + Escape(ex.Message) + "\"}");
                }
                catch { }
            }
        }

        private void ExecuteDeckCommand(string cmd)
        {
            if (cmd.StartsWith("hotkey:"))
            {
                Win32.SendHotkey(cmd.Substring(7));
            }
            else if (cmd.StartsWith("launch:"))
            {
                Win32.LaunchApp(cmd.Substring(7));
            }
            else if (cmd.StartsWith("macro:"))
            {
                string m = cmd.Substring(6).ToLowerInvariant();
                if (m == "sum") Win32.SendHotkey("keys:=SUMA(){LEFT}");
                else if (m == "save") Win32.SendHotkey("ctrl+s");
                else if (m == "filter") Win32.SendHotkey("keys:^+L");
            }
        }

        private static string ReadBody(HttpListenerRequest req)
        {
            using (var reader = new StreamReader(req.InputStream, req.ContentEncoding))
            {
                return reader.ReadToEnd();
            }
        }

        private static string ExtractJsonField(string json, string field)
        {
            if (string.IsNullOrEmpty(json)) return null;
            string key = "\"" + field + "\"";
            int idx = json.IndexOf(key, StringComparison.OrdinalIgnoreCase);
            if (idx == -1) return null;
            int colon = json.IndexOf(':', idx + key.Length);
            if (colon == -1) return null;
            int start = colon + 1;
            while (start < json.Length && (json[start] == ' ' || json[start] == '"')) start++;
            int end = start;
            while (end < json.Length && json[end] != '"' && json[end] != ',' && json[end] != '}') end++;
            if (end > start) return json.Substring(start, end - start).Trim();
            return null;
        }

        private static string Escape(string s)
        {
            if (s == null) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", " ").Replace("\n", " ");
        }

        private static void SendJson(HttpListenerResponse res, int statusCode, string json)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(json);
            res.StatusCode = statusCode;
            res.ContentType = "application/json; charset=utf-8";
            res.ContentLength64 = bytes.Length;
            res.OutputStream.Write(bytes, 0, bytes.Length);
            res.Close();
        }

        private string DetectPrimaryLanIp()
        {
            try
            {
                foreach (NetworkInterface ni in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (ni.OperationalStatus == OperationalStatus.Up &&
                        (ni.NetworkInterfaceType == NetworkInterfaceType.Wireless80211 || ni.NetworkInterfaceType == NetworkInterfaceType.Ethernet))
                    {
                        foreach (UnicastIPAddressInformation ip in ni.GetIPProperties().UnicastAddresses)
                        {
                            if (ip.Address.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ip.Address))
                            {
                                string s = ip.Address.ToString();
                                if (s.StartsWith("192.168.") || s.StartsWith("10.")) return s;
                            }
                        }
                    }
                }
            }
            catch { }
            return "127.0.0.1";
        }
    }
}
