import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid,
  BarChart3,
  CheckSquare,
  Video,
  MessageSquare,
  Zap,
  Laptop,
  Wifi,
  Globe,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Play,
  CheckCircle2,
  Mic,
  MicOff,
  VideoOff,
  MonitorUp,
  Hand,
  Send,
  PenTool,
  Clipboard,
  MousePointer,
  Sun,
  Lock,
  Camera,
  Briefcase,
  Plus,
  Search,
  ChevronRight,
  ChevronUp,
  Check,
  X,
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor,
  Edit3,
  RefreshCw,
  Mail,
  QrCode,
  Usb,
  Bot,
  Sparkles,
  FileSpreadsheet,
  Terminal,
} from 'lucide-react';
import {
  INITIAL_HOSTS,
  INITIAL_TASKS,
  WEEKLY_METRICS,
  INITIAL_DOCK_TILES,
  INITIAL_MEETINGS,
  INITIAL_CHANNELS,
  INITIAL_MESSAGES,
  INITIAL_MACROS,
  DYNAMIC_DECK_PROFILES,
  INITIAL_TRIAGE_FEED,
} from './data/mockOpsDeck';
import {
  HostPC,
  OpsTask,
  DockTile,
  MeetingItem,
  ChatChannel,
  ChatMessage,
  AutomationMacro,
  ConnectionRoute,
  DeckContextId,
  TriageIncomingItem,
} from './types/opsdeck';
import {
  AppBrandLogo,
  DEFAULT_PC_APPS_CATALOG,
  PCInstalledApp,
} from './components/AppBrandLogos';

type NavTab = 'dashboard' | 'tasks' | 'triage' | 'dock' | 'meetings' | 'messages' | 'automation';
type DockSubMode = 'grid' | 'touchpad' | 'clipboard' | 'signature';
type MobileModalSheet = 'none' | 'picker' | 'meetings' | 'settings';
type WallpaperTheme = 'aurora' | 'dusk' | 'ember' | 'midnight';
type TaskStatus = OpsTask['status'];

// Deterministic 21x21 QR Code Matrix Generator for LAN/USB Pairing URL
function buildPairingQrMatrix(payload: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = isBorder || isCenter;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder =
        (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
      if (inFinder) continue;
      if (r === 6 || c === 6) {
        grid[r][c] = (r + c) % 2 === 0;
        continue;
      }
      const seed = Math.imul(hash ^ (r * 31 + c * 17), 2654435761) >>> 0;
      grid[r][c] = seed % 10 < 5;
    }
  }
  return grid;
}

interface DragTileState {
  tile: DockTile;
  currentIndex: number;
  originTiles: DockTile[];
  x: number;
  y: number;
  width: number;
  height: number;
  offX: number;
  offY: number;
  rotation: number;
}

interface DragTaskState {
  task: OpsTask;
  overStatus: TaskStatus;
  originTasks: OpsTask[];
  x: number;
  y: number;
  width: number;
  height: number;
  offX: number;
  offY: number;
  rotation: number;
}

const CHART_SERIES = [
  { x: 10, y: 58, label: 'Lun', completed: 12, focus: '4.8h', efficiency: '88%' },
  { x: 72, y: 32, label: 'Mar', completed: 15, focus: '5.5h', efficiency: '94%' },
  { x: 136, y: 42, label: 'Mié', completed: 11, focus: '4.1h', efficiency: '85%' },
  { x: 200, y: 16, label: 'Jue', completed: 18, focus: '6.2h', efficiency: '97%' },
  { x: 260, y: 22, label: 'Vie', completed: 16, focus: '5.4h', efficiency: '93%' },
  { x: 310, y: 12, label: 'Sáb', completed: 19, focus: '6.6h', efficiency: '99%' },
];

// Vitrea 18-Particle Radial Sparkle Burst (ported from Ie() in releases-Dwzx3yHY.js)
function spawnVitreaSparkles(cx: number, cy: number) {
  if (typeof document === 'undefined') return;
  const colors = ['#CCD0CF', '#9BA8AB', '#4A5C6A', '#FFFFFF'];
  for (let i = 0; i < 18; i++) {
    const spark = document.createElement('i');
    spark.className = 'vitrea-spark';
    const angle = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const dist = 55 + Math.random() * 65;
    const tx = Math.cos(angle) * dist * 1.25;
    const ty = Math.sin(angle) * dist - 16;
    const rot = (i % 2 === 0 ? 1 : -1) * (140 + Math.random() * 90);
    spark.style.left = `${cx}px`;
    spark.style.top = `${cy}px`;
    spark.style.background = colors[i % colors.length];
    spark.style.borderRadius = i % 2 === 0 ? '50%' : '2px';
    spark.style.setProperty('--tx', `${tx.toFixed(1)}px`);
    spark.style.setProperty('--ty', `${ty.toFixed(1)}px`);
    spark.style.setProperty('--rot', `${rot.toFixed(0)}deg`);
    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), 900);
  }
}

export default function App() {
  // Viewport mode: 'apk-sim' (Live Android APK Device Hub Simulator), 'mobile' (Fullscreen 100dvh), or 'pc' (Desktop Cockpit)
  const [viewMode, setViewMode] = useState<'pc' | 'mobile' | 'apk-sim'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'pc') return 'pc';
      if (params.get('mode') === 'mobile') return 'mobile';
      if (
        window.innerWidth < 900 ||
        /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
        'WinDockAndroid' in window
      ) {
        return 'mobile';
      }
    }
    return 'pc';
  });
  // Idioma de la interfaz e instrucciones: Español ('es') por defecto, o Inglés ('en') a elección del usuario
  const [lang, setLang] = useState<'es' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('opsdeck_lang');
      if (saved === 'es' || saved === 'en') return saved;
    }
    return 'es';
  });
  const handleSelectLang = (nextLang: 'es' | 'en') => {
    setLang(nextLang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('opsdeck_lang', nextLang);
    }
  };
  const [apkFormFactor, setApkFormFactor] = useState<'phone' | 'tablet'>('phone');
  const [apkOrientation, setApkOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [apkScreenState, setApkScreenState] = useState<'app' | 'launcher'>('app');
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const onResize = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ============================================================================
  // VITREA GLOBAL POINTER GLINT (--gx, --gy) & RADIAL GLASS RIPPLE ENGINE
  // ============================================================================
  useEffect(() => {
    let activeGlass: HTMLElement | null = null;
    let rafId = 0;
    let gx = 0;
    let gy = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.(
        '.neuglass-panel, .neuglass-tile, .vitrea-rel-card, .windock-glass'
      ) as HTMLElement | null;

      if (target !== activeGlass) {
        activeGlass?.style.removeProperty('--gx');
        activeGlass?.style.removeProperty('--gy');
        activeGlass = target;
      }
      if (!target) return;
      const rect = target.getBoundingClientRect();
      gx = e.clientX - rect.left;
      gy = e.clientY - rect.top;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          if (activeGlass) {
            activeGlass.style.setProperty('--gx', `${gx.toFixed(0)}px`);
            activeGlass.style.setProperty('--gy', `${gy.toFixed(0)}px`);
          }
        });
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const el = (e.target as HTMLElement | null)?.closest?.(
        '.neuglass-tile, .neuglass-btn, .neuglass-btn-primary, .vitrea-rel-card'
      ) as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const wrap = document.createElement('span');
      wrap.className = 'vitrea-ripple-wrap';
      const ripple = document.createElement('span');
      ripple.className = 'vitrea-ripple';
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;
      wrap.appendChild(ripple);
      el.appendChild(wrap);
      setTimeout(() => wrap.remove(), 700);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [hosts, setHosts] = useState<HostPC[]>(INITIAL_HOSTS);
  const [selectedHostId, setSelectedHostId] = useState<string>(INITIAL_HOSTS[0].id);
  const [tasks, setTasks] = useState<OpsTask[]>(INITIAL_TASKS);
  const [taskFilter] = useState<'all' | 'urgent' | 'in_progress' | 'blocked' | 'completed'>('all');
  const [taskViewStyle, setTaskViewStyle] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');

  // Key counter to replay chart, bar, ring, and progress meter animations every time a view loads
  const [chartAnimKey, setChartAnimKey] = useState(1);

  // Interactive Chart Crosshair & Focus Card State (Vitrea #/overview)
  const [hoveredChartIdx, setHoveredChartIdx] = useState<number | null>(null);
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);
  const [isChartFocused, setIsChartFocused] = useState(false);

  // Persisted configurable Dock Tiles & PC Installed Apps Catalog
  const [tiles, setTiles] = useState<DockTile[]>(() => {
    try {
      const saved = localStorage.getItem('opsdeck_tiles_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return INITIAL_DOCK_TILES;
  });

  // ============================================================================
  // PILLAR 1: DYNAMIC CONTEXT-AWARE BOTONERA (Muta según la ventana activa del PC)
  // ============================================================================
  const [activeContextId, setActiveContextId] = useState<DeckContextId>('default');
  const [autoFollowPCWindow, setAutoFollowPCWindow] = useState<boolean>(true);
  const [contextTilesMap, setContextTilesMap] = useState<Record<DeckContextId, DockTile[]>>(() => {
    const map = {} as Record<DeckContextId, DockTile[]>;
    for (const p of DYNAMIC_DECK_PROFILES) {
      map[p.id] = p.tiles;
    }
    return map;
  });

  const activeContextProfile =
    DYNAMIC_DECK_PROFILES.find((p) => p.id === activeContextId) || DYNAMIC_DECK_PROFILES[0];
  const displayedTiles = activeContextId === 'default' ? tiles : contextTilesMap[activeContextId] || tiles;

  const updateDisplayedTiles = (updater: (prev: DockTile[]) => DockTile[]) => {
    if (activeContextId === 'default') {
      setTiles(updater);
    } else {
      setContextTilesMap((prev) => ({
        ...prev,
        [activeContextId]: updater(prev[activeContextId] || []),
      }));
    }
  };

  // ============================================================================
  // PILLAR 2: AI TRIAGE AGENT (Correo Corporativo + Tickets TI -> Tablero Kanban)
  // ============================================================================
  const [triageFeed, setTriageFeed] = useState<TriageIncomingItem[]>(INITIAL_TRIAGE_FEED);
  const [showMobileTriageStrip, setShowMobileTriageStrip] = useState<boolean>(false);
  const [customIntakePlatform, setCustomIntakePlatform] = useState<
    'Outlook 365' | 'ServiceNow' | 'Jira ITSM' | 'GLPI' | 'Zendesk'
  >('Outlook 365');
  const [customIntakeSender, setCustomIntakeSender] = useState('gerencia.operaciones@empresa.cl');
  const [customIntakeSubject, setCustomIntakeSubject] = useState('');
  const [customIntakeBody, setCustomIntakeBody] = useState('');
  const [isAnalyzingIntake, setIsAnalyzingIntake] = useState(false);

  // ============================================================================
  // PILLAR 3: BULLETPROOF CONNECTION & PAIRING HUB (USB ADB 0ms + LAN QR + Relay 443)
  // ============================================================================
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [hostAgentOnline, setHostAgentOnline] = useState(true);
  const [liveConnectionInfo, setLiveConnectionInfo] = useState<{
    hostName: string;
    primaryLanIp: string;
    mobilePairingUrl: string;
    usbDevices: { serial: string; state: string; model: string }[];
  }>({
    hostName: 'ESTACION-OFICINA-PRO',
    primaryLanIp: '192.168.1.48',
    mobilePairingUrl: 'http://192.168.1.48:5173',
    usbDevices: [{ serial: 'emulator-5554', state: 'device', model: 'Pixel_9_Pro_AVD' }],
  });

  const [pcAppsCatalog, setPcAppsCatalog] = useState<PCInstalledApp[]>(DEFAULT_PC_APPS_CATALOG);
  const [isEditingDock, setIsEditingDock] = useState(false);
  const [showAppLibraryModal, setShowAppLibraryModal] = useState(false);
  const [pickerTab, setPickerTab] = useState<'apps' | 'controls' | 'custom'>('apps');
  const [pickerSearch, setPickerSearch] = useState('');
  const [scanningLocalPC, setScanningLocalPC] = useState(false);

  // Vitrea Drag-and-Drop State for App Tiles ("Pescar una ficha y cambiarla de lugar")
  const [dragTile, setDragTile] = useState<DragTileState | null>(null);
  const [recentlySettledTileId, setRecentlySettledTileId] = useState<string | null>(null);
  const tileDragPendingRef = useRef<{
    tile: DockTile;
    index: number;
    x0: number;
    y0: number;
    rect: DOMRect;
    timer: number;
  } | null>(null);
  const tileVelRef = useRef<{ px: number; vel: number }>({ px: 0, vel: 0 });
  const suppressNextTileClickRef = useRef(false);

  // Vitrea Drag-and-Drop State for Tasks/Releases Board (#/releases)
  const [dragTask, setDragTask] = useState<DragTaskState | null>(null);
  const [recentlySettledTaskId, setRecentlySettledTaskId] = useState<string | null>(null);
  const taskDragPendingRef = useRef<{
    task: OpsTask;
    x0: number;
    y0: number;
    rect: DOMRect;
    timer: number;
  } | null>(null);
  const taskVelRef = useRef<{ px: number; vel: number }>({ px: 0, vel: 0 });

  // Custom app form inside App Library
  const [customAppName, setCustomAppName] = useState('');
  const [customAppExe, setCustomAppExe] = useState('');
  const [customAppBrand, setCustomAppBrand] = useState('excel');

  // ============================================================================
  // UNIFIED MAIN WINDOW PAGE NAVIGATION (No Popup Windows! The Environment Moves)
  // Pages 0 .. (totalDockPages - 1) => Botonera de Aplicaciones (Dinámica por Ventana)
  // Page totalDockPages             => Dashboard Ejecutivo & Métricas Animadas
  // Page totalDockPages + 1         => Tablero Drag & Drop + Agente IA Correo/Tickets
  // Page totalDockPages + 2         => Touchpad & Firma Digital PNG
  // ============================================================================
  const [mobilePage, setMobilePage] = useState(0);
  const [mobileModalSheet, setMobileModalSheet] = useState<MobileModalSheet>('none');
  const [iconsPerPage, setIconsPerPage] = useState<4 | 6 | 8>(8);
  const [immersiveMobile, setImmersiveMobile] = useState(false);
  const [wallpaper, setWallpaper] = useState<WallpaperTheme>('aurora');

  const [dockSubMode, setDockSubMode] = useState<DockSubMode>('grid');
  const [meetings] = useState<MeetingItem[]>(INITIAL_MEETINGS);
  const [channels] = useState<ChatChannel[]>(INITIAL_CHANNELS);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('ch-ops');
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [draftMessage, setDraftMessage] = useState('');
  const [macros] = useState<AutomationMacro[]>(INITIAL_MACROS);

  // Live meeting controller state
  const [micMuted, setMicMuted] = useState(false);
  const [camActive, setCamActive] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  // PC controls & telemetry state
  const [clipboardItems] = useState<string[]>([
    'https://opsdeck.internal/finanzas/cierre-q4-2026',
    'SHA256: 78de34581fb63c9fb4f8f20419baa67a50c2c6123700ffded7ec263eb255ea43',
    'Aprobado por Dirección de Operaciones — Balance Q4',
  ]);
  const [remoteInputText, setRemoteInputText] = useState('');
  const [toast, setToast] = useState<{
    title: string;
    detail: string;
    tone?: 'mint' | 'coral';
    undo?: () => void;
  } | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  // Touchpad & Signature canvas state
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const currentHost = hosts.find((h) => h.id === selectedHostId) || hosts[0];

  // Responsive Device Detection (Phone vs Tablet, Landscape vs Portrait)
  const isTabletDevice =
    viewMode === 'apk-sim'
      ? apkFormFactor === 'tablet'
      : viewportSize.w >= 768 && viewportSize.h >= 540;
  const isPortraitDevice =
    viewMode === 'apk-sim'
      ? apkOrientation === 'portrait'
      : viewportSize.h > viewportSize.w;

  const effectiveIconsPerPage = isTabletDevice
    ? isPortraitDevice
      ? 9
      : 10
    : isPortraitDevice
    ? 6
    : iconsPerPage;

  const totalDockPages = Math.max(1, Math.ceil(displayedTiles.length / effectiveIconsPerPage));
  const analyticsPageIdx = totalDockPages;
  const boardPageIdx = totalDockPages + 1;
  const touchpadPageIdx = totalDockPages + 2;
  const totalEnvPages = totalDockPages + 3;
  const safeEnvPage = Math.min(mobilePage, totalEnvPages - 1);

  const navigateToEnvPage = (pageIdx: number) => {
    const clamped = Math.max(0, Math.min(totalEnvPages - 1, pageIdx));
    setMobilePage(clamped);
    if (clamped === analyticsPageIdx || clamped === boardPageIdx) {
      setChartAnimKey((k) => k + 1);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('opsdeck_tiles_v2', JSON.stringify(tiles));
    } catch {
      // ignore
    }
  }, [tiles]);

  const triggerToast = (
    title: string,
    detail: string,
    tone: 'mint' | 'coral' = 'mint',
    undo?: () => void
  ) => {
    setToast({ title, detail, tone, undo });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  // ============================================================================
  // VITREA POINTER DRAG-AND-DROP ENGINE FOR APP TILES & TASKS BOARD
  // ("Pescar una ficha y cambiarla de lugar" con ficha visible flotante + tilt)
  // ============================================================================
  const startTilePointerDown = (
    e: React.PointerEvent<HTMLElement>,
    tile: DockTile,
    globalIndex: number
  ) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x0 = e.clientX;
    const y0 = e.clientY;

    const activateTileDrag = (cx: number, cy: number) => {
      if (tileDragPendingRef.current) {
        clearTimeout(tileDragPendingRef.current.timer);
        tileDragPendingRef.current = null;
      }
      suppressNextTileClickRef.current = true;
      navigator.vibrate?.(10);
      tileVelRef.current = { px: cx, vel: 0 };
      setDragTile({
        tile,
        currentIndex: globalIndex,
        originTiles: [...displayedTiles],
        x: cx,
        y: cy,
        width: rect.width,
        height: rect.height,
        offX: x0 - rect.left,
        offY: y0 - rect.top,
        rotation: 2.2,
      });
    };

    const isTouch = e.pointerType !== 'mouse';
    const timer = isTouch
      ? window.setTimeout(() => activateTileDrag(x0, y0), 170)
      : 0;

    tileDragPendingRef.current = { tile, index: globalIndex, x0, y0, rect, timer };
    if (isEditingDock && !isTouch) {
      activateTileDrag(x0, y0);
    }
  };

  const startTaskPointerDown = (
    e: React.PointerEvent<HTMLElement>,
    task: OpsTask
  ) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, a')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x0 = e.clientX;
    const y0 = e.clientY;

    const activateTaskDrag = (cx: number, cy: number) => {
      if (taskDragPendingRef.current) {
        clearTimeout(taskDragPendingRef.current.timer);
        taskDragPendingRef.current = null;
      }
      navigator.vibrate?.(10);
      taskVelRef.current = { px: cx, vel: 0 };
      setDragTask({
        task,
        overStatus: task.status,
        originTasks: [...tasks],
        x: cx,
        y: cy,
        width: rect.width,
        height: rect.height,
        offX: x0 - rect.left,
        offY: y0 - rect.top,
        rotation: 2.0,
      });
    };

    const isTouch = e.pointerType !== 'mouse';
    // On mouse or touch, lift the card visibly right away (or after 140ms on touch)
    const timer = window.setTimeout(() => activateTaskDrag(x0, y0), isTouch ? 150 : 90);
    taskDragPendingRef.current = { task, x0, y0, rect, timer };
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      // 1. Check if pending tile drag threshold exceeded (> 3px)
      if (tileDragPendingRef.current && !dragTile) {
        const pending = tileDragPendingRef.current;
        const dist = Math.hypot(e.clientX - pending.x0, e.clientY - pending.y0);
        if (dist > 3) {
          clearTimeout(pending.timer);
          tileDragPendingRef.current = null;
          suppressNextTileClickRef.current = true;
          navigator.vibrate?.(8);
          tileVelRef.current = { px: e.clientX, vel: 0 };
          setDragTile({
            tile: pending.tile,
            currentIndex: pending.index,
            originTiles: [...displayedTiles],
            x: e.clientX,
            y: e.clientY,
            width: pending.rect.width,
            height: pending.rect.height,
            offX: pending.x0 - pending.rect.left,
            offY: pending.y0 - pending.rect.top,
            rotation: 2.2,
          });
        }
        return;
      }

      // 2. Active Tile Drag: update coordinates, velocity tilt, and live slot swap
      if (dragTile) {
        const vel = tileVelRef.current.vel * 0.78 + (e.clientX - tileVelRef.current.px) * 0.22;
        tileVelRef.current = { px: e.clientX, vel };
        const clampedRot = 1.8 + Math.max(-9, Math.min(9, vel * 0.65));

        const elUnder = document.elementFromPoint(e.clientX, e.clientY);
        const slotEl = elUnder?.closest?.('[data-tile-index]') as HTMLElement | null;
        let nextIndex = dragTile.currentIndex;

        if (slotEl) {
          const targetIdx = Number(slotEl.dataset.tileIndex);
          if (!Number.isNaN(targetIdx) && targetIdx !== dragTile.currentIndex) {
            nextIndex = targetIdx;
            updateDisplayedTiles((prev) => {
              const copy = [...prev];
              const fromIdx = copy.findIndex((t) => t.id === dragTile.tile.id);
              if (fromIdx === -1 || targetIdx < 0 || targetIdx >= copy.length) return prev;
              const [moved] = copy.splice(fromIdx, 1);
              copy.splice(targetIdx, 0, moved);
              return copy;
            });
          }
        }

        setDragTile((prev) =>
          prev
            ? {
                ...prev,
                currentIndex: nextIndex,
                x: e.clientX,
                y: e.clientY,
                rotation: clampedRot,
              }
            : null
        );
        return;
      }

      // 3. Check if pending task card drag threshold exceeded (> 3px)
      if (taskDragPendingRef.current && !dragTask) {
        const pending = taskDragPendingRef.current;
        const dist = Math.hypot(e.clientX - pending.x0, e.clientY - pending.y0);
        if (dist > 3) {
          clearTimeout(pending.timer);
          taskDragPendingRef.current = null;
          navigator.vibrate?.(8);
          taskVelRef.current = { px: e.clientX, vel: 0 };
          setDragTask({
            task: pending.task,
            overStatus: pending.task.status,
            originTasks: [...tasks],
            x: e.clientX,
            y: e.clientY,
            width: pending.rect.width,
            height: pending.rect.height,
            offX: pending.x0 - pending.rect.left,
            offY: pending.y0 - pending.rect.top,
            rotation: 2.0,
          });
        }
        return;
      }

      // 4. Active Task Card Drag (#/releases board physics)
      if (dragTask) {
        const vel = taskVelRef.current.vel * 0.78 + (e.clientX - taskVelRef.current.px) * 0.22;
        taskVelRef.current = { px: e.clientX, vel };
        const clampedRot = 1.8 + Math.max(-9, Math.min(9, vel * 0.65));

        const elUnder = document.elementFromPoint(e.clientX, e.clientY);
        const colEl = elUnder?.closest?.('[data-stage-col]') as HTMLElement | null;
        const nextStage = (colEl?.dataset.stageCol as TaskStatus | undefined) || dragTask.overStatus;

        setDragTask((prev) =>
          prev
            ? {
                ...prev,
                overStatus: nextStage,
                x: e.clientX,
                y: e.clientY,
                rotation: clampedRot,
              }
            : null
        );
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (tileDragPendingRef.current) {
        clearTimeout(tileDragPendingRef.current.timer);
        tileDragPendingRef.current = null;
      }
      if (taskDragPendingRef.current) {
        clearTimeout(taskDragPendingRef.current.timer);
        taskDragPendingRef.current = null;
      }

      if (dragTile) {
        const dropped = dragTile;
        setDragTile(null);
        setRecentlySettledTileId(dropped.tile.id);
        setTimeout(() => setRecentlySettledTileId(null), 650);

        const oldIdx = dropped.originTiles.findIndex((t) => t.id === dropped.tile.id);
        if (oldIdx !== dropped.currentIndex) {
          spawnVitreaSparkles(e.clientX, e.clientY);
          const snapshot = dropped.originTiles;
          triggerToast(
            `"${dropped.tile.label}" reubicado`,
            `Movido a la posición #${dropped.currentIndex + 1}`,
            'mint',
            () => updateDisplayedTiles(() => snapshot)
          );
        }
        setTimeout(() => {
          suppressNextTileClickRef.current = false;
        }, 80);
      }

      if (dragTask) {
        const dropped = dragTask;
        setDragTask(null);
        setRecentlySettledTaskId(dropped.task.id);
        setTimeout(() => setRecentlySettledTaskId(null), 650);

        if (dropped.overStatus !== dropped.task.status) {
          const snapshot = dropped.originTasks;
          const stageNames: Record<TaskStatus, string> = {
            urgent: 'Urgentes',
            in_progress: 'En Curso',
            blocked: 'Bloqueadas',
            completed: 'Completadas',
          };
          setTasks((prev) =>
            prev.map((t) =>
              t.id === dropped.task.id
                ? {
                    ...t,
                    status: dropped.overStatus,
                    dueTime:
                      dropped.overStatus === 'completed'
                        ? 'Completada ahora'
                        : t.dueTime,
                  }
                : t
            )
          );
          if (dropped.overStatus === 'completed') {
            spawnVitreaSparkles(e.clientX, e.clientY);
          }
          triggerToast(
            `${dropped.task.code} movida a ${stageNames[dropped.overStatus]}`,
            dropped.task.title,
            'mint',
            () => setTasks(snapshot)
          );
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [dragTile, dragTask, displayedTiles, tasks, activeContextId]);

  // Multi-endpoint Host Agent resolver for USB (127.0.0.1:8620), Wi-Fi LAN (192.168.100.37:8620) & Cloud Tunnel
  const candidateHostUrls = [
    typeof window !== 'undefined' && window.location.origin.includes(':8620') ? window.location.origin : null,
    'http://127.0.0.1:8620',
    'http://localhost:8620',
    'http://192.168.100.37:8620',
    'https://7925183b0dcbc7.lhr.life'
  ].filter(Boolean) as string[];

  const fetchHostApi = async (path: string, options?: RequestInit): Promise<Response> => {
    for (const base of candidateHostUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${base}${path}`, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (res.ok) return res;
      } catch {
        // try next candidate
      }
    }
    throw new Error(`Host agent unreachable for ${path}`);
  };

  // ============================================================================
  // LIVE SYNC WITH OPSDECK HOST AGENT (:8620) — TRIPLE-FAILOVER & ACTIVE PC WINDOW
  // ============================================================================
  useEffect(() => {
    let cancelled = false;
    const syncHostStatus = async () => {
      try {
        const connRes = await fetchHostApi('/api/connection/status');
        if (connRes.ok && !cancelled) {
          const connData = await connRes.json();
          setHostAgentOnline(true);
          setLiveConnectionInfo({
            hostName: connData.hostName || 'ESTACION-OFICINA-PRO',
            primaryLanIp: connData.primaryLanIp || '192.168.1.48',
            mobilePairingUrl: connData.mobilePairingUrl || 'http://192.168.1.48:5173',
            usbDevices: Array.isArray(connData.usbAdbDevices) ? connData.usbAdbDevices : [],
          });
        }
      } catch {
        if (!cancelled) setHostAgentOnline(false);
      }

      if (autoFollowPCWindow) {
        try {
          const ctxRes = await fetchHostApi('/api/context/active');
          if (ctxRes.ok && !cancelled) {
            const ctxData = await ctxRes.json();
            if (ctxData.title) {
              setHosts((prev) =>
                prev.map((h, idx) => (idx === 0 ? { ...h, activeWindow: ctxData.title } : h))
              );
            }
            if (
              ctxData.contextId &&
              ctxData.contextId !== 'default' &&
              ctxData.contextId !== activeContextId
            ) {
              setActiveContextId(ctxData.contextId as DeckContextId);
            }
          }
        } catch {
          // ignore if host agent is sleeping
        }
      }
    };

    syncHostStatus();
    const timer = setInterval(syncHostStatus, 6500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [autoFollowPCWindow, activeContextId]);

  // Switch Dynamic Context Profile manually or automatically
  const handleSwitchContextProfile = (ctxId: DeckContextId, manual = true) => {
    if (manual) setAutoFollowPCWindow(false);
    setActiveContextId(ctxId);
    setMobilePage(0);
    const prof = DYNAMIC_DECK_PROFILES.find((p) => p.id === ctxId);
    if (prof) {
      setHosts((prev) =>
        prev.map((h) =>
          h.id === currentHost.id ? { ...h, activeWindow: prof.activeAppTitle } : h
        )
      );
      triggerToast(
        `Botonera Dinámica: ${prof.shortLabel}`,
        `Adaptada a ventana activa: ${prof.activeAppTitle}`
      );
    }
  };

  // ============================================================================
  // AI TRIAGE AGENT: CONVERT EMAIL / IT TICKET DIRECTLY INTO VITREA KANBAN CARD
  // ============================================================================
  const handleConvertTriageToKanban = (
    item: TriageIncomingItem,
    clientX?: number,
    clientY?: number
  ) => {
    if (!item.isActionable) {
      triggerToast(
        `Descartado por Agente IA (${item.externalId})`,
        item.aiReasoning,
        'coral'
      );
      setTriageFeed((prev) => prev.filter((x) => x.id !== item.id));
      return;
    }

    if (item.processedIntoKanban) {
      triggerToast(
        `${item.externalId} ya está en el Tablero Kanban`,
        'Puedes arrastrar la ficha entre columnas.'
      );
      return;
    }

    const newTask: OpsTask = {
      id: `tsk-ai-${item.id}-${Date.now()}`,
      code: item.externalId,
      title: item.subject,
      project: item.suggestedProject || `${item.sourcePlatform} · Soporte`,
      priority: item.suggestedPriority || 'critical',
      status: item.suggestedStatus || 'urgent',
      dueTime: item.slaMinutes ? `SLA ${item.slaMinutes}m · IA` : 'Hoy · Prioritario',
      estimatedMinutes: item.slaMinutes || 30,
      loggedMinutes: 5,
      assignee: 'Agente IA → Tú',
      sourceBadge: item.sourcePlatform,
      pcTrigger: item.pcTrigger || {
        label: `Abrir ${item.sourcePlatform} en PC`,
        appsToLaunch: [item.sourcePlatform, 'Microsoft Outlook'],
        urlOrPath: `opsdeck://triage/${item.externalId}`,
      },
    };

    const snapshotTasks = [...tasks];
    const snapshotFeed = [...triageFeed];

    setTasks((prev) => [newTask, ...prev]);
    setTriageFeed((prev) =>
      prev.map((x) =>
        x.id === item.id
          ? { ...x, processedIntoKanban: true, linkedTaskCode: newTask.code }
          : x
      )
    );
    setRecentlySettledTaskId(newTask.id);
    setTimeout(() => setRecentlySettledTaskId(null), 700);

    if (clientX && clientY) {
      spawnVitreaSparkles(clientX, clientY);
    } else if (typeof window !== 'undefined') {
      spawnVitreaSparkles(window.innerWidth / 2, window.innerHeight / 3);
    }

    triggerToast(
      `Agente IA inyectó ${newTask.code} al Kanban`,
      `Columna: ${newTask.status === 'urgent' ? 'URGENTES (P1)' : 'EN CURSO'} · ${newTask.project}`,
      'mint',
      () => {
        setTasks(snapshotTasks);
        setTriageFeed(snapshotFeed);
      }
    );
  };

  const handleAutoTriageBatch = (e?: React.MouseEvent) => {
    const pendingActionable = triageFeed.filter(
      (item) => item.isActionable && !item.processedIntoKanban
    );
    const noiseCount = triageFeed.filter((item) => !item.isActionable).length;

    if (pendingActionable.length === 0) {
      triggerToast(
        'Bandeja ya procesada por el Agente IA',
        'Todos los tickets y correos críticos están en tu tablero Kanban.'
      );
      return;
    }

    const createdTasks: OpsTask[] = pendingActionable.map((item, idx) => ({
      id: `tsk-batch-${item.id}-${Date.now()}-${idx}`,
      code: item.externalId,
      title: item.subject,
      project: item.suggestedProject || `${item.sourcePlatform} · IA`,
      priority: item.suggestedPriority || 'critical',
      status: item.suggestedStatus || 'urgent',
      dueTime: item.slaMinutes ? `SLA ${item.slaMinutes}m · IA` : 'Hoy · IA',
      estimatedMinutes: item.slaMinutes || 35,
      loggedMinutes: 5,
      assignee: 'Agente IA → Tú',
      sourceBadge: item.sourcePlatform,
      pcTrigger: item.pcTrigger,
    }));

    const snapshotTasks = [...tasks];
    const snapshotFeed = [...triageFeed];

    setTasks((prev) => [...createdTasks, ...prev]);
    setTriageFeed((prev) =>
      prev
        .filter((x) => x.isActionable)
        .map((x) => ({ ...x, processedIntoKanban: true, linkedTaskCode: x.externalId }))
    );

    if (e) {
      spawnVitreaSparkles(e.clientX, e.clientY);
    } else if (typeof window !== 'undefined') {
      spawnVitreaSparkles(window.innerWidth / 2, window.innerHeight / 3);
    }

    triggerToast(
      `Triaje IA completado: +${createdTasks.length} fichas en Kanban`,
      `${noiseCount} correo(s) de ruido filtrados automáticamente.`,
      'mint',
      () => {
        setTasks(snapshotTasks);
        setTriageFeed(snapshotFeed);
      }
    );
  };

  const handleAnalyzeCustomIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIntakeSubject.trim()) return;
    setIsAnalyzingIntake(true);

    try {
      const res = await fetchHostApi('/api/intake/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePlatform: customIntakePlatform,
          sender: customIntakeSender,
          subject: customIntakeSubject,
          body: customIntakeBody,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (!result.isActionable) {
          triggerToast(
            `Filtrado por Agente IA (${result.confidence}% conf.)`,
            result.filteredReason || 'Detectado como correo informativo sin tarea operativa.',
            'coral'
          );
        } else if (result.task) {
          const created: OpsTask = {
            ...result.task,
            sourceBadge: customIntakePlatform,
          };
          setTasks((prev) => [created, ...prev]);
          setTriageFeed((prev) => [
            {
              id: `tri-custom-${Date.now()}`,
              sourcePlatform: customIntakePlatform,
              externalId: created.code,
              sender: customIntakeSender,
              senderRole: 'Ingreso Analizado en Vivo',
              receivedAt: 'Ahora mismo',
              subject: customIntakeSubject,
              snippet: customIntakeBody || customIntakeSubject,
              isActionable: true,
              aiConfidence: result.confidence || 98,
              aiReasoning: result.reasoning,
              slaMinutes: result.slaMinutes || 15,
              suggestedStatus: created.status,
              suggestedPriority: created.priority,
              suggestedProject: created.project,
              pcTrigger: created.pcTrigger,
              processedIntoKanban: true,
              linkedTaskCode: created.code,
            },
            ...prev,
          ]);
          if (typeof window !== 'undefined') {
            spawnVitreaSparkles(window.innerWidth / 2, window.innerHeight / 3);
          }
          triggerToast(
            `Agente IA creó ${created.code} (${created.status === 'urgent' ? 'URGENTE' : 'EN CURSO'})`,
            result.reasoning
          );
        }
        setCustomIntakeSubject('');
        setCustomIntakeBody('');
        setIsAnalyzingIntake(false);
        return;
      }
    } catch {
      // Fallback local AI classification if host daemon is offline
    }

    const lower = `${customIntakeSubject} ${customIntakeBody}`.toLowerCase();
    const isCritical = /urgente|ca[ií]da|error|bloqueo|vpn|sap|cr[ií]tico|planta|p1/i.test(lower);
    const code = `${customIntakePlatform === 'ServiceNow' ? 'INC' : 'TI'}-${Math.floor(
      500 + Math.random() * 490
    )}`;
    const fallbackTask: OpsTask = {
      id: `tsk-local-ai-${Date.now()}`,
      code,
      title: customIntakeSubject.trim(),
      project: `${customIntakePlatform} · Triaje IA`,
      priority: isCritical ? 'critical' : 'high',
      status: isCritical ? 'urgent' : 'in_progress',
      dueTime: isCritical ? 'SLA 15m · Crítico' : 'Hoy · SLA 60m',
      estimatedMinutes: isCritical ? 30 : 45,
      loggedMinutes: 5,
      assignee: 'Agente IA → Tú',
      sourceBadge: customIntakePlatform,
      pcTrigger: {
        label: `Abrir ${customIntakePlatform} + Diagnóstico en PC`,
        appsToLaunch: [customIntakePlatform, 'Microsoft Outlook', 'Windows Terminal'],
        urlOrPath: `opsdeck://triage/${code}`,
      },
    };
    setTasks((prev) => [fallbackTask, ...prev]);
    if (typeof window !== 'undefined') {
      spawnVitreaSparkles(window.innerWidth / 2, window.innerHeight / 3);
    }
    triggerToast(
      `Agente IA inyectó ${code} al Tablero Kanban`,
      `Clasificado en ${isCritical ? 'URGENTES (SLA 15m)' : 'EN CURSO (SLA 60m)'}`
    );
    setCustomIntakeSubject('');
    setCustomIntakeBody('');
    setIsAnalyzingIntake(false);
  };

  // Attempt to scan real installed PC apps + icons from local OpsDeck Host Agent (:8620)
  const scanRealPCApps = async () => {
    setScanningLocalPC(true);
    try {
      const res = await fetchHostApi('/api/apps/installed');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.apps) && data.apps.length > 0) {
          const mapped: PCInstalledApp[] = data.apps.map((a: any) => ({
            id: a.id,
            name: a.name,
            category: 'Sistema',
            exePath: a.target,
            brandKey: a.name.toLowerCase(),
            iconDataUri: a.iconDataUri || null,
          }));
          setPcAppsCatalog([...mapped, ...DEFAULT_PC_APPS_CATALOG]);
          triggerToast(
            `Inventario real de ${data.hostName} cargado`,
            `${mapped.length} aplicaciones e íconos nativos detectados de tu PC.`
          );
          setScanningLocalPC(false);
          return;
        }
      }
      triggerToast(
        'Catálogo de PC sincronizado',
        `${DEFAULT_PC_APPS_CATALOG.length} aplicaciones corporativas listas con sus logos.`
      );
    } catch {
      triggerToast(
        'Catálogo corporativo activo',
        'Para extraer los .exe reales de este PC, ejecuta: npm run host'
      );
    }
    setScanningLocalPC(false);
  };

  // Subtle live telemetry fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setHosts((prev) =>
        prev.map((h) => {
          const deltaCpu = Math.floor(Math.random() * 5) - 2;
          const nextCpu = Math.max(6, Math.min(92, h.cpuPercent + deltaCpu));
          return { ...h, cpuPercent: nextCpu };
        })
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Computed metrics
  const urgentTasks = tasks.filter((t) => t.status === 'urgent');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const pendingTriageCount = triageFeed.filter(
    (item) => item.isActionable && !item.processedIntoKanban
  ).length;
  const completionRate = Math.min(
    99,
    Math.round((completedTasks.length / Math.max(1, tasks.length)) * 100 + 64)
  );

  // Add/Remove/Reorder Dock Tiles
  const isAppInDock = (appIdOrBrand: string) =>
    displayedTiles.some((t) => t.id === `tile-${appIdOrBrand}` || t.brandKey === appIdOrBrand);

  const handleAddAppToDock = (app: PCInstalledApp) => {
    const newTile: DockTile = {
      id: `tile-${app.id}-${Date.now()}`,
      label: app.name,
      category: 'app',
      iconName: 'Globe',
      brandKey: app.brandKey,
      iconDataUri: app.iconDataUri || null,
      exePath: app.exePath,
      running: false,
      accentColor: 'mint',
      commandVerb: `launch:${app.id}`,
    };
    updateDisplayedTiles((prev) => [...prev, newTile]);
    triggerToast(`"${app.name}" añadido a tu botonera`, `Ruta PC: ${app.exePath}`);
  };

  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAppName.trim()) return;
    const created: PCInstalledApp = {
      id: `custom-${Date.now()}`,
      name: customAppName.trim(),
      category: 'Productividad',
      exePath: customAppExe.trim() || `C:\\Program Files\\${customAppName.trim()}\\app.exe`,
      brandKey: customAppBrand,
    };
    setPcAppsCatalog((prev) => [created, ...prev]);
    handleAddAppToDock(created);
    setCustomAppName('');
    setCustomAppExe('');
  };

  const handleRemoveTile = (tileId: string) => {
    const snapshot = [...displayedTiles];
    updateDisplayedTiles((prev) => prev.filter((t) => t.id !== tileId));
    triggerToast(
      'Aplicación quitada del Dock',
      'Puedes deshacer este cambio al instante.',
      'mint',
      () => updateDisplayedTiles(() => snapshot)
    );
  };

  const handleLaunchTaskOnPC = (task: OpsTask) => {
    if (task.pcTrigger) {
      const joined = task.pcTrigger.appsToLaunch.join(' ').toLowerCase();
      if (autoFollowPCWindow) {
        if (/excel|sap|power bi/.test(joined)) setActiveContextId('excel');
        else if (/servicenow|jira|ssh|terminal|iam|fortinet/.test(joined)) setActiveContextId('itsm');
        else if (/outlook|correo/.test(joined)) setActiveContextId('outlook');
        else if (/teams|zoom/.test(joined)) setActiveContextId('meeting');
      }
      setHosts((prev) =>
        prev.map((h) =>
          h.id === currentHost.id
            ? { ...h, activeWindow: `${task.pcTrigger!.appsToLaunch[0]} — ${task.code}` }
            : h
        )
      );
      triggerToast(
        `Ejecutando en ${currentHost.name}`,
        `Abriendo: ${task.pcTrigger.appsToLaunch.join(' + ')} (${currentHost.route})`
      );
    } else {
      triggerToast(`Foco iniciado: ${task.code}`, task.title);
    }
  };

  const handleCompleteTask = (taskId: string, clientX?: number, clientY?: number) => {
    const snapshot = [...tasks];
    const target = tasks.find((t) => t.id === taskId);
    const willComplete = target && target.status !== 'completed';
    if (willComplete && clientX && clientY) {
      spawnVitreaSparkles(clientX, clientY);
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: t.status === 'completed' ? 'in_progress' : 'completed',
              dueTime: t.status === 'completed' ? 'Hoy · Reabierta' : 'Completada ahora',
            }
          : t
      )
    );
    triggerToast(
      willComplete ? 'Tarea completada' : 'Tarea reabierta',
      target ? target.title : 'Métricas actualizadas',
      'mint',
      () => setTasks(snapshot)
    );
  };

  const handleAddNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const nextCode = `OPS-${412 + tasks.length}`;
    const created: OpsTask = {
      id: `tsk-${Date.now()}`,
      code: nextCode,
      title: newTaskTitle.trim(),
      project: 'Operaciones Ejecutivas',
      priority: 'critical',
      status: 'urgent',
      dueTime: 'Hoy · 19:00',
      estimatedMinutes: 30,
      loggedMinutes: 0,
      assignee: 'Tú (Dirección)',
      pcTrigger: {
        label: 'Abrir Espacio de Trabajo en PC',
        appsToLaunch: ['Google Chrome', 'Microsoft Excel'],
        urlOrPath: 'opsdeck://workspace/urgent',
      },
    };
    setTasks((prev) => [created, ...prev]);
    setNewTaskTitle('');
    setShowNewTaskModal(false);
    triggerToast(`Tarea Urgente ${nextCode} creada`, created.title);
  };

  const handleTilePress = async (tile: DockTile) => {
    if (suppressNextTileClickRef.current || isEditingDock) return;

    // Context-specific AI Triage & IT Support macro verbs
    if (tile.commandVerb === 'triage:convert-latest') {
      const nextActionable = triageFeed.find((x) => x.isActionable && !x.processedIntoKanban);
      if (nextActionable) {
        handleConvertTriageToKanban(nextActionable);
      } else {
        triggerToast(
          'Cola IA al día',
          'Todos los correos y tickets críticos ya fueron convertidos en fichas Kanban.'
        );
      }
      return;
    }
    if (tile.commandVerb === 'outlook:archive-noise') {
      const noiseItems = triageFeed.filter((x) => !x.isActionable);
      setTriageFeed((prev) => prev.filter((x) => x.isActionable));
      triggerToast(
        'Ruido y Newsletters archivados',
        `${noiseItems.length || 1} correo(s) sin SLA limpiados de tu bandeja.`
      );
      return;
    }
    if (tile.commandVerb === 'itsm:resolve-top') {
      const topUrgent = tasks.find((t) => t.status === 'urgent');
      if (topUrgent) {
        handleCompleteTask(topUrgent.id);
      }
      return;
    }

    if (tile.commandVerb === 'signature:open') {
      if (viewMode === 'mobile' || viewMode === 'apk-sim') {
        setDockSubMode('signature');
        navigateToEnvPage(touchpadPageIdx);
      } else {
        setDockSubMode('signature');
      }
      return;
    }
    if (tile.commandVerb === 'meeting:toggle-mic') {
      setMicMuted((m) => !m);
      triggerToast(
        !micMuted ? 'Micrófono silenciado en PC' : 'Micrófono activado en PC',
        `Atajo ${tile.shortcut || 'Ctrl+Shift+M'} enviado a ${currentHost.name}`
      );
      return;
    }
    if (tile.commandVerb === 'meeting:toggle-cam') {
      setCamActive((c) => !c);
      triggerToast(
        camActive ? 'Cámara apagada en PC' : 'Cámara encendida en PC',
        `Atajo ${tile.shortcut || 'Ctrl+Shift+O'} enviado a ${currentHost.name}`
      );
      return;
    }
    if (tile.commandVerb === 'meeting:share-screen') {
      setScreenSharing((s) => !s);
      triggerToast(
        !screenSharing ? 'Compartiendo pantalla del PC' : 'Pantalla compartida detenida',
        `Comando enviado por ruta ${currentHost.route}`
      );
      return;
    }

    if (tile.commandVerb.startsWith('launch:pcapp-')) {
      const appId = tile.commandVerb.replace('launch:', '');
      try {
        await fetchHostApi('/api/apps/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: appId }),
        });
      } catch {
        // fallback simulated launch
      }
    }

    // If Auto-Follow PC Window is active, morph the Botonera when launching a major app
    if (autoFollowPCWindow && activeContextId === 'default') {
      const key = (tile.brandKey || tile.label).toLowerCase();
      if (key.includes('outlook')) setActiveContextId('outlook');
      else if (key.includes('excel') || key.includes('powerbi')) setActiveContextId('excel');
      else if (key.includes('teams') || key.includes('zoom')) setActiveContextId('meeting');
      else if (key.includes('vscode') || key.includes('terminal')) setActiveContextId('itsm');
    }

    updateDisplayedTiles((prev) =>
      prev.map((t) => (t.id === tile.id ? { ...t, running: true } : t))
    );
    setHosts((prev) =>
      prev.map((h) =>
        h.id === currentHost.id ? { ...h, activeWindow: tile.label } : h
      )
    );
    triggerToast(
      `Abierto en ${currentHost.name}`,
      `${tile.label} ${tile.exePath ? `(${tile.exePath.split('\\').pop()})` : ''} · ${currentHost.latencyMs} ms`
    );
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftMessage.trim()) return;
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      channelId: selectedChannelId,
      sender: 'Tú',
      role: 'Dirección',
      time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      text: draftMessage.trim(),
      isOwn: true,
    };
    setMessages((prev) => [...prev, msg]);
    setDraftMessage('');
  };

  const handleCycleRoute = (route: ConnectionRoute) => {
    const latencyMap: Record<ConnectionRoute, number> = {
      USB_ADB: 1,
      LAN_TLS: 4,
      P2P_WEBRTC: 18,
      CLOUD_RELAY: 28,
    };
    setHosts((prev) =>
      prev.map((h) =>
        h.id === currentHost.id
          ? { ...h, route, latencyMs: latencyMap[route] }
          : h
      )
    );
    triggerToast(
      `Motor Failover → ${route}`,
      `Enlace cifrado Ed25519 activo (${latencyMap[route]} ms)`
    );
  };

  // Signature canvas drawing helpers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#CCD0CF';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Render tile visual
  const renderTileVisual = (tile: DockTile, size: 'md' | 'lg' | 'xl' = 'lg') => {
    if (tile.category === 'app' || tile.brandKey || tile.iconDataUri) {
      return (
        <AppBrandLogo
          brandKey={tile.brandKey || tile.label}
          iconDataUri={tile.iconDataUri}
          name={tile.label}
          size={size}
        />
      );
    }

    const boxSize =
      size === 'xl'
        ? 'w-16 h-16 sm:w-20 sm:h-20 rounded-[24%] neuglass-pedestal'
        : size === 'md'
        ? 'w-11 h-11 rounded-[23%] neuglass-pedestal'
        : 'w-14 h-14 rounded-[23%] neuglass-pedestal';

    const colorClasses =
      tile.accentColor === 'coral'
        ? 'bg-gradient-to-br from-[#4A252B] to-[#241115] border-[#ED9695]/45 text-ops-danger'
        : tile.accentColor === 'amber'
        ? 'bg-gradient-to-br from-[#4A3B25] to-[#241C11] border-[#F3C98B]/45 text-ops-warn'
        : 'bg-gradient-to-br from-[#253745] to-[#11212D] border-[#9BA8AB]/45 text-ops-accent';

    return (
      <div className={`${boxSize} grid place-items-center border shadow-lg ${colorClasses}`}>
        {tile.iconName === 'MicOff' ? (
          micMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />
        ) : tile.iconName === 'Video' ? (
          camActive ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />
        ) : tile.iconName === 'MonitorUp' ? (
          <MonitorUp className="w-6 h-6" />
        ) : tile.iconName === 'Camera' ? (
          <Camera className="w-6 h-6" />
        ) : tile.iconName === 'PenTool' ? (
          <PenTool className="w-6 h-6" />
        ) : tile.iconName === 'Lock' ? (
          <Lock className="w-6 h-6" />
        ) : tile.iconName === 'Zap' ? (
          <Zap className="w-6 h-6" />
        ) : tile.iconName === 'Terminal' ? (
          <Terminal className="w-6 h-6" />
        ) : tile.iconName === 'FileSpreadsheet' ? (
          <FileSpreadsheet className="w-6 h-6" />
        ) : tile.iconName === 'Mail' ? (
          <Mail className="w-6 h-6" />
        ) : (
          <Briefcase className="w-6 h-6" />
        )}
      </div>
    );
  };

  const routeBadgeLabel = (route: ConnectionRoute) => {
    if (route === 'USB_ADB') return 'USB Directo ADB (0ms)';
    if (route === 'LAN_TLS') return 'LAN Directa TLS';
    if (route === 'P2P_WEBRTC') return 'Remoto P2P WebRTC';
    return 'Cloud Relay 443 E2EE';
  };

  const currentDockPageIdx = safeEnvPage < totalDockPages ? safeEnvPage : 0;
  const currentMobilePageTiles = displayedTiles.slice(
    currentDockPageIdx * effectiveIconsPerPage,
    (currentDockPageIdx + 1) * effectiveIconsPerPage
  );

  // ============================================================================
  // SHARED DYNAMIC CONTEXT-AWARE BOTONERA STRIP (Pillar 1)
  // ============================================================================
  const renderDynamicContextStrip = (compact = false) => (
    <div
      className={`w-full flex flex-wrap items-center justify-between gap-1.5 ${
        compact
          ? 'px-2.5 py-1 rounded-2xl neu-well'
          : 'px-3.5 py-2 rounded-2xl neu-well border border-[#4A5C6A]/45'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => {
            const next = !autoFollowPCWindow;
            setAutoFollowPCWindow(next);
            triggerToast(
              next ? 'Auto-Sync Ventana PC Activado' : 'Modo Contexto Manual',
              next
                ? 'La botonera mutará automáticamente según el programa abierto en el PC.'
                : 'Selecciona cualquier perfil de botonera manualmente.'
            );
          }}
          className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 transition shrink-0 ${
            autoFollowPCWindow
              ? 'neuglass-btn-primary'
              : 'neuglass-btn text-[#9BA8AB] hover:text-[#CCD0CF]'
          }`}
          title="Cambiar automáticamente la botonera según la ventana activa del PC"
        >
          <Sparkles className="w-3 h-3" />
          <span>{autoFollowPCWindow ? 'Auto-PC ON' : 'Auto-PC OFF'}</span>
        </button>

        <span className="text-[10px] font-mono text-[#9BA8AB] truncate hidden sm:inline">
          Ventana PC: <strong className="text-[#CCD0CF]">{activeContextProfile.activeAppTitle}</strong>
        </span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {DYNAMIC_DECK_PROFILES.map((prof) => {
          const isSelected = activeContextId === prof.id;
          return (
            <button
              key={prof.id}
              type="button"
              onClick={() => handleSwitchContextProfile(prof.id, true)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold whitespace-nowrap transition ${
                isSelected
                  ? 'neuglass-btn-primary shadow-sm'
                  : 'text-[#9BA8AB] hover:text-[#CCD0CF] hover:bg-[#253745]/50'
              }`}
              title={`Mutar botonera para: ${prof.label}`}
            >
              {prof.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ============================================================================
  // SHARED TRIPLE-FAILOVER CONNECTION & QR PAIRING MODAL (Pillar 3)
  // ============================================================================
  const renderPairingFailoverModal = () => {
    if (!showPairingModal) return null;
    const qrMatrix = buildPairingQrMatrix(
      `${liveConnectionInfo.mobilePairingUrl}?host=${liveConnectionInfo.hostName}&key=ed25519`
    );

    const isEs = lang === 'es';
    const channels: {
      route: ConnectionRoute;
      priority: string;
      title: string;
      subtitle: string;
      latency: string;
      badge: string;
    }[] = [
      {
        route: 'USB_ADB',
        priority: isEs ? 'PRIORIDAD 1 · CABLE USB DIRECTO' : 'PRIORITY 1 · DIRECT USB CABLE',
        title: isEs
          ? 'Túnel USB ADB / Tethering USB (Inmune a Firewalls)'
          : 'USB ADB / USB Tethering Tunnel (Firewall-Immune)',
        subtitle:
          liveConnectionInfo.usbDevices.length > 0
            ? isEs
              ? `Dispositivo detectado: ${liveConnectionInfo.usbDevices[0].model} (${liveConnectionInfo.usbDevices[0].serial})`
              : `Detected device: ${liveConnectionInfo.usbDevices[0].model} (${liveConnectionInfo.usbDevices[0].serial})`
            : isEs
            ? 'Canal directo por cable USB con 0% pérdida de paquetes y carga simultánea.'
            : 'Direct USB cable channel with 0% packet loss and simultaneous charging.',
        latency: '1 ms',
        badge: isEs ? 'INFALIBLE' : 'FAILSAFE',
      },
      {
        route: 'LAN_TLS',
        priority: isEs ? 'PRIORIDAD 2 · WI-FI LOCAL CORPORATIVO' : 'PRIORITY 2 · CORPORATE LOCAL WI-FI',
        title: `mDNS Zero-Conf + WebSocket TLS 1.3 (${liveConnectionInfo.primaryLanIp}:8620)`,
        subtitle: isEs
          ? 'Descubrimiento directo en subred local sin pasar por servidores en la nube.'
          : 'Direct discovery on your local subnet without cloud servers.',
        latency: '4 ms',
        badge: isEs ? 'LAN DIRECTA' : 'DIRECT LAN',
      },
      {
        route: 'P2P_WEBRTC',
        priority: isEs ? 'PRIORIDAD 3A · TÚNEL P2P NAT TRAVERSAL' : 'PRIORITY 3A · P2P NAT TRAVERSAL TUNNEL',
        title: 'WebRTC DataChannel E2EE (STUN / ICE)',
        subtitle: isEs
          ? 'Salto automático entre subredes corporativas o VPN con cifrado Ed25519.'
          : 'Automatic jump across corporate subnets or VPN with Ed25519 encryption.',
        latency: '18 ms',
        badge: isEs ? 'P2P REMOTO' : 'REMOTE P2P',
      },
      {
        route: 'CLOUD_RELAY',
        priority: isEs ? 'PRIORIDAD 3B · TÚNEL SALIENTE PUERTO 443' : 'PRIORITY 3B · OUTBOUND PORT 443 TUNNEL',
        title: isEs
          ? 'Cloud Relay HTTPS/WSS 443 (5G / Fuera de Oficina)'
          : 'Cloud Relay HTTPS/WSS 443 (5G / Out of Office)',
        subtitle: isEs
          ? 'Si el firewall bloquea puertos locales, sale por el puerto estándar 443 HTTPS.'
          : 'If a firewall blocks local ports, traffic exits over standard HTTPS port 443.',
        latency: '28 ms',
        badge: isEs ? 'PUERTO 443' : 'PORT 443',
      },
    ];

    return (
      <div
        onClick={() => setShowPairingModal(false)}
        className="fixed inset-0 z-50 bg-[#06141B]/80 backdrop-blur-md grid place-items-center p-3 sm:p-6 animate-view-enter"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl windock-glass rounded-3xl p-5 sm:p-6 space-y-5 text-[#CCD0CF] max-h-[92dvh] overflow-y-auto"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#4A5C6A]/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl neuglass-pedestal grid place-items-center text-[#CCD0CF]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#9BA8AB]">
                  {isEs
                    ? 'INSTRUCCIONES Y MOTOR TRIPLE-FAILOVER · OPSDECK.EXE (:8620)'
                    : 'INSTRUCTIONS & TRIPLE-FAILOVER ENGINE · OPSDECK.EXE (:8620)'}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[#CCD0CF]">
                  {isEs
                    ? 'Centro de Enlace e Instrucciones PC ↔ Móvil / Tablet'
                    : 'PC ↔ Mobile / Tablet Connection & Instructions Center'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Selector de Idioma: Español / English */}
              <div className="flex items-center neu-well rounded-xl p-1 gap-1 border border-[#4A5C6A]/50">
                <button
                  type="button"
                  onClick={() => handleSelectLang('es')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    isEs
                      ? 'neuglass-btn-primary shadow-sm'
                      : 'text-[#9BA8AB] hover:text-[#CCD0CF]'
                  }`}
                >
                  🇪🇸 Español
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectLang('en')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    !isEs
                      ? 'neuglass-btn-primary shadow-sm'
                      : 'text-[#9BA8AB] hover:text-[#CCD0CF]'
                  }`}
                >
                  🇺🇸 English
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPairingModal(false)}
                className="w-9 h-9 rounded-xl neuglass-btn grid place-items-center text-[#9BA8AB] hover:text-[#CCD0CF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Guía Paso a Paso Bilingüe (Traducción de las Instrucciones del APK Android) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="neuglass-panel rounded-2xl p-4 space-y-2 border border-[#CCD0CF]/25">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#253745] text-[#CCD0CF]">
                  {isEs ? 'OPCIÓN A · CONEXIÓN POR CABLE USB' : 'OPTION A · CONNECT BY USB CABLE'}
                </span>
                <span className="text-[10px] font-mono text-[#9BA8AB]">0 ms</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-[#CCD0CF]">
                {isEs
                  ? 'Instrucciones para conectar tu celular por USB'
                  : 'Instructions to connect your phone via USB'}
              </h3>
              <ol className="text-[11px] text-[#9BA8AB] space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>
                  {isEs
                    ? 'Conecta tu teléfono al PC con un cable USB de datos.'
                    : 'Connect your phone to the PC with a data-capable USB cable.'}
                </li>
                <li>
                  {isEs
                    ? 'En Ajustes de Android → Zona Wi-Fi / Anclaje de red, activa "Compartir conexión por USB" (USB Tethering).'
                    : 'In Android Settings → Hotspot & tethering, turn on "USB tethering".'}
                </li>
                <li>
                  {isEs
                    ? 'Mantén OpsDeck ejecutándose en Windows y toca "Buscar PC por USB" (Find USB PC) en la app.'
                    : 'Keep OpsDeck running on Windows, then return to the app and tap "Find USB PC".'}
                </li>
              </ol>
            </div>

            <div className="neuglass-panel rounded-2xl p-4 space-y-2 border border-[#CCD0CF]/25">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#253745] text-[#CCD0CF]">
                  {isEs ? 'OPCIÓN B · CONEXIÓN POR WI-FI LAN' : 'OPTION B · CONNECT BY WI-FI LAN'}
                </span>
                <span className="text-[10px] font-mono text-[#9BA8AB]">&lt; 4 ms</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-[#CCD0CF]">
                {isEs
                  ? 'Instrucciones para conectar por Wi-Fi sin cables'
                  : 'Instructions to connect wirelessly via Wi-Fi'}
              </h3>
              <ol className="text-[11px] text-[#9BA8AB] space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>
                  {isEs
                    ? 'Conecta tu teléfono y tu PC a la misma red Wi-Fi local.'
                    : 'Connect both your phone and PC to the same local Wi-Fi network.'}
                </li>
                <li>
                  {isEs
                    ? `En el APK toca "Conectar por Wi-Fi" (Connect by Wi-Fi) o escribe la dirección: ${liveConnectionInfo.primaryLanIp}:8620`
                    : `In the APK tap "Connect by Wi-Fi" or enter the address: ${liveConnectionInfo.primaryLanIp}:8620`}
                </li>
                <li>
                  {isEs
                    ? `O abre directamente en Chrome del móvil: ${liveConnectionInfo.mobilePairingUrl}`
                    : `Or open directly in mobile Chrome: ${liveConnectionInfo.mobilePairingUrl}`}
                </li>
              </ol>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left 5 Cols: Scannable SVG QR Code & Direct LAN/USB Pairing */}
            <div className="lg:col-span-5 neuglass-panel rounded-2xl p-4 flex flex-col items-center justify-between text-center space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#CCD0CF]">
                <QrCode className="w-4 h-4" />
                <span>
                  {isEs ? 'Emparejamiento Instantáneo QR' : 'Instant QR Pairing'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#CCD0CF] shadow-2xl border-4 border-[#253745]">
                <svg viewBox="0 0 21 21" className="w-36 h-36 sm:w-40 sm:h-40" shapeRendering="crispEdges">
                  {qrMatrix.map((row, rIdx) =>
                    row.map((cell, cIdx) =>
                      cell ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx}
                          y={rIdx}
                          width={1}
                          height={1}
                          fill="#06141B"
                        />
                      ) : null
                    )
                  )}
                </svg>
              </div>

              <div className="w-full space-y-1.5">
                <div className="text-[10px] font-mono uppercase text-[#9BA8AB]">
                  {isEs ? 'Dirección del Servidor PC (APK / Web)' : 'PC Server Address (APK / Web)'}
                </div>
                <div className="px-3 py-1.5 rounded-xl neu-well font-mono text-xs font-bold text-[#CCD0CF] select-all">
                  {liveConnectionInfo.primaryLanIp}:8620
                </div>
                <p className="text-[11px] text-[#9BA8AB] leading-relaxed">
                  {isEs ? (
                    <>
                      Escanea con tu cámara o ingresa{' '}
                      <strong className="text-[#CCD0CF]">{liveConnectionInfo.primaryLanIp}:8620</strong> en la
                      app de tu teléfono para enlazar con{' '}
                      <strong className="text-[#CCD0CF]">{liveConnectionInfo.hostName}</strong>.
                    </>
                  ) : (
                    <>
                      Scan with your camera or enter{' '}
                      <strong className="text-[#CCD0CF]">{liveConnectionInfo.primaryLanIp}:8620</strong> in
                      your phone app to pair with{' '}
                      <strong className="text-[#CCD0CF]">{liveConnectionInfo.hostName}</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Right 7 Cols: Triple-Failover Priority Matrix */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-2.5">
              {channels.map((ch) => {
                const isCurrent = currentHost.route === ch.route;
                return (
                  <button
                    key={ch.route}
                    type="button"
                    onClick={() => handleCycleRoute(ch.route)}
                    className={`w-full text-left p-3.5 rounded-2xl transition flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'neuglass-panel border-[#CCD0CF]/65 shadow-lg'
                        : 'neu-well hover:border-[#9BA8AB]/45'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#253745] text-[#CCD0CF]">
                          {ch.priority}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#9BA8AB]">
                          {ch.badge}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-[#CCD0CF] truncate">
                        {ch.title}
                      </div>
                      <p className="text-[11px] text-[#9BA8AB] line-clamp-1">{ch.subtitle}</p>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span className="px-2.5 py-1 rounded-xl bg-[#06141B] border border-[#4A5C6A]/50 font-mono text-xs font-bold text-[#CCD0CF]">
                        {ch.latency}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-semibold ${
                          isCurrent ? 'text-[#CCD0CF]' : 'text-[#9BA8AB]'
                        }`}
                      >
                        {isCurrent
                          ? isEs
                            ? '● Canal Activo'
                            : '● Active Channel'
                          : isEs
                          ? 'Activar'
                          : 'Activate'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const adaptiveGridCols = isTabletDevice
    ? isPortraitDevice
      ? 'grid-cols-3'
      : 'grid-cols-5'
    : isPortraitDevice
    ? 'grid-cols-2'
    : effectiveIconsPerPage === 4
    ? 'grid-cols-2'
    : effectiveIconsPerPage === 6
    ? 'grid-cols-3'
    : 'grid-cols-4';

  // Tactile swipe handlers (Horizontal swipe moves between Main Environment Pages; Vertical swipe unfolds Cajón)
  const onSurfaceTouchStart = (clientX: number, clientY: number) => {
    if (dragTile || dragTask) return;
    swipeStartRef.current = { x: clientX, y: clientY };
  };

  const onSurfaceTouchEnd = (clientX: number, clientY: number) => {
    if (!swipeStartRef.current || dragTile || dragTask) {
      swipeStartRef.current = null;
      return;
    }
    const dx = clientX - swipeStartRef.current.x;
    const dy = clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 54) {
      if (dx < 0 && safeEnvPage < totalEnvPages - 1) {
        navigateToEnvPage(safeEnvPage + 1);
      } else if (dx > 0 && safeEnvPage > 0) {
        navigateToEnvPage(safeEnvPage - 1);
      }
    } else if (Math.abs(dy) > 44) {
      if (dy < -44) {
        setIsDrawerExpanded(true);
      } else if (dy > 44 && isDrawerExpanded) {
        setIsDrawerExpanded(false);
      }
    }
  };

  const wallpaperClass =
    wallpaper === 'dusk'
      ? 'windock-dusk'
      : wallpaper === 'ember'
      ? 'windock-ember'
      : wallpaper === 'midnight'
      ? 'windock-midnight'
      : 'windock-aurora';

  // ============================================================================
  // SHARED FLOATING GHOST OVERLAY FOR VITREA DRAG-AND-DROP (TILES & TASK CARDS)
  // Renders the complete visible card/icon following the cursor with velocity tilt!
  // ============================================================================
  const renderVitreaDragOverlay = () => {
    const draggedTaskPct = dragTask
      ? Math.min(
          100,
          Math.round((dragTask.task.loggedMinutes / Math.max(1, dragTask.task.estimatedMinutes)) * 100)
        )
      : 0;

    return (
      <>
        {/* Floating Lifted App Icon Keycap (.rb-rel.is-drag equivalent for Botonera) */}
        {dragTile && (
          <div
            style={{
              left: `${dragTile.x - dragTile.offX}px`,
              top: `${dragTile.y - dragTile.offY}px`,
              width: `${dragTile.width}px`,
              height: `${dragTile.height}px`,
              transformOrigin: `${dragTile.offX}px ${dragTile.offY}px`,
              transform: `scale(1.08) rotate(${dragTile.rotation.toFixed(2)}deg)`,
            }}
            className="vitrea-drag-ghost rounded-[26px] flex flex-col items-center justify-center p-3"
          >
            {renderTileVisual(dragTile.tile, isTabletDevice ? 'xl' : 'lg')}
            <span className="mt-1.5 px-2 py-0.5 rounded-md bg-[#06141B]/95 border border-[#CCD0CF]/50 text-[9px] font-semibold text-[#CCD0CF] whitespace-nowrap shadow">
              {dragTile.tile.label}
            </span>
          </div>
        )}

        {/* Floating Lifted Full Task / Release Card (.rb-rel.is-drag in Vitrea #/releases) */}
        {dragTask && (
          <div
            style={{
              left: `${dragTask.x - dragTask.offX}px`,
              top: `${dragTask.y - dragTask.offY}px`,
              width: `${dragTask.width}px`,
              transformOrigin: `${dragTask.offX}px ${dragTask.offY}px`,
              transform: `scale(1.05) rotate(${dragTask.rotation.toFixed(2)}deg)`,
            }}
            className="vitrea-drag-ghost rounded-2xl p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-mono text-[10px] font-bold text-[#06141B] px-2 py-0.5 rounded-md bg-[#CCD0CF]">
                {dragTask.task.code}
              </span>
              <span className="text-[10px] font-mono text-[#F3C98B] truncate">
                {dragTask.task.dueTime}
              </span>
            </div>

            <p className="text-xs font-semibold text-[#CCD0CF] leading-snug">
              {dragTask.task.title}
            </p>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-[#06141B] overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    dragTask.task.status === 'urgent' ? 'bg-ops-danger' : 'bg-[#CCD0CF]'
                  }`}
                  style={{ width: `${draggedTaskPct}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-[#CCD0CF] font-bold">
                {draggedTaskPct}%
              </span>
            </div>

            <div className="pt-1 border-t border-[#4A5C6A]/45 flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#9BA8AB] truncate">{dragTask.task.project}</span>
              <span className="px-2 py-0.5 rounded-full bg-[#253745] text-[9px] font-mono text-[#CCD0CF]">
                Moviendo ficha...
              </span>
            </div>
          </div>
        )}

        {/* Vitrea Pill Toast with Instant Undo (.toast + .toast__undo) */}
        {toast && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9998] windock-glass rounded-full pl-4 pr-2 py-1.5 shadow-2xl flex items-center gap-3 border border-[#9BA8AB]/40 animate-drawer-spring">
            <span className="w-2 h-2 rounded-full bg-[#CCD0CF] shadow-[0_0_8px_#CCD0CF]" />
            <div className="text-xs text-[#CCD0CF] pr-1">
              <strong className="font-bold">{toast.title}</strong>
              <span className="text-[#9BA8AB] ml-1.5 hidden sm:inline">· {toast.detail}</span>
            </div>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
                className="neuglass-btn-primary px-3 py-1 rounded-full text-[11px] font-bold"
              >
                Deshacer
              </button>
            )}
          </div>
        )}
      </>
    );
  };

  // ============================================================================
  // SHARED VITREA INTERACTIVE SVG SPLINE CHART WITH ANIMATED CLIP-REVEAL & NODES
  // ============================================================================
  const renderInteractiveSplineChart = (heightClass = 'h-24', animId = 'mob') => {
    const activePt = hoveredChartIdx !== null ? CHART_SERIES[hoveredChartIdx] : null;
    const clipId = `vitrea-clip-${animId}-${chartAnimKey}`;
    const gradId = `vitrea-grad-${animId}-${chartAnimKey}`;

    return (
      <div
        key={`spline-${animId}-${chartAnimKey}`}
        onMouseLeave={() => setHoveredChartIdx(null)}
        className={`relative w-full ${heightClass} pt-2 select-none`}
      >
        {/* Floating Vitrea Glass Tooltip (.chart__tip) */}
        {activePt && (
          <div
            style={{
              left: `${Math.min(78, Math.max(12, (activePt.x / 320) * 100))}%`,
              top: '-2px',
            }}
            className="pointer-events-none absolute -translate-x-1/2 z-30 px-2.5 py-1 rounded-xl windock-glass border border-[#CCD0CF]/45 text-[10px] shadow-xl flex items-center gap-2 whitespace-nowrap animate-page-morph"
          >
            <span className="w-2 h-2 rounded-full bg-[#CCD0CF]" />
            <span className="font-mono font-bold text-[#CCD0CF]">{activePt.label}:</span>
            <span className="text-[#9BA8AB]">{activePt.completed} tareas</span>
            <strong className="font-mono text-[#CCD0CF]">{activePt.efficiency}</strong>
          </div>
        )}

        <svg viewBox="0 0 320 85" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#CCD0CF" stopOpacity="0.45" />
              <stop offset="65%" stopColor="#4A5C6A" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#06141B" stopOpacity="0" />
            </linearGradient>
            {/* Vitrea Left-to-Right Animated Clip Reveal (.chart__clip) */}
            <clipPath id={clipId}>
              <rect x="0" y="0" height="85" className="animate-vitrea-clip" />
            </clipPath>
          </defs>
          <line x1="0" y1="20" x2="320" y2="20" stroke="#253745" strokeDasharray="3 3" strokeWidth="1" />
          <line x1="0" y1="50" x2="320" y2="50" stroke="#253745" strokeDasharray="3 3" strokeWidth="1" />

          {/* Vertical Crosshair (.chart__cross) */}
          {activePt && (
            <line
              x1={activePt.x}
              y1="6"
              x2={activePt.x}
              y2="76"
              stroke="#CCD0CF"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.8"
            />
          )}

          {/* Clipped Plot Group: Area Fill + Secondary Curve + Primary Glowing Curve */}
          <g clipPath={`url(#${clipId})`}>
            <path
              d="M 10 58 C 45 52, 55 30, 72 32 C 100 34, 118 48, 136 42 C 160 35, 180 14, 200 16 C 225 18, 240 28, 260 22 C 280 16, 298 10, 310 12 L 310 78 L 10 78 Z"
              fill={`url(#${gradId})`}
            />
            <path
              d="M 10 66 C 45 60, 55 46, 72 48 C 100 50, 118 58, 136 52 C 160 45, 180 32, 200 34 C 225 36, 240 40, 260 34 C 280 28, 298 24, 310 26"
              fill="none"
              stroke="#4A5C6A"
              strokeWidth="1.8"
              strokeDasharray="4 5"
              strokeLinecap="round"
            />
            <path
              d="M 10 58 C 45 52, 55 30, 72 32 C 100 34, 118 48, 136 42 C 160 35, 180 14, 200 16 C 225 18, 240 28, 260 22 C 280 16, 298 10, 310 12"
              fill="none"
              stroke="#CCD0CF"
              strokeWidth="2.6"
              strokeLinecap="round"
              className="animate-chart-line"
            />
          </g>

          {/* Staggered Pop-In Data Nodes (.animate-vitrea-node) */}
          {CHART_SERIES.map((pt, idx) => {
            const isHi = hoveredChartIdx === idx;
            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredChartIdx(idx)}
                onTouchStart={() => setHoveredChartIdx(idx)}
                className="cursor-pointer"
              >
                <rect x={pt.x - 18} y="0" width="36" height="85" fill="transparent" />
                {isHi && (
                  <circle cx={pt.x} cy={pt.y} r="8" fill="rgba(204, 208, 207, 0.22)" />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHi ? '4.8' : '3.6'}
                  fill="#06141B"
                  stroke="#CCD0CF"
                  strokeWidth={isHi ? '2.6' : '2'}
                  style={{ animationDelay: `${idx * 110 + 180}ms` }}
                  className="animate-vitrea-node"
                />
                <text
                  x={pt.x}
                  y="82"
                  textAnchor="middle"
                  fill={isHi ? '#CCD0CF' : '#9BA8AB'}
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight={isHi ? '700' : '500'}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // ============================================================================
  // SHARED VITREA STAGGERED VERTICAL BAR CHART (.bars__bar in charts-BBG1TSni.js)
  // Every bar grows from scaleY(0) at the bottom with staggered timing!
  // ============================================================================
  const renderAnimatedVerticalBars = (heightClass = 'h-20') => (
    <div
      key={`bars-${chartAnimKey}`}
      onMouseLeave={() => setHoveredBarIdx(null)}
      className={`w-full ${heightClass} flex items-end justify-between gap-2.5 px-1 pt-2`}
    >
      {WEEKLY_METRICS.map((item, idx) => {
        const completedHeight = Math.round((item.completed / 18) * 100);
        const urgentHeight = Math.round((item.urgent / 18) * 100);
        const isHi = hoveredBarIdx === idx;
        return (
          <div
            key={item.day}
            onMouseEnter={() => setHoveredBarIdx(idx)}
            onTouchStart={() => setHoveredBarIdx(idx)}
            className="flex-1 flex flex-col items-center gap-1 h-full justify-end cursor-pointer group relative"
          >
            {isHi && (
              <div className="pointer-events-none absolute -top-6 px-2 py-0.5 rounded-md bg-[#06141B] border border-[#CCD0CF]/45 text-[9px] font-mono text-[#CCD0CF] whitespace-nowrap z-20 shadow">
                {item.completed} ok · {item.focusHours}h
              </div>
            )}
            <div className="w-full flex items-end justify-center gap-1 flex-1 bg-[#06141B]/55 rounded-lg p-1 overflow-hidden">
              <div
                style={{
                  height: `${completedHeight}%`,
                  animationDelay: `${idx * 65 + 100}ms`,
                }}
                className="w-3 sm:w-3.5 bg-gradient-to-t from-[#4A5C6A] to-[#CCD0CF] rounded-t-md shadow-[0_0_12px_rgba(204,208,207,0.28)] animate-vitrea-bar group-hover:brightness-110"
              />
              <div
                style={{
                  height: `${Math.max(14, urgentHeight)}%`,
                  animationDelay: `${idx * 65 + 180}ms`,
                }}
                className="w-2 sm:w-2.5 bg-gradient-to-t from-[#9BA8AB]/60 to-[#ED9695] rounded-t-md animate-vitrea-bar"
              />
            </div>
            <span
              className={`text-[9px] font-mono ${
                isHi ? 'text-[#CCD0CF] font-bold' : 'text-[#9BA8AB]'
              }`}
            >
              {item.day}
            </span>
          </div>
        );
      })}
    </div>
  );

  // ============================================================================
  // SHARED VITREA #/RELEASES DRAG-AND-DROP KANBAN BOARD FOR TASKS
  // ============================================================================
  const renderVitreaReleasesBoard = (compact = false) => {
    const columns: { id: TaskStatus; title: string; dotColor: string }[] = [
      { id: 'urgent', title: 'Urgentes', dotColor: 'bg-ops-danger shadow-[0_0_8px_#ED9695]' },
      { id: 'in_progress', title: 'En Curso', dotColor: 'bg-[#CCD0CF] shadow-[0_0_8px_#CCD0CF]' },
      { id: 'blocked', title: 'Bloqueadas', dotColor: 'bg-ops-warn shadow-[0_0_8px_#F3C98B]' },
      { id: 'completed', title: 'Completadas', dotColor: 'bg-[#9BA8AB]' },
    ];

    return (
      <div
        key={`board-${chartAnimKey}`}
        className={`grid grid-cols-1 ${
          compact ? 'sm:grid-cols-2 lg:grid-cols-4 gap-2.5' : 'md:grid-cols-2 xl:grid-cols-4 gap-3.5'
        }`}
      >
        {columns.map((col, colIdx) => {
          const colTasks = tasks.filter(
            (t) =>
              t.status === col.id &&
              (t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.code.toLowerCase().includes(searchQuery.toLowerCase()))
          );
          const isOver = dragTask?.overStatus === col.id;

          return (
            <section
              key={col.id}
              data-stage-col={col.id}
              className={`vitrea-col neu-well rounded-[22px] p-2.5 flex flex-col gap-2 ${
                compact ? 'min-h-[210px]' : 'min-h-[360px]'
              } ${isOver ? 'is-over' : ''}`}
            >
              {/* Column Header (.rb-col__head) */}
              <header className="flex items-center gap-2 px-2 py-1">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                <h3 className="text-xs font-bold text-[#CCD0CF] truncate">{col.title}</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#253745] text-[#CCD0CF] font-mono text-[10px] font-bold">
                  {colTasks.length}
                </span>
              </header>

              {/* Column Cards List (.rb-col__list) */}
              <div className="flex-1 flex flex-col gap-2">
                {/* Dashed Drop Slot when dragging over another column (.rb-ph) */}
                {isOver && dragTask && dragTask.task.status !== col.id && (
                  <div className="vitrea-ph h-24 rounded-2xl grid place-items-center text-[10px] font-mono text-[#CCD0CF]">
                    Soltar {dragTask.task.code} en {col.title}
                  </div>
                )}

                {colTasks.map((task, cardIdx) => {
                  const isBeingDragged = dragTask?.task.id === task.id;
                  const isSettling = recentlySettledTaskId === task.id;
                  const pct = Math.min(
                    100,
                    Math.round((task.loggedMinutes / Math.max(1, task.estimatedMinutes)) * 100)
                  );

                  if (isBeingDragged) {
                    return (
                      <div
                        key={task.id}
                        className="vitrea-ph h-24 rounded-2xl grid place-items-center text-[10px] font-mono text-[#9BA8AB]/70"
                        aria-hidden="true"
                      >
                        Moviendo {task.code}...
                      </div>
                    );
                  }

                  return (
                    <div
                      key={task.id}
                      onPointerDown={(e) => startTaskPointerDown(e, task)}
                      className={`vitrea-rel-card rounded-2xl p-3 space-y-2 ${
                        isSettling ? 'animate-vitrea-settle' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-[#CCD0CF] px-2 py-0.5 rounded-md bg-[#253745]/90">
                          {task.code}
                        </span>
                        <span className="text-[10px] font-mono text-[#9BA8AB] truncate">
                          {task.dueTime}
                        </span>
                      </div>

                      <p
                        className={`text-xs font-semibold leading-snug ${
                          task.status === 'completed'
                            ? 'line-through text-[#9BA8AB]'
                            : 'text-[#CCD0CF]'
                        }`}
                      >
                        {task.title}
                      </p>

                      {/* Staggered Animated Horizontal Progress Meter (.animate-vitrea-meter) */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[#06141B] overflow-hidden">
                          <div
                            style={{
                              width: `${pct}%`,
                              animationDelay: `${(colIdx * 2 + cardIdx) * 65 + 140}ms`,
                            }}
                            className={`h-full rounded-full animate-vitrea-meter ${
                              task.status === 'urgent' ? 'bg-ops-danger' : 'bg-[#CCD0CF]'
                            }`}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-[#9BA8AB]">{pct}%</span>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-1 border-t border-[#4A5C6A]/30 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[#9BA8AB] truncate">{task.project}</span>
                        <div className="flex items-center gap-1">
                          {task.pcTrigger && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLaunchTaskOnPC(task);
                              }}
                              title="Ejecutar en PC"
                              className="w-6 h-6 rounded-lg neuglass-btn-primary grid place-items-center"
                            >
                              <Play className="w-3 h-3 fill-current" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteTask(task.id, e.clientX, e.clientY);
                            }}
                            title="Completar"
                            className="w-6 h-6 rounded-lg neuglass-btn grid place-items-center text-[#CCD0CF]"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && !isOver && (
                  <div className="flex-1 border border-dashed border-[#4A5C6A]/45 rounded-2xl grid place-items-center p-4 text-[11px] text-[#9BA8AB] text-center">
                    Arrastra una ficha aquí
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  // ============================================================================
  // SHARED MODAL: APP LIBRARY & DOCK CONFIGURATOR
  // ============================================================================
  const renderAppLibraryModal = () => {
    if (!showAppLibraryModal && mobileModalSheet !== 'picker') return null;

    const closeLibrary = () => {
      setShowAppLibraryModal(false);
      if (mobileModalSheet === 'picker') setMobileModalSheet('none');
    };

    const SYSTEM_CONTROLS_LIBRARY: DockTile[] = [
      {
        id: 'ctrl-mic',
        label: 'Silenciar Mic Reunión',
        category: 'meeting',
        iconName: 'MicOff',
        shortcut: 'Ctrl+Shift+M',
        accentColor: 'coral',
        commandVerb: 'meeting:toggle-mic',
      },
      {
        id: 'ctrl-cam',
        label: 'Alternar Cámara Web',
        category: 'meeting',
        iconName: 'Video',
        shortcut: 'Ctrl+Shift+O',
        accentColor: 'mint',
        commandVerb: 'meeting:toggle-cam',
      },
      {
        id: 'ctrl-share',
        label: 'Compartir Pantalla PC',
        category: 'meeting',
        iconName: 'MonitorUp',
        shortcut: 'Ctrl+Shift+E',
        accentColor: 'amber',
        commandVerb: 'meeting:share-screen',
      },
      {
        id: 'ctrl-shot',
        label: 'Captura de Pantalla PC',
        category: 'control',
        iconName: 'Camera',
        shortcut: 'Win+Shift+S',
        accentColor: 'slate',
        commandVerb: 'capture:screenshot',
      },
      {
        id: 'ctrl-sign',
        label: 'Firma Digital PNG',
        category: 'control',
        iconName: 'PenTool',
        badge: 'PNG',
        accentColor: 'mint',
        commandVerb: 'signature:open',
      },
      {
        id: 'ctrl-lock',
        label: 'Bloquear Estación PC',
        category: 'control',
        iconName: 'Lock',
        shortcut: 'Win+L',
        accentColor: 'coral',
        commandVerb: 'control:lock',
      },
    ];

    return (
      <div className="fixed inset-0 z-50 bg-[#06141B]/80 backdrop-blur-md grid place-items-center p-3 sm:p-6">
        <div className="w-full max-w-4xl max-h-[90dvh] windock-glass rounded-3xl flex flex-col overflow-hidden text-ops-text">
          <div className="w-9 h-1 bg-[#4A5C6A] rounded-full mx-auto mt-2.5 shrink-0" />

          <div className="px-6 py-4 flex items-center justify-between gap-4 border-b border-white/10">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ops-accent">
                MAKE ROOM FOR YOUR FAVORITES · CONFIGURAR BOTONERA
              </p>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Biblioteca de Apps de {currentHost.name}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={scanRealPCApps}
                disabled={scanningLocalPC}
                className="px-3.5 py-2 rounded-xl bg-ops-surface2 border border-ops-line text-xs font-semibold text-ops-accent hover:border-ops-accent flex items-center gap-2 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanningLocalPC ? 'animate-spin' : ''}`} />
                <span>{scanningLocalPC ? 'Escaneando PC...' : 'Escanear Apps de mi PC'}</span>
              </button>
              <button
                type="button"
                onClick={closeLibrary}
                className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center text-ops-muted hover:text-ops-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-6 pt-4 flex flex-col sm:flex-row gap-3">
            <div className="flex p-1 gap-1 bg-ops-surface border border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setPickerTab('apps')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  pickerTab === 'apps'
                    ? 'bg-ops-surface2 text-ops-accent'
                    : 'text-ops-muted hover:text-ops-text'
                }`}
              >
                Apps del PC ({pcAppsCatalog.length})
              </button>
              <button
                type="button"
                onClick={() => setPickerTab('controls')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  pickerTab === 'controls'
                    ? 'bg-ops-surface2 text-ops-accent'
                    : 'text-ops-muted hover:text-ops-text'
                }`}
              >
                Controles & Reuniones ({SYSTEM_CONTROLS_LIBRARY.length})
              </button>
              <button
                type="button"
                onClick={() => setPickerTab('custom')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  pickerTab === 'custom'
                    ? 'bg-ops-surface2 text-ops-accent'
                    : 'text-ops-muted hover:text-ops-text'
                }`}
              >
                + Ruta .EXE Propia
              </button>
            </div>

            {pickerTab !== 'custom' && (
              <div className="flex-1 flex items-center gap-2.5 px-3.5 bg-ops-surface border border-ops-line rounded-xl">
                <Search className="w-4 h-4 text-ops-muted" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Buscar aplicación instalada en el PC (Excel, Teams, Chrome, VS Code...)"
                  className="w-full h-10 bg-transparent text-xs text-ops-text focus:outline-none"
                />
              </div>
            )}
          </div>

          {pickerTab === 'apps' && (
            <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {pcAppsCatalog
                .filter(
                  (a) =>
                    a.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                    a.category.toLowerCase().includes(pickerSearch.toLowerCase())
                )
                .map((app) => {
                  const alreadyAdded = isAppInDock(app.brandKey);
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => handleAddAppToDock(app)}
                      className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left transition group"
                    >
                      <AppBrandLogo
                        brandKey={app.brandKey}
                        iconDataUri={app.iconDataUri}
                        name={app.name}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-ops-text truncate">
                          {app.name}
                        </div>
                        <div className="text-[10px] font-mono text-ops-muted truncate mt-0.5">
                          {app.exePath}
                        </div>
                      </div>
                      <span
                        className={`w-8 h-8 rounded-xl grid place-items-center border text-xs font-bold shrink-0 ${
                          alreadyAdded
                            ? 'bg-ops-accent/15 border-ops-accent/40 text-ops-accent'
                            : 'border-ops-line text-ops-muted group-hover:border-ops-accent group-hover:text-ops-accent'
                        }`}
                      >
                        {alreadyAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}

          {pickerTab === 'controls' && (
            <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SYSTEM_CONTROLS_LIBRARY.map((ctrl) => (
                <button
                  key={ctrl.id}
                  type="button"
                  onClick={() => {
                    setTiles((prev) => [...prev, { ...ctrl, id: `${ctrl.id}-${Date.now()}` }]);
                    triggerToast(`Control "${ctrl.label}" añadido`, 'Disponible en tu botonera.');
                  }}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left transition"
                >
                  {renderTileVisual(ctrl, 'md')}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-ops-text">{ctrl.label}</div>
                    <div className="text-[10px] font-mono text-ops-muted mt-0.5">
                      Atajo: {ctrl.shortcut || ctrl.commandVerb}
                    </div>
                  </div>
                  <span className="w-8 h-8 rounded-xl grid place-items-center border border-ops-line text-ops-accent">
                    <Plus className="w-4 h-4" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {pickerTab === 'custom' && (
            <form onSubmit={handleAddCustomApp} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ops-muted mb-1.5">
                    Nombre de la Aplicación o Script del PC
                  </label>
                  <input
                    type="text"
                    required
                    value={customAppName}
                    onChange={(e) => setCustomAppName(e.target.value)}
                    placeholder="Ej: SAP Logon / Sistema Contable"
                    className="w-full bg-ops-surface border border-ops-line rounded-xl px-3.5 py-2.5 text-xs text-ops-text focus:outline-none focus:border-ops-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ops-muted mb-1.5">
                    Logo / Identidad Visual
                  </label>
                  <select
                    value={customAppBrand}
                    onChange={(e) => setCustomAppBrand(e.target.value)}
                    className="w-full bg-ops-surface border border-ops-line rounded-xl px-3.5 py-2.5 text-xs text-ops-text focus:outline-none focus:border-ops-accent"
                  >
                    <option value="excel">Microsoft Excel (Verde)</option>
                    <option value="word">Microsoft Word (Azul)</option>
                    <option value="powerpoint">PowerPoint (Naranja)</option>
                    <option value="teams">Microsoft Teams (Violeta)</option>
                    <option value="zoom">Zoom Workplace (Azul)</option>
                    <option value="outlook">Outlook Correo</option>
                    <option value="chrome">Google Chrome</option>
                    <option value="vscode">Visual Studio Code</option>
                    <option value="powerbi">Power BI (Amarillo)</option>
                    <option value="terminal">Terminal / Script</option>
                    <option value="acrobat">Adobe PDF</option>
                    <option value="explorer">Carpeta / Explorador</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ops-muted mb-1.5">
                  Ruta del Ejecutable (.exe) o URL en el PC
                </label>
                <input
                  type="text"
                  value={customAppExe}
                  onChange={(e) => setCustomAppExe(e.target.value)}
                  placeholder="Ej: C:\Program Files\SAP\FrontEnd\SAPgui\saplogon.exe"
                  className="w-full bg-ops-surface border border-ops-line rounded-xl px-3.5 py-2.5 text-xs font-mono text-ops-text focus:outline-none focus:border-ops-accent"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-ops-accent text-ops-accentDark text-xs font-semibold"
              >
                Agregar a la Botonera del PC y Móvil
              </button>
            </form>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // SHARED MOBILE / TABLET / APK INNER SCREEN
  // NO POPUP WINDOWS! All pages (Botonera, Métricas & Gráficos, Tablero Drag & Drop, Touchpad)
  // move and render directly inside the Main Window (<main>)!
  // ============================================================================
  const renderMobileScreenContent = () => {
    const isOnDockPage = safeEnvPage < totalDockPages;
    const isOnAnalyticsPage = safeEnvPage === analyticsPageIdx;
    const isOnBoardPage = safeEnvPage === boardPageIdx;
    const isOnTouchpadPage = safeEnvPage === touchpadPageIdx;

    return (
      <div
        onTouchStart={(e) =>
          onSurfaceTouchStart(e.touches[0].clientX, e.touches[0].clientY)
        }
        onTouchEnd={(e) =>
          onSurfaceTouchEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
        }
        onMouseDown={(e) => onSurfaceTouchStart(e.clientX, e.clientY)}
        onMouseUp={(e) => onSurfaceTouchEnd(e.clientX, e.clientY)}
        className={`h-full w-full flex flex-col justify-between select-none overflow-hidden no-scrollbar relative text-ops-text ${wallpaperClass}`}
      >
        {/* Top Unified Bar: Icon-Only Controls + Top Window Indicator Dots (• • •) */}
        {!immersiveMobile ? (
          <header className="h-12 px-3.5 sm:px-5 border-b border-[#4A5C6A]/30 flex items-center justify-between gap-2 shrink-0 z-20 windock-glass">
            {/* Left Brand Icon (Tap returns to Botonera Page 1) + Live Latency Dot */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateToEnvPage(0)}
                className={`w-8 h-8 rounded-xl grid place-items-center transition ${
                  isOnDockPage ? 'neuglass-btn-primary' : 'neuglass-pedestal text-[#CCD0CF]'
                }`}
                title="Ir a la Botonera Principal"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowPairingModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full neu-well hover:border-[#CCD0CF]/50 text-[10px] font-mono text-[#CCD0CF] transition"
                title={`Enlace Infalible Triple-Failover: ${currentHost.name} (${routeBadgeLabel(currentHost.route)})`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#CCD0CF] animate-pulse-subtle" />
                <span>{currentHost.route === 'USB_ADB' ? 'USB' : currentHost.route === 'LAN_TLS' ? 'LAN' : '443'} · {currentHost.latencyMs}ms</span>
                <QrCode className="w-3 h-3 text-[#9BA8AB]" />
              </button>
            </div>

            {/* CENTER-TOP: Unified Main Environment Page Dots (Botonera • • | Métricas • | Tablero • | Touchpad •) */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full neu-well">
              {/* Dots for Botonera Pages */}
              {Array.from({ length: totalDockPages }).map((_, i) => (
                <button
                  key={`dock-dot-${i}`}
                  type="button"
                  onClick={() => navigateToEnvPage(i)}
                  aria-label={`Botonera Página ${i + 1}`}
                  title={`Botonera Página ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    safeEnvPage === i
                      ? 'w-6 bg-[#CCD0CF] shadow-[0_0_10px_rgba(204,208,207,0.75)]'
                      : 'w-2 bg-[#4A5C6A] hover:bg-[#9BA8AB]'
                  }`}
                />
              ))}

              <span className="w-px h-2.5 bg-[#4A5C6A]/60 mx-0.5" />

              {/* Dot for Animated Executive Dashboard & Metrics Page */}
              <button
                type="button"
                onClick={() => navigateToEnvPage(analyticsPageIdx)}
                title="Página: Dashboard & Gráficos Animados"
                className={`h-2 rounded-full transition-all duration-300 ${
                  isOnAnalyticsPage
                    ? 'w-6 bg-[#CCD0CF] shadow-[0_0_10px_rgba(204,208,207,0.75)]'
                    : 'w-2 bg-[#9BA8AB]/50 hover:bg-[#CCD0CF]'
                }`}
              />

              {/* Dot for Vitrea Drag & Drop Board Page */}
              <button
                type="button"
                onClick={() => navigateToEnvPage(boardPageIdx)}
                title="Página: Tablero Drag & Drop de Fichas"
                className={`h-2 rounded-full transition-all duration-300 ${
                  isOnBoardPage
                    ? 'w-6 bg-[#CCD0CF] shadow-[0_0_10px_rgba(204,208,207,0.75)]'
                    : 'w-2 bg-[#9BA8AB]/50 hover:bg-[#CCD0CF]'
                }`}
              />

              {/* Dot for Touchpad & Signature Page */}
              <button
                type="button"
                onClick={() => navigateToEnvPage(touchpadPageIdx)}
                title="Página: Touchpad & Firma PNG"
                className={`h-2 rounded-full transition-all duration-300 ${
                  isOnTouchpadPage
                    ? 'w-6 bg-[#CCD0CF] shadow-[0_0_10px_rgba(204,208,207,0.75)]'
                    : 'w-2 bg-[#9BA8AB]/50 hover:bg-[#CCD0CF]'
                }`}
              />
            </div>

            {/* Right Pure Icon-Only Quick Page Switchers + Language Toggle (ES / EN) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectLang(lang === 'es' ? 'en' : 'es')}
                title={
                  lang === 'es'
                    ? 'Cambiar idioma a Inglés (Switch to English)'
                    : 'Switch language to Spanish (Cambiar a Español)'
                }
                className="px-2 h-8 rounded-xl neuglass-btn text-[10px] font-mono font-bold text-[#CCD0CF] flex items-center gap-1"
              >
                <span>{lang === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToEnvPage(analyticsPageIdx)}
                title="Página de Gráficos & Métricas"
                className={`relative w-8 h-8 rounded-xl grid place-items-center transition ${
                  isOnAnalyticsPage ? 'neuglass-btn-primary' : 'neuglass-btn text-[#CCD0CF]'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => navigateToEnvPage(boardPageIdx)}
                title="Página Tablero Drag & Drop (Mover Fichas)"
                className={`relative w-8 h-8 rounded-xl grid place-items-center transition ${
                  isOnBoardPage ? 'neuglass-btn-primary' : 'neuglass-btn text-[#CCD0CF]'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                {urgentTasks.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ops-danger text-[#06141B] text-[9px] font-mono font-bold grid place-items-center">
                    {urgentTasks.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMobileModalSheet('picker')}
                title="Biblioteca de Apps del PC"
                className="w-8 h-8 rounded-xl neuglass-btn grid place-items-center text-[#CCD0CF]"
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsEditingDock(!isEditingDock)}
                title={isEditingDock ? 'Guardar orden' : 'Modo edición / arrastrar'}
                className={`w-8 h-8 rounded-xl grid place-items-center ${
                  isEditingDock ? 'neuglass-btn-primary' : 'neuglass-btn text-[#9BA8AB] hover:text-[#CCD0CF]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode('pc')}
                title="Vista Monitor PC"
                className="w-8 h-8 rounded-xl neuglass-btn grid place-items-center text-[#9BA8AB] hover:text-[#CCD0CF]"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>
        ) : (
          <button
            onClick={() => setImmersiveMobile(false)}
            title="Salir de modo inmersivo"
            className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full neuglass-btn grid place-items-center text-[#CCD0CF]"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        )}

        {/* ==================== MAIN ENVIRONMENT WINDOW (MOVES SEAMLESSLY BY PAGE) ==================== */}
        <main className="flex-1 flex flex-col justify-between px-3.5 sm:px-6 pt-2 pb-2 min-h-0 overflow-hidden no-scrollbar relative">
          {/* PAGE TYPE 1: ICON-ONLY BOTONERA DINÁMICA POR VENTANA ACTIVA (Pages 0 .. totalDockPages - 1) */}
          {isOnDockPage && (
            <div
              key={`env-dock-${activeContextId}-${safeEnvPage}-${isTabletDevice ? 'tab' : 'mob'}-${isPortraitDevice ? 'p' : 'l'}`}
              className="flex-1 flex flex-col justify-between min-h-0 overflow-hidden no-scrollbar animate-vitrea-page gap-2"
            >
              {/* Dynamic Context Switcher Bar (Muta según el programa activo en el PC) */}
              <div className="w-full max-w-4xl mx-auto shrink-0">
                {renderDynamicContextStrip(true)}
              </div>

              <div className="flex-1 grid place-items-center min-h-0 overflow-hidden no-scrollbar">
                <div
                  className={`w-full ${
                    isTabletDevice ? 'max-w-4xl gap-5 sm:gap-6' : 'max-w-3xl gap-3.5 sm:gap-4'
                  } grid ${adaptiveGridCols} items-center justify-items-center`}
                >
                  {currentMobilePageTiles.map((tile, idx) => {
                    const globalIndex = currentDockPageIdx * effectiveIconsPerPage + idx;
                    const isBeingDragged = dragTile?.tile.id === tile.id;
                    const isSettling = recentlySettledTileId === tile.id;
                    const sizeClasses = isTabletDevice
                      ? 'w-24 sm:w-28 rounded-[30px]'
                      : isPortraitDevice
                      ? 'w-24 rounded-[26px]'
                      : 'w-20 sm:w-24 rounded-[26px]';

                    if (isBeingDragged) {
                      return (
                        <div
                          key={tile.id}
                          data-tile-index={globalIndex}
                          className={`vitrea-ph aspect-square ${sizeClasses}`}
                        />
                      );
                    }

                    return (
                      <div
                        key={tile.id}
                        data-tile-index={globalIndex}
                        onPointerDown={(e) => startTilePointerDown(e, tile, globalIndex)}
                        onClick={() => handleTilePress(tile)}
                        title={`${tile.label} — Arrastra para cambiar de posición`}
                        className={`neuglass-tile group aspect-square ${sizeClasses} flex flex-col items-center justify-center relative cursor-grab active:cursor-grabbing select-none ${
                          isEditingDock ? 'tile-editing' : ''
                        } ${isSettling ? 'animate-vitrea-settle' : ''}`}
                      >
                        {isEditingDock && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTile(tile.id);
                            }}
                            className="absolute -top-1.5 -right-1.5 z-20 w-5 h-5 rounded-full bg-ops-danger text-[#06141B] grid place-items-center font-bold text-[10px] shadow"
                          >
                            −
                          </button>
                        )}

                        {renderTileVisual(tile, isTabletDevice ? 'xl' : 'lg')}

                        {tile.running && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#CCD0CF] shadow-[0_0_8px_#CCD0CF] absolute bottom-2" />
                        )}

                        <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -bottom-6 px-2 py-0.5 rounded-md bg-[#06141B]/95 border border-[#4A5C6A]/50 text-[9px] font-medium text-[#CCD0CF] whitespace-nowrap z-30 shadow-lg">
                          {tile.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PAGE TYPE 2: ANIMATED EXECUTIVE DASHBOARD & METRICS (Directly in Main Window!) */}
          {isOnAnalyticsPage && (
            <div
              key={`env-analytics-${chartAnimKey}`}
              className="flex-1 w-full max-w-5xl mx-auto flex flex-col justify-between gap-2.5 overflow-y-auto no-scrollbar animate-vitrea-page py-1"
            >
              {/* Page Header Inside Main Environment */}
              <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl neuglass-pedestal grid place-items-center text-[#CCD0CF]">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-[#CCD0CF] leading-tight">
                      Executive Pulse & Métricas en Vivo
                    </h2>
                    <p className="text-[10px] font-mono text-[#9BA8AB]">
                      {currentHost.name} · Toca cualquier barra o nodo para inspeccionar
                    </p>
                  </div>
                </div>

                {/* Seamless Page Switcher Pill (No X button, transitions in place) */}
                <div className="flex items-center gap-1.5">
                  <div className="flex p-0.5 rounded-full neu-well gap-1">
                    <button
                      type="button"
                      onClick={() => navigateToEnvPage(0)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-[#9BA8AB] hover:text-[#CCD0CF] transition"
                    >
                      Botonera
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartAnimKey((k) => k + 1)}
                      className="px-3 py-1 rounded-full text-[10px] font-semibold neuglass-btn-primary transition"
                      title="Repetir animación de carga de gráficos"
                    >
                      Métricas & Gráficos
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToEnvPage(boardPageIdx)}
                      className="px-3 py-1 rounded-full text-[10px] font-semibold text-[#9BA8AB] hover:text-[#CCD0CF] transition"
                    >
                      Tablero Drag & Drop
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 1: Animated Radial Gauges + Interactive Spline Curve + Staggered Vertical Bars */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-stretch shrink-0">
                {/* 4 Cols: Dual Animated Radial Rings */}
                <div className="md:col-span-4 neuglass-panel rounded-2xl p-3 flex items-center justify-around gap-2">
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 grid place-items-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="32" stroke="#253745" strokeWidth="6" fill="none" />
                        <circle
                          key={`ring1-${chartAnimKey}`}
                          cx="40"
                          cy="40"
                          r="32"
                          stroke="#CCD0CF"
                          strokeWidth="6"
                          strokeLinecap="round"
                          fill="none"
                          strokeDasharray="201"
                          strokeDashoffset={201 - (201 * completionRate) / 100}
                          className="animate-vitrea-ring"
                        />
                      </svg>
                      <span className="absolute text-xs sm:text-sm font-mono font-bold text-[#CCD0CF]">
                        {completionRate}%
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#9BA8AB] mt-1">
                      Cumplimiento
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 grid place-items-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="32" stroke="#253745" strokeWidth="6" fill="none" />
                        <circle
                          key={`ring2-${chartAnimKey}`}
                          cx="40"
                          cy="40"
                          r="32"
                          stroke="#9BA8AB"
                          strokeWidth="6"
                          strokeLinecap="round"
                          fill="none"
                          strokeDasharray="201"
                          strokeDashoffset={201 - (201 * 74) / 100}
                          style={{ animationDelay: '120ms' }}
                          className="animate-vitrea-ring"
                        />
                      </svg>
                      <span className="absolute text-xs sm:text-sm font-mono font-bold text-[#CCD0CF]">
                        28h
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#9BA8AB] mt-1">
                      Foco Semanal
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl neu-well grid place-items-center border border-[#ED9695]/45">
                      <span className="text-lg sm:text-xl font-mono font-bold text-ops-danger">
                        {urgentTasks.length}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-ops-danger mt-1.5">
                      Urgentes
                    </span>
                  </div>
                </div>

                {/* 4 Cols: Animated SVG Spline Curve with Clip-Path Reveal */}
                <div className="md:col-span-4 neuglass-panel rounded-2xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#CCD0CF]">Curva de Velocidad</span>
                    <span className="font-mono text-[10px] text-[#9BA8AB]">+18.4% vs Q3</span>
                  </div>
                  {renderInteractiveSplineChart('h-20 sm:h-24', 'mob-env')}
                </div>

                {/* 4 Cols: Animated Vertical Bars (Each Bar Grows with Staggered Spring!) */}
                <div className="md:col-span-4 neuglass-panel rounded-2xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#CCD0CF]">Rendimiento por Día</span>
                    <span className="font-mono text-[10px] text-[#CCD0CF]">91 t.</span>
                  </div>
                  {renderAnimatedVerticalBars('h-20 sm:h-24')}
                </div>
              </div>

              {/* Row 2: Priority Queue Cards with Animated Horizontal Progress Bars (.animate-vitrea-meter) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tasks.slice(0, 4).map((t, idx) => {
                  const pct = Math.min(
                    100,
                    Math.round((t.loggedMinutes / Math.max(1, t.estimatedMinutes)) * 100)
                  );
                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-2xl neuglass-panel flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              t.status === 'urgent' ? 'bg-ops-danger' : 'bg-[#CCD0CF]'
                            }`}
                          />
                          <span className="text-[10px] font-mono font-bold text-[#CCD0CF]">
                            {t.code}
                          </span>
                          <span className="text-[10px] font-mono text-ops-warn ml-auto">
                            {t.dueTime}
                          </span>
                        </div>
                        <div
                          className={`text-xs font-semibold truncate ${
                            t.status === 'completed' ? 'line-through text-[#9BA8AB]' : 'text-[#CCD0CF]'
                          }`}
                        >
                          {t.title}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-[#06141B] overflow-hidden">
                            <div
                              key={`meter-${t.id}-${chartAnimKey}`}
                              style={{
                                width: `${pct}%`,
                                animationDelay: `${idx * 85 + 220}ms`,
                              }}
                              className={`h-full rounded-full animate-vitrea-meter ${
                                t.status === 'urgent' ? 'bg-ops-danger' : 'bg-[#CCD0CF]'
                              }`}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-[#9BA8AB]">{pct}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {t.pcTrigger && (
                          <button
                            onClick={() => handleLaunchTaskOnPC(t)}
                            title={`Abrir en PC: ${t.pcTrigger.appsToLaunch.join(' + ')}`}
                            className="w-8 h-8 rounded-xl neuglass-btn-primary grid place-items-center"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleCompleteTask(t.id, e.clientX, e.clientY)}
                          title="Marcar completada"
                          className="w-8 h-8 rounded-xl neuglass-btn grid place-items-center text-[#CCD0CF]"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PAGE TYPE 3: VITREA DRAG & DROP RELEASES/TASKS BOARD + AGENTE IA TRIAJE (Directly in Main Window!) */}
          {isOnBoardPage && (
            <div
              key={`env-board-${chartAnimKey}`}
              className="flex-1 w-full max-w-5xl mx-auto flex flex-col justify-between gap-2 overflow-y-auto no-scrollbar animate-vitrea-page py-1"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl neuglass-pedestal grid place-items-center text-[#CCD0CF]">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-[#CCD0CF] leading-tight">
                      Tablero Vitrea + Agente IA Tickets/Correo
                    </h2>
                    <p className="text-[10px] font-mono text-[#9BA8AB]">
                      Arrastra fichas o inyecta requerimientos desde Outlook / ServiceNow / Jira
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowMobileTriageStrip(!showMobileTriageStrip)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition ${
                      showMobileTriageStrip
                        ? 'neuglass-btn-primary'
                        : 'neu-well text-[#CCD0CF] border border-[#9BA8AB]/40'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Agente IA ({pendingTriageCount})</span>
                  </button>

                  {pendingTriageCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => handleAutoTriageBatch(e)}
                      className="neuglass-btn-primary px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"
                      title="Analizar todos los correos y tickets pendientes e inyectarlos al Kanban"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Triaje IA</span>
                    </button>
                  )}

                  <div className="hidden sm:flex p-0.5 rounded-full neu-well gap-1">
                    <button
                      type="button"
                      onClick={() => navigateToEnvPage(0)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-[#9BA8AB] hover:text-[#CCD0CF] transition"
                    >
                      Botonera
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToEnvPage(analyticsPageIdx)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-[#9BA8AB] hover:text-[#CCD0CF] transition"
                    >
                      Métricas
                    </button>
                  </div>

                  <button
                    onClick={() => setShowNewTaskModal(true)}
                    title="Nueva Ficha Urgente"
                    className="neuglass-btn w-8 h-8 rounded-xl grid place-items-center text-[#CCD0CF]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Integrated AI Email & IT Ticket Triage Strip Inside the Main Window */}
              {showMobileTriageStrip && (
                <div className="neuglass-panel rounded-2xl p-2.5 space-y-2 shrink-0 animate-vitrea-page">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#9BA8AB] px-1">
                    <span>
                      FUENTES ENLAZADAS: <strong className="text-[#CCD0CF]">OUTLOOK 365 · SERVICENOW · JIRA ITSM · GLPI</strong>
                    </span>
                    <span>FILTRO ANTI-RUIDO ACTIVO</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto no-scrollbar">
                    {triageFeed.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl neu-well flex items-center justify-between gap-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                !item.isActionable
                                  ? 'bg-[#253745] text-[#9BA8AB]'
                                  : item.suggestedStatus === 'urgent'
                                  ? 'bg-[#ED9695]/25 text-ops-danger'
                                  : 'bg-[#253745] text-[#CCD0CF]'
                              }`}
                            >
                              {item.sourcePlatform} · {item.externalId}
                            </span>
                            {item.slaMinutes && (
                              <span className="text-[9px] font-mono text-ops-warn">
                                SLA {item.slaMinutes}m
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-semibold text-[#CCD0CF] truncate mt-1">
                            {item.subject}
                          </p>
                          <p className="text-[9px] text-[#9BA8AB] truncate">{item.aiReasoning}</p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleConvertTriageToKanban(item, e.clientX, e.clientY)}
                          disabled={item.processedIntoKanban}
                          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold shrink-0 ${
                            item.processedIntoKanban
                              ? 'bg-[#253745]/50 text-[#9BA8AB]'
                              : !item.isActionable
                              ? 'neuglass-btn text-[#9BA8AB]'
                              : 'neuglass-btn-primary'
                          }`}
                        >
                          {item.processedIntoKanban
                            ? '✓ En Kanban'
                            : !item.isActionable
                            ? 'Descartar'
                            : '+ Al Kanban'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto no-scrollbar">
                {renderVitreaReleasesBoard(true)}
              </div>
            </div>
          )}

          {/* PAGE TYPE 4: TOUCHPAD & FIRMA DIGITAL PNG (Directly in Main Window!) */}
          {isOnTouchpadPage && (
            <div
              key="env-touchpad"
              className="flex-1 w-full max-w-4xl mx-auto flex flex-col justify-between gap-2.5 overflow-hidden animate-vitrea-page py-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5 neu-well p-1 rounded-full">
                  <button
                    onClick={() => setDockSubMode('touchpad')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      dockSubMode !== 'signature' ? 'neuglass-btn-primary' : 'text-[#9BA8AB]'
                    }`}
                  >
                    <MousePointer className="w-3.5 h-3.5 inline mr-1" />
                    Touchpad PC
                  </button>
                  <button
                    onClick={() => setDockSubMode('signature')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      dockSubMode === 'signature' ? 'neuglass-btn-primary' : 'text-[#9BA8AB]'
                    }`}
                  >
                    <PenTool className="w-3.5 h-3.5 inline mr-1" />
                    Firma PNG
                  </button>
                </div>

                <button
                  onClick={() => navigateToEnvPage(0)}
                  className="neuglass-btn px-3 py-1 rounded-full text-[11px] font-semibold text-[#CCD0CF]"
                >
                  Volver a Botonera
                </button>
              </div>

              {dockSubMode !== 'signature' ? (
                <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0">
                  <div
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setCursorPos({
                        x: Math.round(((e.clientX - rect.left) / rect.width) * 100),
                        y: Math.round(((e.clientY - rect.top) / rect.height) * 100),
                      });
                    }}
                    onClick={() => triggerToast('Clic en PC', currentHost.name)}
                    className="flex-1 rounded-3xl neu-well relative grid place-items-center overflow-hidden"
                    style={{
                      backgroundImage: 'radial-gradient(#4A5C6A 1px, transparent 1px)',
                      backgroundSize: '22px 22px',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full bg-[#CCD0CF]/25 border-2 border-[#CCD0CF] absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
                    />
                    <MousePointer className="w-6 h-6 text-[#4A5C6A] pointer-events-none" />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={remoteInputText}
                      onChange={(e) => setRemoteInputText(e.target.value)}
                      placeholder="Teclado remoto hacia el PC..."
                      className="flex-1 bg-[#11212D] border border-[#4A5C6A]/50 rounded-xl px-3.5 py-2 text-xs text-[#CCD0CF]"
                    />
                    <button
                      onClick={() => {
                        if (!remoteInputText.trim()) return;
                        triggerToast('Texto enviado al PC', remoteInputText);
                        setRemoteInputText('');
                      }}
                      className="neuglass-btn-primary px-4 py-2 rounded-xl text-xs font-bold"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0">
                  <canvas
                    ref={canvasRef}
                    width={760}
                    height={190}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    className="flex-1 w-full rounded-3xl bg-[#06141B] border border-dashed border-[#9BA8AB]/60"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={clearSignature}
                      className="neuglass-btn px-4 py-1.5 rounded-xl text-xs font-semibold"
                    >
                      Limpiar
                    </button>
                    <button
                      onClick={(e) => {
                        handleCompleteTask('tsk-101', e.clientX, e.clientY);
                        triggerToast('Firma insertada en PC', 'Balance_Q4_Firma.xlsx firmado');
                      }}
                      className="neuglass-btn-primary px-5 py-1.5 rounded-xl text-xs font-bold"
                    >
                      Firmar en PC
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== INTEGRATED BOTTOM CAJÓN (Unfolds Directly Inside the Main Window) ==================== */}
          <div className="w-full flex flex-col items-center justify-end shrink-0 z-30 pt-1">
            {isDrawerExpanded ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xl mx-auto windock-glass rounded-[26px] px-4 py-2.5 flex items-center justify-between gap-2 animate-drawer-spring"
              >
                <div className="flex items-center justify-around flex-1 gap-1.5">
                  {[
                    { id: 'dock', title: 'Botonera de Apps', icon: LayoutGrid, active: isOnDockPage, action: () => { navigateToEnvPage(0); setIsDrawerExpanded(false); } },
                    { id: 'dash', title: 'Página Métricas & Gráficos', icon: BarChart3, active: isOnAnalyticsPage, action: () => { navigateToEnvPage(analyticsPageIdx); setIsDrawerExpanded(false); } },
                    { id: 'board', title: 'Página Tablero Drag & Drop', icon: CheckSquare, active: isOnBoardPage, action: () => { navigateToEnvPage(boardPageIdx); setIsDrawerExpanded(false); } },
                    { id: 'touch', title: 'Página Touchpad & Firma PNG', icon: MousePointer, active: isOnTouchpadPage, action: () => { navigateToEnvPage(touchpadPageIdx); setIsDrawerExpanded(false); } },
                    { id: 'picker', title: 'Añadir Apps del PC', icon: Plus, active: mobileModalSheet === 'picker', action: () => { setMobileModalSheet('picker'); setIsDrawerExpanded(false); } },
                    { id: 'meet', title: 'Controles de Reunión', icon: Video, active: mobileModalSheet === 'meetings', action: () => { setMobileModalSheet('meetings'); setIsDrawerExpanded(false); } },
                    { id: 'look', title: 'Ajustes de Superficie', icon: Sun, active: mobileModalSheet === 'settings', action: () => { setMobileModalSheet('settings'); setIsDrawerExpanded(false); } },
                    { id: 'pc', title: 'Vista Monitor PC', icon: Monitor, active: false, action: () => setViewMode('pc') },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.action}
                      title={item.title}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl grid place-items-center transition ${
                        item.active
                          ? 'neuglass-btn-primary'
                          : 'neuglass-btn text-[#CCD0CF] hover:text-white'
                      }`}
                    >
                      <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerExpanded(false)}
                  title="Ocultar cajón inferior"
                  className="w-8 h-10 rounded-xl neu-well grid place-items-center text-[#9BA8AB] hover:text-[#CCD0CF]"
                >
                  <ChevronUp className="w-4 h-4 rotate-180" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsDrawerExpanded(true)}
                title="Desplegar cajón de controles (o desliza hacia arriba)"
                className="group px-5 py-1.5 rounded-full neu-well hover:border-[#9BA8AB]/60 flex items-center gap-2 transition-all duration-300"
              >
                <span className="w-8 h-1 rounded-full bg-[#9BA8AB]/70 group-hover:bg-[#CCD0CF] group-hover:w-11 transition-all duration-300" />
                <ChevronUp className="w-3 h-3 text-[#9BA8AB] group-hover:text-[#CCD0CF] -my-0.5 transition-transform group-hover:-translate-y-0.5" />
              </button>
            )}
          </div>
        </main>

        {/* ==================== MOBILE APPEARANCE & LAYOUT SHEET ==================== */}
        {mobileModalSheet === 'settings' && (
          <div
            onClick={() => setMobileModalSheet('none')}
            className="absolute inset-0 z-40 bg-[#06141B]/75 backdrop-blur-sm grid place-items-center p-4 animate-view-enter"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md windock-glass rounded-3xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#CCD0CF]">
                  {lang === 'es' ? 'Idioma, Densidad de Íconos & Tema' : 'Language, Icon Density & Theme'}
                </h3>
                <button onClick={() => setMobileModalSheet('none')}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selector de Idioma: Español / English */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectLang('es')}
                  className={`py-2 rounded-xl border text-xs font-bold ${
                    lang === 'es' ? 'neuglass-btn-primary' : 'neuglass-btn text-[#9BA8AB]'
                  }`}
                >
                  🇪🇸 Español (Predeterminado)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectLang('en')}
                  className={`py-2 rounded-xl border text-xs font-bold ${
                    lang === 'en' ? 'neuglass-btn-primary' : 'neuglass-btn text-[#9BA8AB]'
                  }`}
                >
                  🇺🇸 English
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {([4, 6, 8] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setIconsPerPage(n);
                      setMobilePage(0);
                    }}
                    className={`py-2 rounded-xl border text-xs font-semibold ${
                      iconsPerPage === n ? 'neuglass-btn-primary' : 'neuglass-btn text-[#9BA8AB]'
                    }`}
                  >
                    {n} íconos
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {(['aurora', 'dusk', 'ember', 'midnight'] as WallpaperTheme[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => setWallpaper(w)}
                    className={`py-2 rounded-xl border text-xs font-semibold capitalize ${
                      wallpaper === w ? 'neuglass-btn-primary' : 'neuglass-btn text-[#9BA8AB]'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== MOBILE MEETINGS ICON SHEET ==================== */}
        {mobileModalSheet === 'meetings' && (
          <div
            onClick={() => setMobileModalSheet('none')}
            className="absolute inset-0 z-40 bg-[#06141B]/75 backdrop-blur-sm grid place-items-center p-4 animate-view-enter"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md windock-glass rounded-3xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#CCD0CF] truncate">{meetings[0].title}</span>
                <button onClick={() => setMobileModalSheet('none')}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                <button
                  onClick={() => setMicMuted(!micMuted)}
                  title="Micrófono"
                  className={`h-14 rounded-2xl grid place-items-center ${
                    micMuted ? 'bg-ops-danger text-[#06141B]' : 'neuglass-btn text-[#CCD0CF]'
                  }`}
                >
                  {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setCamActive(!camActive)}
                  title="Cámara"
                  className={`h-14 rounded-2xl grid place-items-center ${
                    !camActive ? 'bg-ops-danger text-[#06141B]' : 'neuglass-btn text-[#CCD0CF]'
                  }`}
                >
                  {camActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setScreenSharing(!screenSharing)}
                  title="Compartir Pantalla"
                  className={`h-14 rounded-2xl grid place-items-center ${
                    screenSharing ? 'neuglass-btn-primary' : 'neuglass-btn text-[#CCD0CF]'
                  }`}
                >
                  <MonitorUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setHandRaised(!handRaised)}
                  title="Levantar Mano"
                  className={`h-14 rounded-2xl grid place-items-center ${
                    handRaised ? 'bg-ops-warn text-[#06141B]' : 'neuglass-btn text-[#CCD0CF]'
                  }`}
                >
                  <Hand className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // VIEW MODE 0: ANDROID DEVICE HUB APK LIVE SIMULATOR ('apk-sim')
  // ============================================================================
  if (viewMode === 'apk-sim') {
    return (
      <div className="h-[100dvh] w-screen bg-[#06141B] text-[#CCD0CF] flex flex-col justify-between select-none overflow-hidden no-scrollbar">
        <header className="h-12 px-4 border-b border-[#4A5C6A]/35 bg-[#11212D]/90 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg neuglass-pedestal grid place-items-center text-[#CCD0CF]">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-[#CCD0CF]">OpsDeck APK</span>
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full neu-well ml-1">
              {['#06141B', '#11212D', '#253745', '#4A5C6A', '#9BA8AB', '#CCD0CF'].map((hex) => (
                <span
                  key={hex}
                  title={hex}
                  className="w-3 h-3 rounded-full border border-white/20"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Selector de Idioma: Español / English */}
            <div className="flex items-center p-0.5 rounded-xl neu-well gap-0.5">
              <button
                type="button"
                onClick={() => handleSelectLang('es')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                  lang === 'es' ? 'neuglass-btn-primary' : 'text-[#9BA8AB] hover:text-[#CCD0CF]'
                }`}
              >
                🇪🇸 ES
              </button>
              <button
                type="button"
                onClick={() => handleSelectLang('en')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                  lang === 'en' ? 'neuglass-btn-primary' : 'text-[#9BA8AB] hover:text-[#CCD0CF]'
                }`}
              >
                🇺🇸 EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPairingModal(true)}
              className="px-2.5 py-1 rounded-xl neuglass-btn text-[11px] font-semibold text-[#CCD0CF] flex items-center gap-1"
              title={lang === 'es' ? 'Ver Instrucciones en Español / QR' : 'View Instructions / QR'}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {lang === 'es' ? 'Instrucciones' : 'Instructions'}
              </span>
            </button>

            <div className="flex items-center p-0.5 rounded-xl neu-well gap-1">
              <button
                onClick={() => {
                  setApkFormFactor('phone');
                  setMobilePage(0);
                }}
                title="Simular Teléfono Móvil"
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                  apkFormFactor === 'phone'
                    ? 'neuglass-btn-primary'
                    : 'text-[#9BA8AB] hover:text-[#CCD0CF]'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Móvil</span>
              </button>
              <button
                onClick={() => {
                  setApkFormFactor('tablet');
                  setMobilePage(0);
                }}
                title="Simular Tablet / iPad"
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                  apkFormFactor === 'tablet'
                    ? 'neuglass-btn-primary'
                    : 'text-[#9BA8AB] hover:text-[#CCD0CF]'
                }`}
              >
                <Laptop className="w-3 h-3" />
                <span>Tablet</span>
              </button>
            </div>

            <button
              onClick={() =>
                setApkOrientation((o) => (o === 'landscape' ? 'portrait' : 'landscape'))
              }
              title="Rotar Dispositivo (Horizontal / Vertical)"
              className="w-8 h-8 rounded-xl neuglass-btn grid place-items-center text-[#CCD0CF]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() =>
                setApkScreenState((s) => (s === 'app' ? 'launcher' : 'app'))
              }
              title="Alternar Inicio Android / App OpsDeck"
              className="w-8 h-8 rounded-xl neuglass-btn grid place-items-center text-[#CCD0CF]"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setViewMode('mobile')}
              title="Expandir a Pantalla Completa 100%"
              className="w-8 h-8 rounded-xl neuglass-btn grid place-items-center text-[#CCD0CF]"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setViewMode('pc')}
              title="Cambiar a Vista Monitor PC"
              className="w-8 h-8 rounded-xl neuglass-btn-primary grid place-items-center"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        <div className="flex-1 grid place-items-center p-2 sm:p-4 overflow-hidden no-scrollbar relative">
          <div
            className={`relative transition-all duration-500 rounded-[42px] p-2.5 bg-gradient-to-b from-[#253745] via-[#11212D] to-[#06141B] border-[3px] border-[#4A5C6A] shadow-[0_28px_75px_rgba(0,0,0,0.85),inset_0_2px_3px_rgba(204,208,207,0.35)] flex flex-col ${
              apkFormFactor === 'tablet'
                ? apkOrientation === 'landscape'
                  ? 'w-full max-w-[1140px] h-full max-h-[680px]'
                  : 'w-full max-w-[580px] h-full max-h-[820px]'
                : apkOrientation === 'landscape'
                ? 'w-full max-w-[880px] h-full max-h-[450px]'
                : 'w-full max-w-[390px] h-full max-h-[760px]'
            }`}
          >
            <div className="flex-1 rounded-[32px] bg-[#06141B] border border-[#4A5C6A]/40 overflow-hidden no-scrollbar flex flex-col relative">
              <div className="h-6 px-5 bg-[#06141B]/95 flex items-center justify-between text-[10px] font-mono text-[#9BA8AB] shrink-0 z-20">
                <span className="font-semibold text-[#CCD0CF]">15:42</span>
                <div className="w-2.5 h-2.5 rounded-full bg-black border border-[#253745]" />
                <div className="flex items-center gap-2">
                  <Wifi className="w-3 h-3 text-[#CCD0CF]" />
                  <span className="text-[#CCD0CF] font-bold">98%</span>
                </div>
              </div>

              <div className="flex-1 min-h-0 relative overflow-hidden no-scrollbar">
                {apkScreenState === 'launcher' ? (
                  <div className="h-full w-full windock-aurora flex flex-col justify-between p-8 text-center animate-view-enter">
                    <div className="mt-2">
                      <div className="text-4xl font-light text-[#CCD0CF] tracking-tight">15:42</div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-4">
                      <button
                        onClick={() => setApkScreenState('app')}
                        className="group flex flex-col items-center gap-2 p-4 rounded-3xl neuglass-tile"
                      >
                        <div className="w-20 h-20 rounded-[26%] neuglass-pedestal bg-gradient-to-br from-[#253745] to-[#06141B] border border-[#9BA8AB]/60 grid place-items-center shadow-2xl">
                          <LayoutGrid className="w-10 h-10 text-[#CCD0CF]" />
                        </div>
                        <span className="text-xs font-bold text-[#CCD0CF]">OpsDeck</span>
                      </button>
                    </div>

                    <div className="text-[10px] text-[#9BA8AB]">Toca el ícono para abrir</div>
                  </div>
                ) : (
                  renderMobileScreenContent()
                )}
              </div>
            </div>
          </div>
        </div>

        {renderAppLibraryModal()}
        {renderPairingFailoverModal()}
        {renderVitreaDragOverlay()}
      </div>
    );
  }

  // ============================================================================
  // VIEW MODE 1: MOBILE FULLSCREEN COMPANION (100dvh Direct Edge-to-Edge)
  // ============================================================================
  if (viewMode === 'mobile') {
    return (
      <div className="h-[100dvh] w-screen overflow-hidden relative">
        {renderMobileScreenContent()}
        {renderAppLibraryModal()}
        {renderPairingFailoverModal()}
        {renderVitreaDragOverlay()}
      </div>
    );
  }

  // ============================================================================
  // VIEW MODE 2: DESKTOP / PC EXECUTIVE COCKPIT (NATIVE CORPORATE .EXE EXPERIENCE)
  // ============================================================================
  return (
    <div className="h-screen w-screen flex flex-col bg-[#06141B] text-ops-text select-none overflow-hidden">
      {/* Native Corporate .EXE Frameless Window Titlebar */}
      <div className="h-7 px-4 bg-[#06141B] border-b border-[#253745] flex items-center justify-between text-[10px] font-mono text-[#9BA8AB] shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#CCD0CF] shadow-[0_0_6px_#CCD0CF]" />
          <span className="font-bold text-[#CCD0CF]">OpsDeck.exe</span>
          <span>— Corporate Host Agent v2.5 (Win32 Daemon {hostAgentOnline ? ':8620 ONLINE' : 'STANDBY'})</span>
          <span className="hidden md:inline text-[#4A5C6A]">|</span>
          <span className="hidden md:inline text-[#CCD0CF]">
            Ventana Activa Detectada: {currentHost.activeWindow}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPairingModal(true)}
            className="hover:text-[#CCD0CF] flex items-center gap-1 transition"
          >
            <Usb className="w-3 h-3" />
            <span>
              Triple-Failover: {currentHost.route} ({currentHost.latencyMs}ms) · IP {liveConnectionInfo.primaryLanIp}
            </span>
          </button>
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#253745]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#253745] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#4A5C6A] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#9BA8AB] inline-block" />
          </div>
        </div>
      </div>

      <header className="h-15 py-2 px-4 lg:px-6 border-b border-[#4A5C6A]/40 flex items-center justify-between gap-3 bg-[#11212D]/90 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl neuglass-pedestal bg-gradient-to-br from-[#253745] to-[#11212D] border border-[#9BA8AB]/45 flex items-center justify-center text-[#CCD0CF] shadow-md">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold tracking-tight text-[#CCD0CF]">OpsDeck</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#253745] text-[#CCD0CF]">
              .EXE
            </span>
          </div>

          <div className="h-5 w-px bg-[#4A5C6A]/50 mx-1 hidden md:block" />

          <div className="hidden md:flex items-center gap-2 bg-[#11212D] border border-[#4A5C6A]/60 rounded-xl px-3 py-1.5">
            <Laptop className="w-4 h-4 text-[#CCD0CF] shrink-0" />
            <select
              aria-label="Seleccionar PC conectado"
              value={selectedHostId}
              onChange={(e) => {
                setSelectedHostId(e.target.value);
                const target = hosts.find((h) => h.id === e.target.value);
                if (target) {
                  triggerToast(`Conectado a ${target.name}`, `${routeBadgeLabel(target.route)} · ${target.latencyMs} ms`);
                }
              }}
              className="bg-transparent text-xs font-semibold text-[#CCD0CF] focus:outline-none cursor-pointer"
            >
              {hosts.map((h) => (
                <option key={h.id} value={h.id} className="bg-[#11212D] text-[#CCD0CF]">
                  {h.name} ({h.os})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center neu-well rounded-xl p-0.5 gap-0.5 border border-[#4A5C6A]/50">
            <button
              type="button"
              onClick={() => handleSelectLang('es')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                lang === 'es'
                  ? 'neuglass-btn-primary'
                  : 'text-[#9BA8AB] hover:text-[#CCD0CF]'
              }`}
              title="Idioma Español"
            >
              🇪🇸 ES
            </button>
            <button
              type="button"
              onClick={() => handleSelectLang('en')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                lang === 'en'
                  ? 'neuglass-btn-primary'
                  : 'text-[#9BA8AB] hover:text-[#CCD0CF]'
              }`}
              title="English Language"
            >
              🇺🇸 EN
            </button>
          </div>

          <button
            onClick={() => setShowPairingModal(true)}
            className="neuglass-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[#CCD0CF] text-xs font-semibold border border-[#CCD0CF]/35"
            title={
              lang === 'es'
                ? 'Abrir Centro de Enlace e Instrucciones (USB 0ms + QR LAN + Túnel 443)'
                : 'Open Connection & Instructions Center (USB 0ms + LAN QR + 443 Tunnel)'
            }
          >
            <QrCode className="w-4 h-4 text-[#CCD0CF]" />
            <span className="hidden sm:inline">
              {lang === 'es'
                ? `Instrucciones / Enlace (${currentHost.latencyMs}ms)`
                : `Instructions / Link (${currentHost.latencyMs}ms)`}
            </span>
          </button>

          <button
            onClick={() => setViewMode('apk-sim')}
            className="neuglass-btn-primary flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            title="Ver Simulador APK Android en Vivo"
          >
            <Smartphone className="w-4 h-4" />
            <span>Simulador APK</span>
          </button>

          <button
            onClick={() => setViewMode('mobile')}
            className="neuglass-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[#CCD0CF] text-xs font-semibold"
            title="Ver interfaz móvil a pantalla completa 100dvh"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#9BA8AB]" />
            <span className="hidden sm:inline">Móvil 100%</span>
          </button>

          <div className="hidden xl:flex items-center neu-well rounded-xl p-1 gap-1">
            {(['USB_ADB', 'LAN_TLS', 'P2P_WEBRTC', 'CLOUD_RELAY'] as ConnectionRoute[]).map((r) => (
              <button
                key={r}
                onClick={() => handleCycleRoute(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  currentHost.route === r
                    ? 'neuglass-btn-primary font-semibold'
                    : 'text-[#9BA8AB] hover:text-[#CCD0CF]'
                }`}
              >
                {r === 'USB_ADB' ? 'USB 0ms' : r === 'LAN_TLS' ? 'LAN' : r === 'P2P_WEBRTC' ? 'P2P' : '443'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowNewTaskModal(true)}
            className="neuglass-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[#CCD0CF] text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Tarea</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <aside className="w-20 lg:w-60 bg-[#11212D]/90 border-r border-[#4A5C6A]/35 flex flex-col justify-between p-3 shrink-0">
          <nav className="space-y-1.5" aria-label="Navegación principal OpsDeck">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ops-muted hidden lg:block">
              Centro de Mando .EXE
            </div>

            <button
              onClick={() => {
                setActiveTab('dashboard');
                setChartAnimKey((k) => k + 1);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-ops-accent text-ops-accentDark shadow-sm'
                  : 'text-ops-muted hover:bg-ops-surface hover:text-ops-text'
              }`}
            >
              <BarChart3 className="w-5 h-5 shrink-0" />
              <span className="hidden lg:inline">Dashboard & Métricas</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('tasks');
                setChartAnimKey((k) => k + 1);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'tasks'
                  ? 'bg-ops-accent text-ops-accentDark shadow-sm'
                  : 'text-ops-muted hover:bg-ops-surface hover:text-ops-text'
              }`}
            >
              <span className="flex items-center gap-3">
                <CheckSquare className="w-5 h-5 shrink-0" />
                <span className="hidden lg:inline">Tablero & Urgencias</span>
              </span>
              {urgentTasks.length > 0 && (
                <span
                  className={`hidden lg:inline-flex px-1.5 py-0.5 text-[10px] font-mono tabular-nums rounded-md ${
                    activeTab === 'tasks'
                      ? 'bg-ops-accentDark text-ops-accent'
                      : 'bg-[#ED9695]/20 text-ops-danger'
                  }`}
                >
                  {urgentTasks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('triage')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'triage'
                  ? 'bg-ops-accent text-ops-accentDark shadow-sm'
                  : 'text-ops-muted hover:bg-ops-surface hover:text-ops-text'
              }`}
            >
              <span className="flex items-center gap-3">
                <Bot className="w-5 h-5 shrink-0" />
                <span className="hidden lg:inline">Agente IA: Correo & TI</span>
              </span>
              {pendingTriageCount > 0 && (
                <span
                  className={`hidden lg:inline-flex px-1.5 py-0.5 text-[10px] font-mono tabular-nums rounded-md ${
                    activeTab === 'triage'
                      ? 'bg-ops-accentDark text-ops-accent'
                      : 'bg-[#CCD0CF]/20 text-[#CCD0CF]'
                  }`}
                >
                  {pendingTriageCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('dock')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'dock'
                  ? 'bg-ops-accent text-ops-accentDark shadow-sm'
                  : 'text-ops-muted hover:bg-ops-surface hover:text-ops-text'
              }`}
            >
              <span className="flex items-center gap-3">
                <LayoutGrid className="w-5 h-5 shrink-0" />
                <span className="hidden lg:inline">Botonera Dinámica PC</span>
              </span>
              <span className="hidden lg:inline-flex text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10">
                {displayedTiles.length}
              </span>
            </button>

            <div className="pt-3 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ops-muted hidden lg:block">
              Colaboración & Flujos
            </div>

            <button
              onClick={() => setActiveTab('meetings')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'meetings'
                  ? 'bg-ops-accent text-ops-accentDark shadow-sm'
                  : 'text-ops-muted hover:bg-ops-surface hover:text-ops-text'
              }`}
            >
              <span className="flex items-center gap-3">
                <Video className="w-5 h-5 shrink-0" />
                <span className="hidden lg:inline">Reuniones & Salas</span>
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#ED9695]/20 text-ops-danger">
                LIVE
              </span>
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'messages'
                  ? 'bg-ops-accent text-ops-accentDark shadow-sm'
                  : 'text-ops-muted hover:bg-ops-surface hover:text-ops-text'
              }`}
            >
              <span className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 shrink-0" />
                <span className="hidden lg:inline">Mensajería E2EE</span>
              </span>
              <span className="hidden lg:inline-flex text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-ops-surface2 text-ops-accent">
                4
              </span>
            </button>

            <button
              onClick={() => setActiveTab('automation')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'automation'
                  ? 'bg-ops-accent text-ops-accentDark shadow-sm'
                  : 'text-ops-muted hover:bg-ops-surface hover:text-ops-text'
              }`}
            >
              <Zap className="w-5 h-5 shrink-0" />
              <span className="hidden lg:inline">Automatización</span>
            </button>
          </nav>

          <div className="hidden lg:block bg-ops-surface border border-ops-line rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ops-muted">
                Telemetría PC Activo
              </span>
              <ShieldCheck className="w-4 h-4 text-ops-accent" />
            </div>
            <div className="text-xs font-semibold truncate text-ops-text">{currentHost.name}</div>
            <div className="text-[11px] text-ops-muted truncate">{currentHost.activeWindow}</div>
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px] font-mono tabular-nums">
              <div className="bg-ops-surface2 rounded-lg p-1.5 text-center">
                <div className="text-[9px] text-ops-muted">CPU</div>
                <div className="text-ops-text font-semibold">{currentHost.cpuPercent}%</div>
              </div>
              <div className="bg-ops-surface2 rounded-lg p-1.5 text-center">
                <div className="text-[9px] text-ops-muted">RAM</div>
                <div className="text-ops-text font-semibold">{currentHost.ramPercent}%</div>
              </div>
              <div className="bg-ops-surface2 rounded-lg p-1.5 text-center">
                <div className="text-[9px] text-ops-muted">BAT</div>
                <div className="text-ops-accent font-semibold">{currentHost.batteryPercent}%</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* ==================== 1. DASHBOARD EJECUTIVO & MÉTRICAS ==================== */}
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-vitrea-page">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ops-muted">
                    PULSO DE OPERACIONES · TIEMPO REAL
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight text-ops-text mt-0.5">
                    Dashboard de Progreso & Urgencias
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChartAnimKey((k) => k + 1)}
                    className="neuglass-btn px-3.5 py-2 rounded-xl text-xs font-semibold text-ops-text flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-ops-accent" />
                    Animar Gráficos
                  </button>
                  <button
                    onClick={() => setShowAppLibraryModal(true)}
                    className="neuglass-btn px-3.5 py-2 rounded-xl text-xs font-semibold text-ops-text flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-ops-accent" />
                    Añadir Apps PC
                  </button>
                </div>
              </div>

              {/* 4 KPI Strip Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="neuglass-panel neuglass-panel-hover rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ops-muted">
                      Urgentes para Hoy
                    </span>
                    <span className="p-2 rounded-xl neu-well text-ops-danger">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-mono font-bold tabular-nums text-ops-danger">
                      {urgentTasks.length}
                    </span>
                    <span className="text-xs text-ops-muted">Vencen antes de 18:00</span>
                  </div>
                </div>

                <div className="neuglass-panel neuglass-panel-hover rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ops-muted">
                      Cumplimiento Semanal
                    </span>
                    <span className="p-2 rounded-xl neu-well text-ops-accent">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-mono font-bold tabular-nums text-ops-accent">
                      {completionRate}%
                    </span>
                    <span className="text-xs text-ops-live font-mono">+12% vs. sem. ant.</span>
                  </div>
                </div>

                <div className="neuglass-panel neuglass-panel-hover rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ops-muted">
                      Tiempo de Foco vs. Reunión
                    </span>
                    <span className="p-2 rounded-xl neu-well text-ops-accent">
                      <Clock className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-mono font-bold tabular-nums text-ops-text">
                      28.0h <span className="text-sm text-ops-muted font-normal">/ 10.9h</span>
                    </span>
                    <span className="text-xs text-ops-accent">72% Foco efectivo</span>
                  </div>
                </div>

                <div className="neuglass-panel neuglass-panel-hover rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ops-muted">
                      Estación PC Conectada
                    </span>
                    <span className="p-2 rounded-xl neu-well text-ops-live">
                      <Wifi className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-xl font-mono font-bold tabular-nums text-ops-text truncate">
                      {currentHost.latencyMs} ms
                    </span>
                    <span className="text-xs text-ops-live">{routeBadgeLabel(currentHost.route)}</span>
                  </div>
                </div>
              </div>

              {/* Priority Radar + Interactive Vitrea Analytics Card */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-7 neuglass-panel rounded-3xl p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-ops-danger">
                        ATENCIÓN INMEDIATA · MATRIZ DE PRIORIDAD
                      </span>
                      <h2 className="text-lg font-bold text-ops-text">
                        Tareas más urgentes y pendientes críticos
                      </h2>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('tasks');
                        setChartAnimKey((k) => k + 1);
                      }}
                      className="text-xs text-ops-accent hover:underline flex items-center gap-1"
                    >
                      Abrir Tablero Drag & Drop ({tasks.length}) <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {tasks
                      .filter((t) => t.status !== 'completed')
                      .slice(0, 4)
                      .map((task, idx) => {
                        const progressPct = Math.min(
                          100,
                          Math.round((task.loggedMinutes / Math.max(1, task.estimatedMinutes)) * 100)
                        );
                        return (
                          <div
                            key={task.id}
                            className="p-3.5 rounded-2xl neu-well hover:border-ops-accent/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                    task.status === 'urgent'
                                      ? 'bg-[#ED9695]/20 text-ops-danger border border-[#ED9695]/40'
                                      : task.status === 'blocked'
                                      ? 'bg-[#F3C98B]/20 text-ops-warn border border-[#F3C98B]/40'
                                      : 'bg-ops-accent/15 text-ops-accent'
                                  }`}
                                >
                                  {task.status === 'urgent'
                                    ? 'URGENTE'
                                    : task.status === 'blocked'
                                    ? 'BLOQUEADA'
                                    : 'EN PROGRESO'}
                                </span>
                                <span className="text-xs font-mono text-ops-muted">{task.code}</span>
                                <span className="text-xs text-ops-muted">· {task.project}</span>
                                <span className="text-xs font-mono text-ops-warn ml-auto sm:ml-0">
                                  ⏰ {task.dueTime}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-ops-text">{task.title}</p>

                              <div className="flex items-center gap-2 pt-1">
                                <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden">
                                  <div
                                    key={`pc-meter-${task.id}-${chartAnimKey}`}
                                    style={{
                                      width: `${progressPct}%`,
                                      animationDelay: `${idx * 85 + 150}ms`,
                                    }}
                                    className={`h-full rounded-full animate-vitrea-meter ${
                                      task.status === 'urgent' ? 'bg-ops-danger' : 'bg-ops-accent'
                                    }`}
                                  />
                                </div>
                                <span className="text-[11px] font-mono tabular-nums text-ops-muted">
                                  {task.loggedMinutes}/{task.estimatedMinutes}m ({progressPct}%)
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {task.pcTrigger && (
                                <button
                                  onClick={() => handleLaunchTaskOnPC(task)}
                                  className="neuglass-btn px-3 py-2 rounded-xl hover:text-ops-accent text-ops-accent text-xs font-semibold flex items-center gap-1.5"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Abrir en PC</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => handleCompleteTask(task.id, e.clientX, e.clientY)}
                                className="neuglass-btn p-2 rounded-xl text-ops-muted hover:text-ops-accent"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Right 5 Cols: Interactive Vitrea Spline Curve + Staggered Animated Bars */}
                <div
                  className={`${
                    isChartFocused
                      ? 'fixed inset-8 z-50 max-w-4xl mx-auto my-auto h-fit windock-glass'
                      : 'xl:col-span-5 neuglass-panel'
                  } rounded-3xl p-5 flex flex-col justify-between space-y-4 transition-all duration-300`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-ops-muted">
                        ANALÍTICA INTERACTIVA VITREA
                      </span>
                      <h2 className="text-lg font-bold text-ops-text">
                        Curva de Velocidad & Cumplimiento
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full neu-well text-[11px] font-mono text-[#CCD0CF]">
                        +18.4%
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsChartFocused(!isChartFocused)}
                        title={isChartFocused ? 'Contraer tarjeta' : 'Expandir tarjeta'}
                        className="w-8 h-8 rounded-xl neuglass-btn grid place-items-center text-[#CCD0CF]"
                      >
                        {isChartFocused ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="neu-well rounded-2xl p-4 space-y-2">
                    {renderInteractiveSplineChart(isChartFocused ? 'h-56' : 'h-28', 'pc-main')}
                  </div>

                  <div className="neu-well rounded-2xl p-3.5">
                    {renderAnimatedVerticalBars('h-24')}
                  </div>
                </div>
              </div>

              {/* Pure Icon-Only Stream-Deck Strip on Desktop with Dynamic Context + Direct Vitrea Drag-and-Drop */}
              <div className="neuglass-panel rounded-3xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl neuglass-pedestal grid place-items-center text-[#CCD0CF]">
                      <LayoutGrid className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ops-text">
                        Botonera Táctil Dinámica ({activeContextProfile.label})
                      </h3>
                      <p className="text-[10px] font-mono text-[#9BA8AB]">
                        Muta automáticamente según la ventana activa del PC o arrastra fichas para reordenar
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingDock(!isEditingDock)}
                      title={isEditingDock ? 'Guardar orden' : 'Editar o quitar'}
                      className={`w-9 h-9 rounded-xl grid place-items-center ${
                        isEditingDock ? 'neuglass-btn-primary' : 'neuglass-btn text-ops-text'
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowAppLibraryModal(true)}
                      title="Agregar App del PC"
                      className="neuglass-btn-primary w-9 h-9 rounded-xl grid place-items-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {renderDynamicContextStrip(false)}

                <div
                  key={`pc-dash-dock-${activeContextId}`}
                  className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-3.5 animate-vitrea-page"
                >
                  {displayedTiles.map((tile, idx) => {
                    const isBeingDragged = dragTile?.tile.id === tile.id;
                    const isSettling = recentlySettledTileId === tile.id;

                    if (isBeingDragged) {
                      return (
                        <div
                          key={tile.id}
                          data-tile-index={idx}
                          className="vitrea-ph aspect-square rounded-2xl"
                        />
                      );
                    }

                    return (
                      <div
                        key={tile.id}
                        data-tile-index={idx}
                        onPointerDown={(e) => startTilePointerDown(e, tile, idx)}
                        onClick={() => handleTilePress(tile)}
                        title={`${tile.label} — Arrastra para mover`}
                        className={`neuglass-tile group aspect-square flex flex-col items-center justify-center p-3 rounded-2xl cursor-grab active:cursor-grabbing relative ${
                          isEditingDock ? 'tile-editing' : ''
                        } ${isSettling ? 'animate-vitrea-settle' : ''}`}
                      >
                        {isEditingDock && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTile(tile.id);
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-ops-danger text-[#06141B] font-bold text-xs grid place-items-center shadow z-20"
                          >
                            −
                          </button>
                        )}
                        {renderTileVisual(tile, 'lg')}
                        {tile.running && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#CCD0CF] shadow-[0_0_8px_#CCD0CF] absolute bottom-2" />
                        )}
                        <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -bottom-6 px-2 py-0.5 rounded-md bg-[#06141B]/95 border border-[#4A5C6A]/50 text-[9px] font-medium text-[#CCD0CF] whitespace-nowrap z-30 shadow-lg">
                          {tile.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2. GESTIÓN DE TAREAS & TABLERO KANBAN VITREA (#/RELEASES) ==================== */}
          {activeTab === 'tasks' && (
            <div className="max-w-7xl mx-auto space-y-5 animate-vitrea-page">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ops-muted">
                    PRIORIZACIÓN EJECUTIVA · INSPIRADO EN VITREA RELEASES BOARD
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight text-ops-text">
                    Tablero de Tareas, Urgencias & Entregables
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {pendingTriageCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => handleAutoTriageBatch(e)}
                      className="neuglass-btn-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <Bot className="w-4 h-4" />
                      <span>Inyectar {pendingTriageCount} Tickets/Correos IA al Kanban</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('triage')}
                    className="neuglass-btn px-3.5 py-2 rounded-xl text-xs font-semibold text-[#CCD0CF] flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Ver Bandeja Agente IA</span>
                  </button>
                  <div className="flex p-1 rounded-xl neu-well gap-1">
                    <button
                      type="button"
                      onClick={() => setTaskViewStyle('board')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        taskViewStyle === 'board'
                          ? 'neuglass-btn-primary'
                          : 'text-[#9BA8AB] hover:text-[#CCD0CF]'
                      }`}
                    >
                      Tablero Drag & Drop
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskViewStyle('list')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        taskViewStyle === 'list'
                          ? 'neuglass-btn-primary'
                          : 'text-[#9BA8AB] hover:text-[#CCD0CF]'
                      }`}
                    >
                      Vista Lista
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 neu-well rounded-xl px-3.5 py-2.5">
                <Search className="w-4 h-4 text-ops-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar fichas por código (OPS-401, INC-8841), proyecto o palabra clave..."
                  className="w-full bg-transparent text-sm text-ops-text placeholder:text-ops-muted focus:outline-none"
                />
              </div>

              {taskViewStyle === 'board' ? (
                renderVitreaReleasesBoard(false)
              ) : (
                <div className="space-y-3">
                  {tasks
                    .filter((t) => (taskFilter === 'all' ? true : t.status === taskFilter))
                    .filter(
                      (t) =>
                        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.project.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((task) => {
                      const pct = Math.min(
                        100,
                        Math.round((task.loggedMinutes / Math.max(1, task.estimatedMinutes)) * 100)
                      );
                      return (
                        <div
                          key={task.id}
                          className="neuglass-panel rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-ops-accent">
                                {task.code}
                              </span>
                              <span className="text-xs text-ops-muted">· {task.project}</span>
                              <span className="text-xs font-mono text-ops-warn">⏰ {task.dueTime}</span>
                            </div>
                            <h3 className="text-base font-semibold text-ops-text">{task.title}</h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                            {task.pcTrigger && (
                              <button
                                onClick={() => handleLaunchTaskOnPC(task)}
                                className="neuglass-btn-primary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Ejecutar en PC ({pct}%)
                              </button>
                            )}
                            <button
                              onClick={(e) => handleCompleteTask(task.id, e.clientX, e.clientY)}
                              className="neuglass-btn px-3 py-2 rounded-xl text-xs font-semibold text-ops-text"
                            >
                              {task.status === 'completed' ? 'Reabrir' : 'Completar'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ==================== 2B. AGENTE IA DE TRIAJE: CORREO CORPORATIVO & TICKETS TI -> KANBAN ==================== */}
          {activeTab === 'triage' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-vitrea-page">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ops-accent">
                    MOTOR DE INGESTA INTELIGENTE · OUTLOOK 365 + SERVICENOW + JIRA ITSM + GLPI + ZENDESK
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight text-ops-text mt-0.5">
                    Agente IA de Triaje: Correo Corporativo & Tickets TI → Tablero Kanban
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={(e) => handleAutoTriageBatch(e)}
                    className="neuglass-btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Auto-Triaje IA de Toda la Bandeja ({pendingTriageCount} pendientes)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tasks')}
                    className="neuglass-btn px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#CCD0CF] flex items-center gap-1.5"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>Ir al Tablero Kanban ({tasks.length})</span>
                  </button>
                </div>
              </div>

              {/* Connected Corporate Connectors Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { name: 'Microsoft Outlook 365', proto: 'Graph API / COM Local', status: 'Sincronizado' },
                  { name: 'ServiceNow ITSM', proto: 'Webhook REST P1/P2', status: 'Cola Activa' },
                  { name: 'Jira Service Desk', proto: 'JQL Live Stream', status: 'Conectado' },
                  { name: 'GLPI / Freshservice', proto: 'API Token TLS', status: 'Conectado' },
                  { name: 'Filtro Anti-Ruido IA', proto: 'Descarta Spam/Boletines', status: '99.2% Precisión' },
                ].map((conn) => (
                  <div key={conn.name} className="neuglass-panel rounded-2xl p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="w-2 h-2 rounded-full bg-[#CCD0CF] shadow-[0_0_8px_#CCD0CF]" />
                      <span className="text-[9px] font-mono text-[#9BA8AB] uppercase">{conn.status}</span>
                    </div>
                    <div className="text-xs font-bold text-[#CCD0CF] truncate pt-1">{conn.name}</div>
                    <div className="text-[10px] font-mono text-[#9BA8AB] truncate">{conn.proto}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Left 7 Cols: Live Incoming Feed of Emails & Support Tickets */}
                <div className="xl:col-span-7 neuglass-panel rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#9BA8AB]">
                        BANDEJA UNIFICADA DE REQUERIMIENTOS ENTRANTE
                      </span>
                      <h2 className="text-lg font-bold text-[#CCD0CF]">
                        Correos y Tickets Analizados por el Agente IA
                      </h2>
                    </div>
                    <span className="px-3 py-1 rounded-full neu-well font-mono text-xs text-[#CCD0CF]">
                      {triageFeed.length} eventos
                    </span>
                  </div>

                  <div className="space-y-3">
                    {triageFeed.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl transition space-y-2.5 ${
                          !item.isActionable
                            ? 'neu-well opacity-75 border border-dashed border-[#4A5C6A]/40'
                            : item.processedIntoKanban
                            ? 'neu-well border border-[#CCD0CF]/35'
                            : 'neuglass-panel border border-[#9BA8AB]/45'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                !item.isActionable
                                  ? 'bg-[#253745] text-[#9BA8AB]'
                                  : item.suggestedStatus === 'urgent'
                                  ? 'bg-[#ED9695]/20 text-ops-danger border border-[#ED9695]/40'
                                  : 'bg-[#253745] text-[#CCD0CF]'
                              }`}
                            >
                              {item.sourcePlatform} · {item.externalId}
                            </span>
                            <span className="text-xs font-semibold text-[#CCD0CF]">
                              {item.sender}
                            </span>
                            <span className="text-[10px] font-mono text-[#9BA8AB]">
                              ({item.senderRole})
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[#9BA8AB]">
                            {item.receivedAt}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-[#CCD0CF] leading-snug">
                          {item.subject}
                        </h3>
                        <p className="text-xs text-[#9BA8AB] leading-relaxed">{item.snippet}</p>

                        {/* AI Reasoning Box */}
                        <div className="p-2.5 rounded-xl bg-[#06141B]/75 border border-[#4A5C6A]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-start gap-2 min-w-0">
                            <Bot className="w-4 h-4 text-[#CCD0CF] shrink-0 mt-0.5" />
                            <div className="text-[11px] text-[#CCD0CF]">
                              <span className="font-mono font-bold text-[#9BA8AB]">
                                [IA {item.aiConfidence}%]
                              </span>{' '}
                              {item.aiReasoning}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) =>
                              handleConvertTriageToKanban(item, e.clientX, e.clientY)
                            }
                            disabled={item.processedIntoKanban}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                              item.processedIntoKanban
                                ? 'bg-[#253745]/60 text-[#9BA8AB] cursor-default'
                                : !item.isActionable
                                ? 'neuglass-btn text-[#9BA8AB] hover:text-ops-danger'
                                : 'neuglass-btn-primary'
                            }`}
                          >
                            {item.processedIntoKanban
                              ? `✓ En Kanban (${item.linkedTaskCode})`
                              : !item.isActionable
                              ? 'Descartar Ruido'
                              : '+ Inyectar a Kanban'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right 5 Cols: Live Email / Ticket Simulator & Custom AI Analyzer */}
                <form
                  onSubmit={handleAnalyzeCustomIntake}
                  className="xl:col-span-5 neuglass-panel rounded-3xl p-5 space-y-4"
                >
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#9BA8AB]">
                      PROBADOR EN VIVO DEL AGENTE IA (:8620/API/INTAKE/ANALYZE)
                    </span>
                    <h2 className="text-lg font-bold text-[#CCD0CF] mt-0.5">
                      Simular Llegada de Correo o Ticket TI
                    </h2>
                    <p className="text-xs text-[#9BA8AB] mt-1">
                      Pega cualquier correo corporativo o ticket de soporte. El Agente IA evaluará si
                      es ruido o un requerimiento real, calculará su prioridad/SLA y creará la ficha en
                      el Tablero Kanban con su gatillo ejecutable para tu PC.
                    </p>
                  </div>

                  {/* Quick Test Preset Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomIntakePlatform('ServiceNow');
                        setCustomIntakeSender('monitoreo.noc@empresa.cl');
                        setCustomIntakeSubject(
                          'CRÍTICO P1: Caída de enlace fibra óptica en sucursal matriz y corte VPN'
                        );
                        setCustomIntakeBody(
                          'Se detecta pérdida total de paquetes en router borde. Se requiere levantar túnel de respaldo en consola SSH de inmediato.'
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg neu-well text-[10px] font-mono text-[#CCD0CF] hover:border-[#CCD0CF]/50"
                    >
                      + Ejemplo Ticket P1 (VPN/Red)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomIntakePlatform('Outlook 365');
                        setCustomIntakeSender('cfo.finanzas@empresa.cl');
                        setCustomIntakeSubject(
                          'Urgente: Error en cierre SAP GUI y firma pendiente de Balance Anual'
                        );
                        setCustomIntakeBody(
                          'Necesitamos aprobar la planilla consolidada en Excel y desbloquear el asiento contable en SAP antes de las 17:00.'
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg neu-well text-[10px] font-mono text-[#CCD0CF] hover:border-[#CCD0CF]/50"
                    >
                      + Ejemplo Correo VIP Finanzas/SAP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomIntakePlatform('Outlook 365');
                        setCustomIntakeSender('marketing@boletin.cl');
                        setCustomIntakeSubject(
                          'Newsletter mensual: Promoción y menú del casino corporativo'
                        );
                        setCustomIntakeBody('Notificación automática sin acción requerida.');
                      }}
                      className="px-2.5 py-1 rounded-lg neu-well text-[10px] font-mono text-[#9BA8AB] hover:border-[#CCD0CF]/50"
                    >
                      + Ejemplo Correo Ruido (Se filtra)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#9BA8AB] mb-1">
                        Origen (Conector)
                      </label>
                      <select
                        value={customIntakePlatform}
                        onChange={(e) => setCustomIntakePlatform(e.target.value as any)}
                        className="w-full bg-[#11212D] border border-[#4A5C6A]/60 rounded-xl px-3 py-2 text-xs text-[#CCD0CF]"
                      >
                        <option value="Outlook 365">Microsoft Outlook 365</option>
                        <option value="ServiceNow">ServiceNow ITSM</option>
                        <option value="Jira ITSM">Jira Service Management</option>
                        <option value="GLPI">GLPI Helpdesk</option>
                        <option value="Zendesk">Zendesk Enterprise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#9BA8AB] mb-1">
                        Remitente / Solicitante
                      </label>
                      <input
                        type="text"
                        value={customIntakeSender}
                        onChange={(e) => setCustomIntakeSender(e.target.value)}
                        className="w-full bg-[#11212D] border border-[#4A5C6A]/60 rounded-xl px-3 py-2 text-xs text-[#CCD0CF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#9BA8AB] mb-1">
                      Asunto del Correo o Título del Ticket TI
                    </label>
                    <input
                      type="text"
                      required
                      value={customIntakeSubject}
                      onChange={(e) => setCustomIntakeSubject(e.target.value)}
                      placeholder="Ej: Urgente P1 — Desbloqueo de credenciales SAP y VPN..."
                      className="w-full bg-[#11212D] border border-[#4A5C6A]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#CCD0CF]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#9BA8AB] mb-1">
                      Cuerpo del Mensaje / Descripción Técnica
                    </label>
                    <textarea
                      rows={4}
                      value={customIntakeBody}
                      onChange={(e) => setCustomIntakeBody(e.target.value)}
                      placeholder="Escribe o pega el contenido del correo o ticket para que el Agente IA lo analice..."
                      className="w-full bg-[#11212D] border border-[#4A5C6A]/60 rounded-xl p-3 text-xs text-[#CCD0CF]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isAnalyzingIntake}
                    className="w-full py-3 rounded-xl neuglass-btn-primary text-xs font-bold flex items-center justify-center gap-2 shadow-xl"
                  >
                    <Bot className="w-4 h-4" />
                    <span>
                      {isAnalyzingIntake
                        ? 'Analizando con Agente IA...'
                        : 'Analizar con Agente IA e Inyectar al Tablero Kanban'}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ==================== 3. BOTONERA OPSDECK & CONFIGURADOR DE APPS PC ==================== */}
          {activeTab === 'dock' && (
            <div className="max-w-6xl mx-auto space-y-5 animate-vitrea-page">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ops-accent">
                    BOTONERA CONTEXTUAL INTELIGENTE · {currentHost.name}
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight text-ops-text">
                    Botonera Dinámica ({activeContextProfile.label})
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowAppLibraryModal(true)}
                    className="neuglass-btn-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir App de mi PC
                  </button>
                  <button
                    onClick={() => setIsEditingDock(!isEditingDock)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                      isEditingDock
                        ? 'bg-ops-danger text-ops-dangerDark border-ops-danger'
                        : 'neuglass-btn text-ops-text'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isEditingDock ? 'Terminar Edición' : 'Modo Reordenar / Quitar'}
                  </button>
                </div>
              </div>

              {renderDynamicContextStrip(false)}

              <div className="flex items-center gap-1.5 neu-well p-1.5 rounded-xl w-fit">
                {(
                  [
                    ['grid', 'Botonera con Logos', LayoutGrid],
                    ['touchpad', 'Touchpad & Teclado', MousePointer],
                    ['clipboard', 'Portapapeles PC', Clipboard],
                    ['signature', 'Firma Digital', PenTool],
                  ] as const
                ).map(([mode, label, Icon]) => (
                  <button
                    key={mode}
                    onClick={() => setDockSubMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                      dockSubMode === mode
                        ? 'neuglass-btn-primary'
                        : 'text-ops-muted hover:text-ops-text'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {dockSubMode === 'grid' && (
                <div key={`dock-tab-${activeContextId}`} className="space-y-6 animate-vitrea-page">
                  <div className="neuglass-panel rounded-3xl p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {displayedTiles.map((tile, index) => {
                        const isBeingDragged = dragTile?.tile.id === tile.id;
                        const isSettling = recentlySettledTileId === tile.id;

                        if (isBeingDragged) {
                          return (
                            <div
                              key={tile.id}
                              data-tile-index={index}
                              className="vitrea-ph rounded-2xl min-h-[144px]"
                            />
                          );
                        }

                        return (
                          <div
                            key={tile.id}
                            data-tile-index={index}
                            onPointerDown={(e) => startTilePointerDown(e, tile, index)}
                            onClick={() => handleTilePress(tile)}
                            className={`neuglass-tile group flex flex-col items-center justify-center gap-3 p-5 rounded-2xl cursor-grab active:cursor-grabbing min-h-[144px] ${
                              isEditingDock ? 'tile-editing' : ''
                            } ${isSettling ? 'animate-vitrea-settle' : ''}`}
                          >
                            {isEditingDock && (
                              <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveTile(tile.id);
                                  }}
                                  className="w-6 h-6 rounded-full bg-ops-danger text-ops-dangerDark font-bold text-xs"
                                >
                                  −
                                </button>
                              </div>
                            )}

                            {renderTileVisual(tile, 'lg')}

                            <div className="text-center max-w-full">
                              <div className="text-xs font-semibold text-ops-text truncate">
                                {tile.label}
                              </div>
                              {tile.shortcut && (
                                <div className="text-[10px] font-mono text-ops-muted mt-0.5">
                                  {tile.shortcut}
                                </div>
                              )}
                            </div>
                            {tile.running && (
                              <span className="w-2 h-2 rounded-full bg-ops-live shadow-[0_0_8px_#a3e6be] absolute bottom-2.5" />
                            )}
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setShowAppLibraryModal(true)}
                        className="neuglass-tile flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl border-dashed text-ops-muted hover:text-ops-accent min-h-[144px]"
                      >
                        <div className="w-14 h-14 rounded-[23%] neu-well grid place-items-center">
                          <Plus className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-semibold">Añadir App del PC</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {dockSubMode === 'touchpad' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-8 bg-ops-surface border border-ops-line rounded-3xl p-4 flex flex-col justify-between space-y-3">
                    <div
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setCursorPos({
                          x: Math.round(((e.clientX - rect.left) / rect.width) * 100),
                          y: Math.round(((e.clientY - rect.top) / rect.height) * 100),
                        });
                      }}
                      onClick={() => triggerToast('Clic Izquierdo enviado', currentHost.name)}
                      className="relative h-72 rounded-2xl bg-[#06141B] border border-ops-line cursor-crosshair overflow-hidden grid place-items-center"
                      style={{
                        backgroundImage: 'radial-gradient(#4A5C6A 1px, transparent 1px)',
                        backgroundSize: '22px 22px',
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full bg-ops-accent/30 border-2 border-ops-accent pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
                      />
                      <span className="text-xs text-ops-muted pointer-events-none">
                        Desliza aquí para mover el cursor de {currentHost.name}
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-ops-surface border border-ops-line rounded-3xl p-5 flex flex-col justify-between space-y-4">
                    <h3 className="text-base font-bold">Teclado Remoto</h3>
                    <textarea
                      rows={5}
                      value={remoteInputText}
                      onChange={(e) => setRemoteInputText(e.target.value)}
                      placeholder="Escribe hacia el PC..."
                      className="w-full rounded-xl bg-[#06141B] border border-ops-line p-3 text-sm text-ops-text"
                    />
                    <button
                      onClick={() => {
                        if (!remoteInputText.trim()) return;
                        triggerToast('Texto escrito en el PC', remoteInputText);
                        setRemoteInputText('');
                      }}
                      className="w-full py-2.5 rounded-xl bg-ops-accent text-ops-accentDark text-xs font-semibold"
                    >
                      Enviar Texto al PC
                    </button>
                  </div>
                </div>
              )}

              {dockSubMode === 'clipboard' && (
                <div className="bg-ops-surface border border-ops-line rounded-2xl p-5 space-y-3">
                  {clipboardItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#11212D] border border-ops-line flex items-center justify-between gap-3"
                    >
                      <code className="text-xs font-mono text-ops-text break-all">{item}</code>
                      <button
                        onClick={() => triggerToast('Pegado en el PC', item)}
                        className="px-3 py-1.5 rounded-lg bg-ops-accent text-ops-accentDark text-xs font-semibold shrink-0"
                      >
                        Pegar en PC
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {dockSubMode === 'signature' && (
                <div className="bg-ops-surface border border-ops-line rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold">
                      Dibuja tu firma para insertarla como PNG transparente en el PC
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={clearSignature}
                        className="px-3 py-1.5 rounded-xl bg-ops-surface2 text-xs font-semibold"
                      >
                        Limpiar
                      </button>
                      <button
                        onClick={(e) => {
                          handleCompleteTask('tsk-101', e.clientX, e.clientY);
                          triggerToast('Firma insertada en el PC', 'Balance_Q4_Firma.xlsx firmado');
                        }}
                        className="px-4 py-1.5 rounded-xl bg-ops-accent text-ops-accentDark text-xs font-semibold"
                      >
                        Firmar e Insertar en PC
                      </button>
                    </div>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={760}
                    height={220}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    className="w-full h-52 rounded-2xl bg-[#06141B] border border-dashed border-ops-line cursor-crosshair"
                  />
                </div>
              )}
            </div>
          )}

          {/* ==================== 4. REUNIONES ==================== */}
          {activeTab === 'meetings' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-vitrea-page">
              <div className="neuglass-panel rounded-3xl p-5 space-y-5 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-[#ED9695]/20 text-ops-danger font-mono text-[10px] font-bold">
                      ● EN VIVO · 00:42:18
                    </span>
                    <h2 className="text-xl font-bold text-ops-text mt-1">{meetings[0].title}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setMicMuted(!micMuted)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                        micMuted ? 'bg-ops-danger text-ops-dangerDark' : 'bg-ops-surface2 text-ops-text'
                      }`}
                    >
                      {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-ops-accent" />}
                      {micMuted ? 'Mic Silenciado' : 'Mic Activo'}
                    </button>
                    <button
                      onClick={() => setCamActive(!camActive)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                        !camActive ? 'bg-ops-danger text-ops-dangerDark' : 'bg-ops-surface2 text-ops-text'
                      }`}
                    >
                      {camActive ? <Video className="w-4 h-4 text-ops-accent" /> : <VideoOff className="w-4 h-4" />}
                      {camActive ? 'Cámara ON' : 'Cámara OFF'}
                    </button>
                    <button
                      onClick={() => setScreenSharing(!screenSharing)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                        screenSharing ? 'bg-ops-accent text-ops-accentDark' : 'bg-ops-surface2 text-ops-text'
                      }`}
                    >
                      <MonitorUp className="w-4 h-4" />
                      {screenSharing ? 'Compartiendo PC' : 'Compartir PC'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 5. MENSAJERÍA ==================== */}
          {activeTab === 'messages' && (
            <div className="max-w-6xl mx-auto h-[calc(100vh-8.5rem)] bg-ops-surface border border-ops-line rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-12 animate-vitrea-page">
              <div className="md:col-span-4 border-r border-ops-line p-4 space-y-2 bg-[#11212D]">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannelId(ch.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      selectedChannelId === ch.id
                        ? 'bg-ops-accent text-ops-accentDark'
                        : 'text-ops-muted hover:bg-ops-surface2'
                    }`}
                  >
                    <span>{ch.kind === 'channel' ? `# ${ch.name}` : ch.name}</span>
                  </button>
                ))}
              </div>
              <div className="md:col-span-8 flex flex-col justify-between p-4">
                <div className="flex-1 overflow-y-auto space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-2xl max-w-xl ${
                        m.isOwn ? 'ml-auto bg-ops-accent/15' : 'bg-ops-surface border border-ops-line'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-ops-accent">{m.sender}</div>
                      <p className="text-xs text-ops-text mt-1">{m.text}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="pt-2 flex gap-2">
                  <input
                    type="text"
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-ops-surface border border-ops-line rounded-xl px-3.5 py-2.5 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-ops-accent text-ops-accentDark text-xs font-semibold"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ==================== 6. AUTOMATIZACIÓN ==================== */}
          {activeTab === 'automation' && (
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 animate-vitrea-page">
              {macros.map((mac) => (
                <div
                  key={mac.id}
                  className="neuglass-panel rounded-2xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ops-surface2 text-ops-accent">
                      {mac.trigger}
                    </span>
                    <h3 className="text-base font-bold mt-2">{mac.name}</h3>
                    <ol className="space-y-1 pt-2 text-xs text-ops-muted list-decimal list-inside">
                      {mac.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </div>
                  <button
                    onClick={(e) => {
                      spawnVitreaSparkles(e.clientX, e.clientY);
                      triggerToast(`Macro "${mac.name}" ejecutada`, currentHost.name);
                    }}
                    className="neuglass-btn-primary w-full py-2 rounded-xl text-xs font-semibold"
                  >
                    Ejecutar Macro
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {renderAppLibraryModal()}
      {renderPairingFailoverModal()}

      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-[#06141B]/75 backdrop-blur-sm grid place-items-center p-4">
          <form
            onSubmit={handleAddNewTask}
            className="w-full max-w-md windock-glass rounded-3xl p-6 space-y-4"
          >
            <h3 className="text-lg font-bold">Crear Tarea Urgente</h3>
            <input
              type="text"
              autoFocus
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Ej: Aprobar orden de compra..."
              className="w-full bg-ops-surface border border-ops-line rounded-xl px-3.5 py-2.5 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="neuglass-btn px-4 py-2 rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="neuglass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {renderVitreaDragOverlay()}
    </div>
  );
}
