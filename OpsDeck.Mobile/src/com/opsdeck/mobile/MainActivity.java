package com.opsdeck.mobile;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity implements NetworkClient.OnConnectedListener, View.OnClickListener, View.OnTouchListener {
    private NetworkClient networkClient;
    private Vibrator vibrator;

    private LinearLayout rootLayout;
    private LinearLayout contentContainer;
    private LinearLayout bottomNav;
    private TextView statusBadge;
    private Button langToggleBtn;
    private EditText ipInput;

    private int activeTab = 0; // 0: Botonera, 1: Kanban, 2: Touchpad, 3: Ajustes
    private String lang = "es"; // "es" or "en"

    private final List<Models.DeckTile> tiles = new ArrayList<Models.DeckTile>();
    private final List<Models.KanbanCard> cards = new ArrayList<Models.KanbanCard>();

    // Touchpad state
    private float lastTouchX;
    private float lastTouchY;
    private long touchDownTime;

    private static final int ID_LANG_BTN = 1001;
    private static final int ID_NAV_BASE = 2000;
    private static final int ID_CLICK_LEFT = 3001;
    private static final int ID_CLICK_RIGHT = 3002;
    private static final int ID_CONNECT_MANUAL = 4001;
    private static final int ID_SCAN_UDP = 4002;
    private static final int ID_TOUCHPAD_SURFACE = 5001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        Window window = getWindow();
        if (window != null) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                window.setStatusBarColor(Color.parseColor("#0B0F19"));
                window.setNavigationBarColor(Color.parseColor("#0B0F19"));
            }
        }

        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        networkClient = new NetworkClient();
        networkClient.setListener(this);

        populateDefaultData();
        buildNativeUi();

        networkClient.startAutoDiscovery();
    }

    private GradientDrawable createCardDrawable(String bgColor, String strokeColor, int strokeWidth, float cornerRadius) {
        GradientDrawable gd = new GradientDrawable();
        gd.setColor(Color.parseColor(bgColor));
        if (strokeColor != null) {
            gd.setStroke(strokeWidth, Color.parseColor(strokeColor));
        }
        gd.setCornerRadius(cornerRadius);
        return gd;
    }

    private void populateDefaultData() {
        tiles.add(new Models.DeckTile("t-excel", "Excel", "Planillas & BI", "📊", "#22D3EE", "launch:excel", "Win+R"));
        tiles.add(new Models.DeckTile("t-outlook", "Outlook 365", "Bandeja Corp.", "✉️", "#38BDF8", "launch:outlook", "Win+R"));
        tiles.add(new Models.DeckTile("t-teams", "MS Teams", "Reuniones", "👥", "#818CF8", "launch:teams", "Win+R"));
        tiles.add(new Models.DeckTile("t-calc", "Calculadora", "Finanzas CLP", "🔢", "#34D399", "launch:calc", "Win+R"));
        tiles.add(new Models.DeckTile("t-mute", "Silenciar Mic", "Micrófono", "🎙️", "#EF4444", "hotkey:ctrl+shift+m", "Ctrl+Shift+M"));
        tiles.add(new Models.DeckTile("t-cam", "Cámara On/Off", "Video Conf.", "📹", "#FB923C", "hotkey:ctrl+shift+o", "Ctrl+Shift+O"));
        tiles.add(new Models.DeckTile("t-save", "Guardar Todo", "Atajo Rápido", "💾", "#A78BFA", "hotkey:ctrl+s", "Ctrl+S"));
        tiles.add(new Models.DeckTile("t-snip", "Captura", "Recortes", "✂️", "#2DD4BF", "launch:snippingtool", "Win+Shift+S"));

        cards.add(new Models.KanbanCard("c1", "INC-842", "Falla de enlace troncal FO Planta Sur", "Infraestructura", "critical", "urgent", "15 min", "ServiceNow"));
        cards.add(new Models.KanbanCard("c2", "TI-319", "Cierre balances financieros Q4", "Finanzas", "high", "in_progress", "45 min", "Outlook 365"));
        cards.add(new Models.KanbanCard("c3", "TI-205", "Renovación certificados TLS VPN", "Ciberseguridad", "medium", "in_progress", "2 hrs", "Jira ITSM"));
        cards.add(new Models.KanbanCard("c4", "TI-104", "Actualización antivirus estación", "Soporte TI", "low", "completed", "Listo", "GLPI"));
    }

    private void buildNativeUi() {
        rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setBackgroundColor(Color.parseColor("#0B0F19"));

        // 1. Top Bar Ejecutivo
        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setPadding(32, 28, 32, 28);
        topBar.setBackgroundColor(Color.parseColor("#0F172A"));
        topBar.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = new TextView(this);
        title.setText("OPSDECK");
        title.setTextSize(17);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setTextColor(Color.parseColor("#F8FAFC"));
        topBar.addView(title);

        statusBadge = new TextView(this);
        statusBadge.setText("  ● Buscando PC...");
        statusBadge.setTextSize(12);
        statusBadge.setTextColor(Color.parseColor("#FBBF24"));
        LinearLayout.LayoutParams sParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        topBar.addView(statusBadge, sParams);

        langToggleBtn = new Button(this);
        langToggleBtn.setId(ID_LANG_BTN);
        langToggleBtn.setText(lang.equals("es") ? "🇪🇸 ES" : "🇺🇸 EN");
        langToggleBtn.setTextSize(11);
        langToggleBtn.setTextColor(Color.parseColor("#22D3EE"));
        langToggleBtn.setBackground(createCardDrawable("#1E293B", "#334155", 1, 16f));
        langToggleBtn.setPadding(24, 8, 24, 8);
        langToggleBtn.setOnClickListener(this);
        topBar.addView(langToggleBtn);

        rootLayout.addView(topBar);

        // 2. Content Container
        contentContainer = new LinearLayout(this);
        contentContainer.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams cParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f
        );
        rootLayout.addView(contentContainer, cParams);

        // 3. Bottom Navigation Bar Ejecutivo
        bottomNav = new LinearLayout(this);
        bottomNav.setOrientation(LinearLayout.HORIZONTAL);
        bottomNav.setBackgroundColor(Color.parseColor("#0F172A"));
        bottomNav.setPadding(12, 16, 12, 16);

        String[] tabs = lang.equals("es")
                ? new String[]{"Botonera", "Kanban", "Touchpad", "Ajustes"}
                : new String[]{"Deck", "Kanban", "Touchpad", "Settings"};

        for (int i = 0; i < tabs.length; i++) {
            Button navBtn = new Button(this);
            navBtn.setId(ID_NAV_BASE + i);
            navBtn.setText(tabs[i]);
            navBtn.setTextSize(12);
            navBtn.setTextColor(activeTab == i ? Color.parseColor("#22D3EE") : Color.parseColor("#94A3B8"));
            navBtn.setBackgroundColor(Color.TRANSPARENT);
            navBtn.setOnClickListener(this);
            LinearLayout.LayoutParams bParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
            bottomNav.addView(navBtn, bParams);
        }

        rootLayout.addView(bottomNav);

        setContentView(rootLayout);
        renderActiveTab();
    }

    private void updateBottomNav() {
        String[] tabs = lang.equals("es")
                ? new String[]{"Botonera", "Kanban", "Touchpad", "Ajustes"}
                : new String[]{"Deck", "Kanban", "Touchpad", "Settings"};

        for (int i = 0; i < bottomNav.getChildCount(); i++) {
            Button b = (Button) bottomNav.getChildAt(i);
            b.setText(tabs[i]);
            b.setTextColor(activeTab == i ? Color.parseColor("#22D3EE") : Color.parseColor("#94A3B8"));
            b.setTypeface(activeTab == i ? Typeface.DEFAULT_BOLD : Typeface.DEFAULT);
        }
    }

    private void renderActiveTab() {
        contentContainer.removeAllViews();

        if (activeTab == 0) {
            renderBotoneraView();
        } else if (activeTab == 1) {
            renderKanbanView();
        } else if (activeTab == 2) {
            renderTouchpadView();
        } else if (activeTab == 3) {
            renderSettingsView();
        }
    }

    private void renderBotoneraView() {
        ScrollView scroll = new ScrollView(this);
        LinearLayout inner = new LinearLayout(this);
        inner.setOrientation(LinearLayout.VERTICAL);
        inner.setPadding(28, 28, 28, 28);

        TextView header = new TextView(this);
        header.setText(lang.equals("es") ? "Botonera Táctil en Vivo" : "Live Touch Deck");
        header.setTextSize(17);
        header.setTypeface(Typeface.DEFAULT_BOLD);
        header.setTextColor(Color.parseColor("#F8FAFC"));
        inner.addView(header);

        TextView sub = new TextView(this);
        sub.setText(lang.equals("es") ? "Toca cualquier tarjeta con respuesta háptica para accionarla en el PC." : "Tap any tile with haptic feedback to execute on PC.");
        sub.setTextSize(12);
        sub.setTextColor(Color.parseColor("#94A3B8"));
        sub.setPadding(0, 4, 0, 24);
        inner.addView(sub);

        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(2);

        int btnWidth = (getResources().getDisplayMetrics().widthPixels - 76) / 2;

        for (int i = 0; i < tiles.size(); i++) {
            final Models.DeckTile tile = tiles.get(i);
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setBackground(createCardDrawable("#151D2E", "#1E293B", 1, 20f));
            card.setPadding(24, 24, 24, 24);
            card.setTag(tile);
            card.setOnClickListener(this);

            View bar = new View(this);
            bar.setBackgroundColor(Color.parseColor(tile.color));
            card.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 6));

            TextView glyph = new TextView(this);
            glyph.setText(tile.glyph);
            glyph.setTextSize(24);
            glyph.setPadding(0, 14, 0, 8);
            card.addView(glyph);

            TextView lbl = new TextView(this);
            lbl.setText(tile.label);
            lbl.setTextSize(15);
            lbl.setTypeface(Typeface.DEFAULT_BOLD);
            lbl.setTextColor(Color.parseColor("#F8FAFC"));
            card.addView(lbl);

            TextView subLbl = new TextView(this);
            subLbl.setText(tile.subLabel + " · " + tile.shortcut);
            subLbl.setTextSize(11);
            subLbl.setTextColor(Color.parseColor("#94A3B8"));
            card.addView(subLbl);

            GridLayout.LayoutParams gParams = new GridLayout.LayoutParams();
            gParams.width = btnWidth;
            gParams.setMargins(10, 10, 10, 10);
            grid.addView(card, gParams);
        }

        inner.addView(grid);
        scroll.addView(inner);
        contentContainer.addView(scroll);
    }

    private void renderKanbanView() {
        ScrollView scroll = new ScrollView(this);
        LinearLayout inner = new LinearLayout(this);
        inner.setOrientation(LinearLayout.VERTICAL);
        inner.setPadding(28, 28, 28, 28);

        TextView header = new TextView(this);
        header.setText(lang.equals("es") ? "Tablero Kanban & Tareas IA" : "Kanban Board & AI Tasks");
        header.setTextSize(17);
        header.setTypeface(Typeface.DEFAULT_BOLD);
        header.setTextColor(Color.parseColor("#F8FAFC"));
        inner.addView(header);

        for (int i = 0; i < cards.size(); i++) {
            Models.KanbanCard c = cards.get(i);
            LinearLayout item = new LinearLayout(this);
            item.setOrientation(LinearLayout.VERTICAL);
            item.setBackground(createCardDrawable("#151D2E", "#1E293B", 1, 18f));
            item.setPadding(24, 20, 24, 20);

            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            p.setMargins(0, 14, 0, 0);

            TextView code = new TextView(this);
            code.setText(c.code + " · " + c.badge);
            code.setTextSize(12);
            code.setTypeface(Typeface.DEFAULT_BOLD);
            code.setTextColor(c.priority.equals("critical") ? Color.parseColor("#EF4444") : Color.parseColor("#38BDF8"));
            item.addView(code);

            TextView title = new TextView(this);
            title.setText(c.title);
            title.setTextSize(14);
            title.setTextColor(Color.parseColor("#F8FAFC"));
            title.setPadding(0, 6, 0, 6);
            item.addView(title);

            TextView sla = new TextView(this);
            sla.setText("⏱ SLA: " + c.dueTime + " · " + c.project);
            sla.setTextSize(11);
            sla.setTextColor(Color.parseColor("#94A3B8"));
            item.addView(sla);

            inner.addView(item, p);
        }

        scroll.addView(inner);
        contentContainer.addView(scroll);
    }

    private void renderTouchpadView() {
        LinearLayout inner = new LinearLayout(this);
        inner.setOrientation(LinearLayout.VERTICAL);
        inner.setPadding(28, 28, 28, 28);

        TextView header = new TextView(this);
        header.setText(lang.equals("es") ? "Touchpad Remoto (0 ms)" : "Remote Touchpad (0 ms)");
        header.setTextSize(17);
        header.setTypeface(Typeface.DEFAULT_BOLD);
        header.setTextColor(Color.parseColor("#F8FAFC"));
        inner.addView(header);

        View pad = new View(this);
        pad.setId(ID_TOUCHPAD_SURFACE);
        pad.setBackground(createCardDrawable("#0F172A", "#22D3EE", 2, 22f));
        LinearLayout.LayoutParams padParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f
        );
        padParams.setMargins(0, 20, 0, 20);
        pad.setOnTouchListener(this);

        inner.addView(pad, padParams);

        // Botones de Clic Izquierdo y Derecho con hápticos
        LinearLayout btnRow = new LinearLayout(this);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);

        Button leftBtn = new Button(this);
        leftBtn.setId(ID_CLICK_LEFT);
        leftBtn.setText(lang.equals("es") ? "CLIC IZQUIERDO" : "LEFT CLICK");
        leftBtn.setBackground(createCardDrawable("#1E293B", "#334155", 1, 16f));
        leftBtn.setTextColor(Color.WHITE);
        leftBtn.setTypeface(Typeface.DEFAULT_BOLD);
        leftBtn.setOnClickListener(this);
        LinearLayout.LayoutParams lParams = new LinearLayout.LayoutParams(0, 120, 1.0f);
        lParams.setMargins(0, 0, 8, 0);
        btnRow.addView(leftBtn, lParams);

        Button rightBtn = new Button(this);
        rightBtn.setId(ID_CLICK_RIGHT);
        rightBtn.setText(lang.equals("es") ? "CLIC DERECHO" : "RIGHT CLICK");
        rightBtn.setBackground(createCardDrawable("#1E293B", "#334155", 1, 16f));
        rightBtn.setTextColor(Color.WHITE);
        rightBtn.setTypeface(Typeface.DEFAULT_BOLD);
        rightBtn.setOnClickListener(this);
        LinearLayout.LayoutParams rParams = new LinearLayout.LayoutParams(0, 120, 1.0f);
        rParams.setMargins(8, 0, 0, 0);
        btnRow.addView(rightBtn, rParams);

        inner.addView(btnRow);
        contentContainer.addView(inner);
    }

    private void renderSettingsView() {
        ScrollView scroll = new ScrollView(this);
        LinearLayout inner = new LinearLayout(this);
        inner.setOrientation(LinearLayout.VERTICAL);
        inner.setPadding(28, 28, 28, 28);

        TextView header = new TextView(this);
        header.setText(lang.equals("es") ? "Ajustes de Conexión" : "Connection Settings");
        header.setTextSize(17);
        header.setTypeface(Typeface.DEFAULT_BOLD);
        header.setTextColor(Color.parseColor("#F8FAFC"));
        inner.addView(header);

        TextView ipLbl = new TextView(this);
        ipLbl.setText(lang.equals("es") ? "Dirección IP del PC:" : "PC IP Address:");
        ipLbl.setTextColor(Color.parseColor("#94A3B8"));
        ipLbl.setPadding(0, 20, 0, 8);
        inner.addView(ipLbl);

        ipInput = new EditText(this);
        ipInput.setText(networkClient.getHostUrl());
        ipInput.setTextColor(Color.WHITE);
        ipInput.setBackground(createCardDrawable("#151D2E", "#1E293B", 1, 14f));
        ipInput.setPadding(24, 20, 24, 20);
        inner.addView(ipInput);

        Button connectBtn = new Button(this);
        connectBtn.setId(ID_CONNECT_MANUAL);
        connectBtn.setText(lang.equals("es") ? "Conectar Manualmente" : "Connect Manually");
        connectBtn.setBackground(createCardDrawable("#22D3EE", null, 0, 14f));
        connectBtn.setTextColor(Color.parseColor("#0B0F19"));
        connectBtn.setTypeface(Typeface.DEFAULT_BOLD);
        connectBtn.setOnClickListener(this);
        LinearLayout.LayoutParams btnP1 = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        btnP1.setMargins(0, 20, 0, 12);
        inner.addView(connectBtn, btnP1);

        Button scanBtn = new Button(this);
        scanBtn.setId(ID_SCAN_UDP);
        scanBtn.setText(lang.equals("es") ? "Auto-Detectar PC por Wi-Fi (UDP)" : "Auto-Detect PC on Wi-Fi");
        scanBtn.setBackground(createCardDrawable("#1E293B", "#334155", 1, 14f));
        scanBtn.setTextColor(Color.WHITE);
        scanBtn.setOnClickListener(this);
        inner.addView(scanBtn);

        TextView diag = new TextView(this);
        diag.setText(lang.equals("es") ? "\n• Puerto UDP: 41234\n• Puerto HTTP: 8620\n• Latencia estimada: < 2 ms" : "\n• UDP Port: 41234\n• HTTP Port: 8620\n• Estimated Latency: < 2 ms");
        diag.setTextColor(Color.parseColor("#64748B"));
        diag.setTextSize(12);
        inner.addView(diag);

        scroll.addView(inner);
        contentContainer.addView(scroll);
    }

    @Override
    public void onClick(View v) {
        triggerHaptic();
        int id = v.getId();

        if (id == ID_LANG_BTN) {
            lang = lang.equals("es") ? "en" : "es";
            langToggleBtn.setText(lang.equals("es") ? "🇪🇸 ES" : "🇺🇸 EN");
            updateBottomNav();
            renderActiveTab();
            return;
        }

        if (id >= ID_NAV_BASE && id < ID_NAV_BASE + 4) {
            activeTab = id - ID_NAV_BASE;
            updateBottomNav();
            renderActiveTab();
            return;
        }

        if (id == ID_CLICK_LEFT) {
            networkClient.sendTouchpad(0, 0, "click");
            return;
        }

        if (id == ID_CLICK_RIGHT) {
            networkClient.sendTouchpad(0, 0, "rightclick");
            return;
        }

        if (id == ID_CONNECT_MANUAL) {
            if (ipInput != null) {
                String manual = ipInput.getText().toString().trim();
                networkClient.setHostUrl(manual);
                networkClient.syncTiles();
                networkClient.syncKanban();
            }
            return;
        }

        if (id == ID_SCAN_UDP) {
            statusBadge.setText("  ● Buscando...");
            statusBadge.setTextColor(Color.parseColor("#FBBF24"));
            networkClient.startAutoDiscovery();
            return;
        }

        if (v.getTag() instanceof Models.DeckTile) {
            Models.DeckTile tile = (Models.DeckTile) v.getTag();
            networkClient.sendTrigger(tile.id, tile.command);
            Toast.makeText(this, (lang.equals("es") ? "Ejecutando: " : "Triggering: ") + tile.label, Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public boolean onTouch(View v, MotionEvent event) {
        if (v.getId() == ID_TOUCHPAD_SURFACE) {
            int action = event.getActionMasked();
            float x = event.getX();
            float y = event.getY();

            if (action == MotionEvent.ACTION_DOWN) {
                lastTouchX = x;
                lastTouchY = y;
                touchDownTime = System.currentTimeMillis();
                return true;
            } else if (action == MotionEvent.ACTION_MOVE) {
                float dx = (x - lastTouchX) * 1.5f;
                float dy = (y - lastTouchY) * 1.5f;
                lastTouchX = x;
                lastTouchY = y;

                if (Math.abs(dx) > 0.5f || Math.abs(dy) > 0.5f) {
                    networkClient.sendTouchpad((int) dx, (int) dy, "move");
                }
                return true;
            } else if (action == MotionEvent.ACTION_UP) {
                long duration = System.currentTimeMillis() - touchDownTime;
                if (duration < 180) {
                    networkClient.sendTouchpad(0, 0, "click");
                    triggerHaptic();
                }
                return true;
            }
        }
        return false;
    }

    private void triggerHaptic() {
        if (vibrator != null) {
            try {
                vibrator.vibrate(35);
            } catch (Exception ignored) { }
        }
    }

    @Override
    public void onConnected(final String url) {
        runOnUiThread(new OnConnectedRunnable(this, url));
    }

    @Override
    public void onTilesUpdated(final List<Models.DeckTile> loadedTiles) {
        runOnUiThread(new OnTilesUpdatedRunnable(this, loadedTiles));
    }

    @Override
    public void onKanbanUpdated(final List<Models.KanbanCard> loadedCards) {
        runOnUiThread(new OnKanbanUpdatedRunnable(this, loadedCards));
    }

    static class OnConnectedRunnable implements Runnable {
        private final MainActivity activity;
        private final String url;

        public OnConnectedRunnable(MainActivity activity, String url) {
            this.activity = activity;
            this.url = url;
        }

        @Override
        public void run() {
            activity.statusBadge.setText(activity.lang.equals("es") ? "  ● CONECTADO PC" : "  ● PC CONNECTED");
            activity.statusBadge.setTextColor(Color.parseColor("#34D399"));
            if (activity.ipInput != null) activity.ipInput.setText(url);
        }
    }

    static class OnTilesUpdatedRunnable implements Runnable {
        private final MainActivity activity;
        private final List<Models.DeckTile> loadedTiles;

        public OnTilesUpdatedRunnable(MainActivity activity, List<Models.DeckTile> loadedTiles) {
            this.activity = activity;
            this.loadedTiles = loadedTiles;
        }

        @Override
        public void run() {
            if (loadedTiles != null && !loadedTiles.isEmpty()) {
                activity.tiles.clear();
                activity.tiles.addAll(loadedTiles);
                if (activity.activeTab == 0) {
                    activity.renderBotoneraView();
                }
            }
        }
    }

    static class OnKanbanUpdatedRunnable implements Runnable {
        private final MainActivity activity;
        private final List<Models.KanbanCard> loadedCards;

        public OnKanbanUpdatedRunnable(MainActivity activity, List<Models.KanbanCard> loadedCards) {
            this.activity = activity;
            this.loadedCards = loadedCards;
        }

        @Override
        public void run() {
            if (loadedCards != null && !loadedCards.isEmpty()) {
                activity.cards.clear();
                activity.cards.addAll(loadedCards);
                if (activity.activeTab == 1) {
                    activity.renderKanbanView();
                }
            }
        }
    }
}
