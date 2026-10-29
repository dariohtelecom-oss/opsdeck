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
        private TcpListener tcpListener;
        private UdpClient udpServer;
        private Thread httpThread;
        private Thread udpThread;
        private volatile bool isRunning;
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
            Log("Iniciando HostServer...");

            try
            {
                // TcpListener on 0.0.0.0 does NOT require Administrator privileges or URLACL reservations
                tcpListener = new TcpListener(IPAddress.Any, port);
                tcpListener.Start();
                httpThread = new Thread(HttpWorker) { IsBackground = true };
                httpThread.Start();
                Log("Servidor HTTP nativo (TcpListener) escuchando en 0.0.0.0:" + port + " (LAN: " + PrimaryLanIp + ")");
            }
            catch (Exception ex)
            {
                Log("Error iniciando servidor HTTP en puerto " + port + ": " + ex.Message + " | " + ex.StackTrace);
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
            try { if (tcpListener != null) tcpListener.Stop(); } catch { }
            try { if (udpServer != null) udpServer.Close(); } catch { }
        }

        private void Log(string msg)
        {
            try
            {
                File.AppendAllText(@"C:\Users\Viver\Desktop\opsdeck-debug.log", "[" + DateTime.Now.ToString("HH:mm:ss.fff") + "] " + msg + "\r\n");
            }
            catch { }
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
                        Log("Dispositivo móvil detectado vía UDP desde " + clientEp.Address + ". Respondiendo enlace.");
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
            while (isRunning)
            {
                try
                {
                    TcpClient client = tcpListener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(ProcessClient, client);
                }
                catch
                {
                    if (!isRunning) break;
                }
            }
        }

        private void ProcessClient(object state)
        {
            TcpClient client = state as TcpClient;
            if (client == null) return;

            try
            {
                client.ReceiveTimeout = 8000;
                client.SendTimeout = 15000;
                using (NetworkStream stream = client.GetStream())
                {
                    // Leer encabezados HTTP
                    byte[] buffer = new byte[8192];
                    int bytesRead = stream.Read(buffer, 0, buffer.Length);
                    if (bytesRead <= 0) return;

                    string rawRequest = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                    int headerEnd = rawRequest.IndexOf("\r\n\r\n", StringComparison.Ordinal);
                    if (headerEnd == -1) headerEnd = rawRequest.Length;

                    string headersPart = rawRequest.Substring(0, headerEnd);
                    string[] lines = headersPart.Split(new string[] { "\r\n" }, StringSplitOptions.None);
                    if (lines.Length == 0) return;

                    string[] requestLine = lines[0].Split(' ');
                    if (requestLine.Length < 2) return;

                    string method = requestLine[0].ToUpperInvariant();
                    string rawUrl = requestLine[1];
                    string path = rawUrl.Split('?')[0].ToLowerInvariant();

                    // Preparamos el cuerpo si es POST
                    string body = "";
                    if (method == "POST")
                    {
                        int contentLength = 0;
                        foreach (string h in lines)
                        {
                            if (h.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase))
                            {
                                int.TryParse(h.Substring(15).Trim(), out contentLength);
                                break;
                            }
                        }

                        int bodyStart = headerEnd + 4;
                        int initialBodyBytes = bytesRead - bodyStart;
                        if (initialBodyBytes > 0)
                        {
                            body = Encoding.UTF8.GetString(buffer, bodyStart, initialBodyBytes);
                        }

                        int remaining = contentLength - initialBodyBytes;
                        while (remaining > 0)
                        {
                            int chunk = stream.Read(buffer, 0, Math.Min(buffer.Length, remaining));
                            if (chunk <= 0) break;
                            body += Encoding.UTF8.GetString(buffer, 0, chunk);
                            remaining -= chunk;
                        }
                    }

                    // CORS pre-flight
                    if (method == "OPTIONS")
                    {
                        SendRawResponse(stream, 204, "No Content", "text/plain", new byte[0], null);
                        return;
                    }

                    // Rutas HTTP
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
                        SendJson(stream, 200, json);
                        return;
                    }

                    if (path == "/api/context")
                    {
                        string win = GetActiveWindowFunc != null ? GetActiveWindowFunc() : "Escritorio";
                        string json = string.Format("{{\"ok\":true,\"activeWindow\":\"{0}\"}}", Escape(win));
                        SendJson(stream, 200, json);
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
                        SendJson(stream, 200, sb.ToString());
                        return;
                    }

                    if (path == "/api/trigger" && method == "POST")
                    {
                        string tileId = ExtractJsonField(body, "id");
                        string cmd = ExtractJsonField(body, "command");

                        if (!string.IsNullOrEmpty(cmd))
                        {
                            ExecuteDeckCommand(cmd);
                        }

                        if (OnTileTriggered != null) OnTileTriggered(tileId ?? cmd);
                        SendJson(stream, 200, "{\"ok\":true,\"triggered\":\"" + Escape(tileId) + "\"}");
                        return;
                    }

                    if (path == "/api/touchpad" && method == "POST")
                    {
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
                        SendJson(stream, 200, "{\"ok\":true}");
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
                        SendJson(stream, 200, sb.ToString());
                        return;
                    }

                    // Portal de Descarga Web Móvil
                    if (path == "" || path == "/" || path == "/mobile" || path == "/download")
                    {
                        string html = "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Descargar OpsDeck Mobile</title><style>body{background:#0B0F19;color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:32px 16px;margin:0}.card{background:#111827;border:1px solid #1F2937;border-radius:16px;padding:28px 20px;max-width:380px;margin:0 auto;box-shadow:0 10px 25px rgba(0,0,0,0.5)}.badge{display:inline-block;background:#1F2937;color:#22D3EE;font-size:12px;font-weight:bold;padding:4px 12px;border-radius:20px;margin-bottom:12px}h1{font-size:22px;margin:8px 0;color:#F8FAFC}p{color:#94A3B8;font-size:14px;line-height:1.5;margin:8px 0 24px}.btn{display:block;background:#22D3EE;color:#0B0F19;font-weight:bold;text-decoration:none;padding:16px;border-radius:12px;font-size:16px;margin-bottom:16px;box-shadow:0 4px 14px rgba(34,211,238,0.4)}.step{background:#1E293B;border-radius:8px;padding:12px;margin-bottom:10px;text-align:left;font-size:13px;color:#CBD5E1}b{color:#22D3EE}</style><script>setTimeout(function(){window.location.href='/download/apk';},1200);</script></head><body><div class=\"card\"><div class=\"badge\">OPSDECK ENTERPRISE v2.5</div><h1>OpsDeck Mobile</h1><p>Descarga directa de la aplicación nativa para tu celular Android.</p><a href=\"/download/apk\" class=\"btn\">📥 DESCARGAR APK DIRECTO (33 KB)</a><div class=\"step\"><b>Paso 1:</b> Si tu navegador te pregunta, presiona <b>Descargar de todos modos</b>.</div><div class=\"step\"><b>Paso 2:</b> Toca la notificación y presiona <b>Instalar</b>.</div><div class=\"step\"><b>Paso 3:</b> Abre la app. Detectará automáticamente este PC en tu Wi-Fi.</div></div></body></html>";
                        byte[] htmlBytes = Encoding.UTF8.GetBytes(html);
                        SendRawResponse(stream, 200, "OK", "text/html; charset=utf-8", htmlBytes, null);
                        return;
                    }

                    // Descarga directa del APK
                    if (path == "/download/apk")
                    {
                        string resolvedApk = null;
                        string[] candidates = new string[]
                        {
                            ApkFilePath,
                            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "OpsDeck-Mobile.apk"),
                            @"C:\Users\Viver\Desktop\OpsDeck-Mobile.apk",
                            @"c:\Users\Viver\Desktop\projecto iphone\OpsDeck.Mobile\OpsDeck-Mobile.apk",
                            @"c:\Users\Viver\Desktop\projecto iphone\OpsDeck.Desktop\OpsDeck-Mobile.apk"
                        };

                        foreach (string c in candidates)
                        {
                            if (!string.IsNullOrEmpty(c) && File.Exists(c))
                            {
                                resolvedApk = c;
                                break;
                            }
                        }

                        if (resolvedApk != null)
                        {
                            byte[] fileBytes = File.ReadAllBytes(resolvedApk);
                            string extraHeaders = "Content-Disposition: attachment; filename=\"OpsDeck-Mobile.apk\"\r\n";
                            SendRawResponse(stream, 200, "OK", "application/vnd.android.package-archive", fileBytes, extraHeaders);
                            Log("APK descargado exitosamente por cliente móvil.");
                            return;
                        }

                        SendJson(stream, 404, "{\"error\":\"APK no encontrado en el servidor\"}");
                        return;
                    }

                    SendJson(stream, 404, "{\"error\":\"Ruta no encontrada\"}");
                }
            }
            catch
            {
                // Conexión finalizada por el cliente o timeout normal
            }
            finally
            {
                try { client.Close(); } catch { }
            }
        }

        private static void SendRawResponse(NetworkStream stream, int statusCode, string statusMsg, string contentType, byte[] payload, string extraHeaders)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("HTTP/1.1 ").Append(statusCode).Append(" ").Append(statusMsg).Append("\r\n");
            sb.Append("Server: OpsDeck-Native/2.5\r\n");
            sb.Append("Content-Type: ").Append(contentType).Append("\r\n");
            sb.Append("Content-Length: ").Append(payload != null ? payload.Length : 0).Append("\r\n");
            sb.Append("Access-Control-Allow-Origin: *\r\n");
            sb.Append("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n");
            sb.Append("Access-Control-Allow-Headers: Content-Type, Authorization\r\n");
            sb.Append("Connection: close\r\n");
            if (!string.IsNullOrEmpty(extraHeaders))
            {
                sb.Append(extraHeaders);
            }
            sb.Append("\r\n");

            byte[] headerBytes = Encoding.UTF8.GetBytes(sb.ToString());
            stream.Write(headerBytes, 0, headerBytes.Length);
            if (payload != null && payload.Length > 0)
            {
                stream.Write(payload, 0, payload.Length);
            }
            stream.Flush();
        }

        private static void SendJson(NetworkStream stream, int statusCode, string json)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(json);
            SendRawResponse(stream, statusCode, statusCode == 200 ? "OK" : "Error", "application/json; charset=utf-8", bytes, null);
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
                                if (s.StartsWith("192.168.") || s.StartsWith("10.") || s.StartsWith("172.")) return s;
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
