package com.opsdeck.mobile;

import android.os.Handler;
import android.os.Looper;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

public class NetworkClient {
    private String hostBaseUrl = "http://127.0.0.1:8620";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private OnConnectedListener listener;

    public interface OnConnectedListener {
        void onConnected(String url);
        void onTilesUpdated(List<Models.DeckTile> tiles);
        void onKanbanUpdated(List<Models.KanbanCard> cards);
    }

    public void setListener(OnConnectedListener listener) {
        this.listener = listener;
    }

    public void setHostUrl(String url) {
        if (url != null && !url.trim().isEmpty()) {
            this.hostBaseUrl = url.trim();
        }
    }

    public String getHostUrl() {
        return hostBaseUrl;
    }

    public void startAutoDiscovery() {
        new DiscoveryThread(this).start();
    }

    public void checkConnection(String testUrl) {
        new CheckConnectionThread(this, testUrl).start();
    }

    public void sendTrigger(String tileId, String command) {
        new TriggerThread(hostBaseUrl, tileId, command).start();
    }

    public void sendTouchpad(int dx, int dy, String action) {
        new TouchpadThread(hostBaseUrl, dx, dy, action).start();
    }

    public void syncTiles() {
        new SyncTilesThread(this, hostBaseUrl).start();
    }

    public void syncKanban() {
        new SyncKanbanThread(this, hostBaseUrl).start();
    }

    static class DiscoveryThread extends Thread {
        private final NetworkClient client;

        public DiscoveryThread(NetworkClient client) {
            this.client = client;
        }

        @Override
        public void run() {
            try {
                DatagramSocket socket = new DatagramSocket();
                socket.setBroadcast(true);
                socket.setSoTimeout(2500);

                byte[] sendData = "opsdeck:discover".getBytes("UTF-8");
                DatagramPacket sendPacket = new DatagramPacket(
                        sendData, sendData.length,
                        InetAddress.getByName("255.255.255.255"), 41234
                );
                socket.send(sendPacket);

                byte[] recvBuf = new byte[512];
                DatagramPacket recvPacket = new DatagramPacket(recvBuf, recvBuf.length);
                socket.receive(recvPacket);

                String response = new String(recvPacket.getData(), 0, recvPacket.getLength(), "UTF-8").trim();
                socket.close();

                if (response.startsWith("opsdeck:here:")) {
                    final String resolvedUrl = response.substring("opsdeck:here:".length());
                    client.hostBaseUrl = resolvedUrl;
                    client.mainHandler.post(new PostConnected(client, resolvedUrl));
                    client.syncTiles();
                    client.syncKanban();
                    return;
                }
            } catch (Exception ignored) { }

            client.checkConnection(client.hostBaseUrl);
        }
    }

    static class CheckConnectionThread extends Thread {
        private final NetworkClient client;
        private final String testUrl;

        public CheckConnectionThread(NetworkClient client, String testUrl) {
            this.client = client;
            this.testUrl = testUrl;
        }

        @Override
        public void run() {
            try {
                URL u = new URL(testUrl + "/health");
                HttpURLConnection conn = (HttpURLConnection) u.openConnection();
                conn.setConnectTimeout(2000);
                conn.setRequestMethod("GET");
                int code = conn.getResponseCode();
                conn.disconnect();

                if (code == 200) {
                    client.hostBaseUrl = testUrl;
                    client.mainHandler.post(new PostConnected(client, testUrl));
                    client.syncTiles();
                    client.syncKanban();
                }
            } catch (Exception e) {
                if (!"http://127.0.0.1:8620".equals(testUrl)) {
                    client.checkConnection("http://127.0.0.1:8620");
                }
            }
        }
    }

    static class TriggerThread extends Thread {
        private final String url;
        private final String id;
        private final String cmd;

        public TriggerThread(String url, String id, String cmd) {
            this.url = url;
            this.id = id;
            this.cmd = cmd;
        }

        @Override
        public void run() {
            try {
                URL u = new URL(url + "/api/trigger");
                HttpURLConnection conn = (HttpURLConnection) u.openConnection();
                conn.setConnectTimeout(1500);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);

                String json = "{\"id\":\"" + id + "\",\"command\":\"" + cmd + "\"}";
                OutputStream os = conn.getOutputStream();
                os.write(json.getBytes("UTF-8"));
                os.close();

                conn.getResponseCode();
                conn.disconnect();
            } catch (Exception ignored) { }
        }
    }

    static class TouchpadThread extends Thread {
        private final String url;
        private final int dx;
        private final int dy;
        private final String action;

        public TouchpadThread(String url, int dx, int dy, String action) {
            this.url = url;
            this.dx = dx;
            this.dy = dy;
            this.action = action;
        }

        @Override
        public void run() {
            try {
                URL u = new URL(url + "/api/touchpad");
                HttpURLConnection conn = (HttpURLConnection) u.openConnection();
                conn.setConnectTimeout(800);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);

                String json = "{\"dx\":\"" + dx + "\",\"dy\":\"" + dy + "\",\"action\":\"" + action + "\"}";
                OutputStream os = conn.getOutputStream();
                os.write(json.getBytes("UTF-8"));
                os.close();

                conn.getResponseCode();
                conn.disconnect();
            } catch (Exception ignored) { }
        }
    }

    static class SyncTilesThread extends Thread {
        private final NetworkClient client;
        private final String url;

        public SyncTilesThread(NetworkClient client, String url) {
            this.client = client;
            this.url = url;
        }

        @Override
        public void run() {
            try {
                URL u = new URL(url + "/api/tiles");
                HttpURLConnection conn = (HttpURLConnection) u.openConnection();
                conn.setConnectTimeout(2000);
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();
                conn.disconnect();

                final List<Models.DeckTile> tiles = client.parseTilesJson(sb.toString());
                if (!tiles.isEmpty()) {
                    client.mainHandler.post(new PostTiles(client, tiles));
                }
            } catch (Exception ignored) { }
        }
    }

    static class SyncKanbanThread extends Thread {
        private final NetworkClient client;
        private final String url;

        public SyncKanbanThread(NetworkClient client, String url) {
            this.client = client;
            this.url = url;
        }

        @Override
        public void run() {
            try {
                URL u = new URL(url + "/api/kanban");
                HttpURLConnection conn = (HttpURLConnection) u.openConnection();
                conn.setConnectTimeout(2000);
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();
                conn.disconnect();

                final List<Models.KanbanCard> cards = client.parseKanbanJson(sb.toString());
                if (!cards.isEmpty()) {
                    client.mainHandler.post(new PostKanban(client, cards));
                }
            } catch (Exception ignored) { }
        }
    }

    static class PostConnected implements Runnable {
        private final NetworkClient client;
        private final String url;
        public PostConnected(NetworkClient client, String url) { this.client = client; this.url = url; }
        @Override public void run() { if (client.listener != null) client.listener.onConnected(url); }
    }

    static class PostTiles implements Runnable {
        private final NetworkClient client;
        private final List<Models.DeckTile> tiles;
        public PostTiles(NetworkClient client, List<Models.DeckTile> tiles) { this.client = client; this.tiles = tiles; }
        @Override public void run() { if (client.listener != null) client.listener.onTilesUpdated(tiles); }
    }

    static class PostKanban implements Runnable {
        private final NetworkClient client;
        private final List<Models.KanbanCard> cards;
        public PostKanban(NetworkClient client, List<Models.KanbanCard> cards) { this.client = client; this.cards = cards; }
        @Override public void run() { if (client.listener != null) client.listener.onKanbanUpdated(cards); }
    }

    public List<Models.DeckTile> parseTilesJson(String json) {
        List<Models.DeckTile> list = new ArrayList<Models.DeckTile>();
        try {
            int start = json.indexOf("[");
            int end = json.lastIndexOf("]");
            if (start != -1 && end > start) {
                String arrayStr = json.substring(start + 1, end);
                String[] items = arrayStr.split("\\},\\{");
                for (String item : items) {
                    String id = extract(item, "id");
                    String label = extract(item, "label");
                    String sub = extract(item, "subLabel");
                    String glyph = extract(item, "glyph");
                    String color = extract(item, "color");
                    String cmd = extract(item, "command");
                    String sc = extract(item, "shortcut");
                    if (id != null && label != null) {
                        list.add(new Models.DeckTile(id, label, sub != null ? sub : "", glyph != null ? glyph : "⚡", color != null ? color : "#22D3EE", cmd != null ? cmd : "", sc != null ? sc : ""));
                    }
                }
            }
        } catch (Exception ignored) { }
        return list;
    }

    public List<Models.KanbanCard> parseKanbanJson(String json) {
        List<Models.KanbanCard> list = new ArrayList<Models.KanbanCard>();
        try {
            int start = json.indexOf("[");
            int end = json.lastIndexOf("]");
            if (start != -1 && end > start) {
                String arrayStr = json.substring(start + 1, end);
                String[] items = arrayStr.split("\\},\\{");
                for (String item : items) {
                    String id = extract(item, "id");
                    String code = extract(item, "code");
                    String title = extract(item, "title");
                    String project = extract(item, "project");
                    String priority = extract(item, "priority");
                    String status = extract(item, "status");
                    String dueTime = extract(item, "dueTime");
                    String badge = extract(item, "badge");
                    if (code != null && title != null) {
                        list.add(new Models.KanbanCard(id != null ? id : "", code, title, project != null ? project : "", priority != null ? priority : "medium", status != null ? status : "urgent", dueTime != null ? dueTime : "", badge != null ? badge : ""));
                    }
                }
            }
        } catch (Exception ignored) { }
        return list;
    }

    private String extract(String s, String key) {
        int idx = s.indexOf("\"" + key + "\"");
        if (idx == -1) return null;
        int colon = s.indexOf(":", idx);
        if (colon == -1) return null;
        int q1 = s.indexOf("\"", colon);
        if (q1 == -1) return null;
        int q2 = s.indexOf("\"", q1 + 1);
        if (q2 == -1) return null;
        return s.substring(q1 + 1, q2);
    }
}
