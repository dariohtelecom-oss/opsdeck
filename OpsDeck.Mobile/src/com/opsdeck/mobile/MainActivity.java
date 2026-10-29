package com.opsdeck.mobile;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
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

    private void populateDefaultData() {
        tiles.add(new Models.DeckTile("t-excel", "Excel", "Planillas", "📊", "#22D3EE", "launch:excel", "Win+R"));
        tiles.add(new Models.DeckTile("t-outlook", "Outlook", "Correo", "✉️", "#38BDF8", "launch:outlook", "Win+R"));
        tiles.add(new Models.DeckTile("t-teams", "Teams", "Reunión", "👥", "#818CF8", "launch:teams", "Win+R"));
        tiles.add(new Models.DeckTile("t-mute", "Mute Mic", "Silenciar", "🎙️", "#EF4444", "hotkey:ctrl+shift+m", "Ctrl+Shift+M"));
        tiles.add(new Models.DeckTile("t-cam", "Cámara", "Video", "📹", "#FB923C", "hotkey:ctrl+shift+o", "Ctrl+Shift+O"));
        tiles.add(new Models.DeckTile("t-save", "Guardar", "Atajo", "💾", "#34D399", "hotkey:ctrl+s", "Ctrl+S"));

        cards.add(new Models.KanbanCard("c1", "INC-842", "Falla de enlace troncal FO Planta Sur", "Infraestructura", "critical", "urgent", "15 min", "ServiceNow"));
        cards.add(new Models.KanbanCard("c2", "TI-319", "Cierre balances financieros Q4", "Finanzas", "high", "in_progress", "45 min", "Outlook 365"));
        cards.add(new Models.KanbanCard("c3", "TI-205", "Renovación certificados TLS VPN", "Ciberseguridad", "medium", "in_progress", "2 hrs", "Jira ITSM"));
    }

    private void buildNativeUi() {
        rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setBackgroundColor(Color.parseColor("#0B0F19"));

        // 1. Top Bar
        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setPadding(32, 28, 32, 28);
        topBar.setBackgroundColor(Color.parseColor("#111827"));
        topBar.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = new TextView(this);
        title.setText("OPSDECK");
        title.setTextSize(18);
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
        langToggleBtn.setBackgroundColor(Color.parseColor("#1F2937"));
        langToggleBtn.setPadding(20, 8, 20, 8);
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

        // 3. Bottom Navigation Bar
        bottomNav = new LinearLayout(this);
        bottomNav.setOrientation(LinearLayout.HORIZONTAL);
        bottomNav.setBackgroundColor(Color.parseColor("#111827"));
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
        header.setTextSize(16);
        header.setTypeface(Typeface.DEFAULT_BOLD);
        header.setTextColor(Color.parseColor("#F8FAFC"));
        inner.addView(header);

        TextView sub = new TextView(this);
        sub.setText(lang.equals("es") ? "Toca cualquier botón para ejecutarlo en tu PC al instante." : "Tap any button to execute on PC instantly.");
        sub.setTextSize(12);
        sub.setTextColor(Color.parseColor("#94A3B8"));
        sub.setPadding(0, 4, 0, 24);
        inner.addView(sub);

        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(2);

        int btnWidth = (getResources().getDisplayMetrics().widthPixels - 72) / 2;

        for (int i = 0; i < tiles.size(); i++) {
            final Models.DeckTile tile = tiles.get(i);
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setBackgroundColor(Color.parseColor("#1E293B"));
            card.setPadding(24, 28, 24, 28);
            card.setTag(tile);
            card.setOnClickListener(this);

            View bar = new View(this);
            bar.setBackgroundColor(Color.parseColor(tile.color));
            card.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 6));

            TextView glyph = new TextView(this);
            glyph.setText(tile.glyph);
            glyph.setTextSize(24);
            glyph.setPadding(0, 16, 0, 8);
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
        header.setTextSize(16);
        header.setTypeface(Typeface.DEFAULT_BOLD);
        header.setTextColor(Color.parseColor("#F8FAFC"));
        inner.addView(header);

        for (int i = 0; i < cards.size(); i++) {
            Models.KanbanCard c = cards.get(i);
            LinearLayout item = new LinearLayout(this);
            item.setOrientation(LinearLayout.VERTICAL);
            item.setBackgroundColor(Color.parseColor("#1E293B"));
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
            sla.setText("SLA: " + c.dueTime + " · " + c.project);
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
        header.setTextSize(16);
        header.setTypeface(Typeface.DEFAULT_BOLD);
        header.setTextColor(Color.parseColor("#F8FAFC"));
        inner.addView(header);

        View pad = new View(this);
        pad.setId(ID_TOUCHPAD_SURFACE);
        pad.setBackgroundColor(Color.parseColor("#1E293B"));
        LinearLayout.LayoutParams padParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f
        );
        padParams.setMargins(0, 20, 0, 20);
        pad.setOnTouchListener(this);

        inner.addView(pad, padParams);

        // Buttons for Left / Right click
        LinearLayout btnRow = new LinearLayout(this);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);

        Button leftBtn = new Button(this);
        leftBtn.setId(ID_CLICK_LEFT);
        leftBtn.setText(lang.equals("es") ? "Clic Izquierdo" : "Left Click");
        leftBtn.setBackgroundColor(Color.parseColor("#1F2937"));
        leftBtn.setTextColor(Color.WHITE);
        leftBtn.setOnClickListener(this);
        btnRow.addView(leftBtn, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        Button rightBtn = new Button(this);
        rightBtn.setId(ID_CLICK_RIGHT);
        rightBtn.setText(lang.equals("es") ? "Clic Derecho" : "Right Click");
        rightBtn.setBackgroundColor(Color.parseColor("#1F2937"));
        rightBtn.setTextColor(Color.WHITE);
        rightBtn.setOnClickListener(this);
        btnRow.addView(rightBtn, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

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
        header.setTextSize(16);
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
        ipInput.setBackgroundColor(Color.parseColor("#1E293B"));
        ipInput.setPadding(20, 16, 20, 16);
        inner.addView(ipInput);

        Button connectBtn = new Button(this);
        connectBtn.setId(ID_CONNECT_MANUAL);
        connectBtn.setText(lang.equals("es") ? "Conectar Manualmente" : "Connect Manually");
        connectBtn.setBackgroundColor(Color.parseColor("#22D3EE"));
        connectBtn.setTextColor(Color.parseColor("#0B0F19"));
        connectBtn.setTypeface(Typeface.DEFAULT_BOLD);
        connectBtn.setOnClickListener(this);
        inner.addView(connectBtn);

        Button scanBtn = new Button(this);
        scanBtn.setId(ID_SCAN_UDP);
        scanBtn.setText(lang.equals("es") ? "Auto-Detectar PC por Wi-Fi (UDP)" : "Auto-Detect PC on Wi-Fi");
        scanBtn.setBackgroundColor(Color.parseColor("#1F2937"));
        scanBtn.setTextColor(Color.WHITE);
        scanBtn.setOnClickListener(this);
        inner.addView(scanBtn);

        scroll.addView(inner);
        contentContainer.addView(scroll);
    }

    @Override
    public void onClick(View v) {
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
            if (vibrator != null) vibrator.vibrate(15);
            networkClient.sendTouchpad(0, 0, "click");
            return;
        }

        if (id == ID_CLICK_RIGHT) {
            if (vibrator != null) vibrator.vibrate(15);
            networkClient.sendTouchpad(0, 0, "rightclick");
            return;
        }

        if (id == ID_CONNECT_MANUAL) {
            if (ipInput != null) {
                String u = ipInput.getText().toString().trim();
                networkClient.checkConnection(u);
            }
            return;
        }

        if (id == ID_SCAN_UDP) {
            networkClient.startAutoDiscovery();
            Toast.makeText(this, "Buscando...", Toast.LENGTH_SHORT).show();
            return;
        }

        // Check if it's a DeckTile card tag
        Object tag = v.getTag();
        if (tag instanceof Models.DeckTile) {
            Models.DeckTile tile = (Models.DeckTile) tag;
            if (vibrator != null) vibrator.vibrate(20);
            networkClient.sendTrigger(tile.id, tile.command);
            Toast.makeText(this, "PC: " + tile.label, Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public boolean onTouch(View v, MotionEvent event) {
        if (v.getId() == ID_TOUCHPAD_SURFACE) {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    lastTouchX = event.getX();
                    lastTouchY = event.getY();
                    touchDownTime = System.currentTimeMillis();
                    break;
                case MotionEvent.ACTION_MOVE:
                    float dx = event.getX() - lastTouchX;
                    float dy = event.getY() - lastTouchY;
                    lastTouchX = event.getX();
                    lastTouchY = event.getY();
                    if (Math.abs(dx) > 0.5f || Math.abs(dy) > 0.5f) {
                        networkClient.sendTouchpad((int)(dx * 1.8f), (int)(dy * 1.8f), "move");
                    }
                    break;
                case MotionEvent.ACTION_UP:
                    if (System.currentTimeMillis() - touchDownTime < 180) {
                        if (vibrator != null) vibrator.vibrate(10);
                        networkClient.sendTouchpad(0, 0, "click");
                    }
                    break;
            }
            return true;
        }
        return false;
    }

    @Override
    public void onConnected(String url) {
        statusBadge.setText("  ● PC: " + url.replace("http://", ""));
        statusBadge.setTextColor(Color.parseColor("#22C55E"));
        Toast.makeText(this, "Enlazado a " + url, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onTilesUpdated(List<Models.DeckTile> newTiles) {
        this.tiles.clear();
        this.tiles.addAll(newTiles);
        if (activeTab == 0) renderBotoneraView();
    }

    @Override
    public void onKanbanUpdated(List<Models.KanbanCard> newCards) {
        this.cards.clear();
        this.cards.addAll(newCards);
        if (activeTab == 1) renderKanbanView();
    }
}
