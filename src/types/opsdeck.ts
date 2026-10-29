export type ConnectionRoute = 'USB_ADB' | 'LAN_TLS' | 'P2P_WEBRTC' | 'CLOUD_RELAY';

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';
export type TaskStatus = 'urgent' | 'in_progress' | 'blocked' | 'completed';

export type DeckContextId = 'default' | 'outlook' | 'itsm' | 'excel' | 'meeting';

export interface DeckContextProfile {
  id: DeckContextId;
  label: string;
  shortLabel: string;
  activeAppTitle: string;
  processHint: string;
  badgeText: string;
  tiles: DockTile[];
}

export interface TriageIncomingItem {
  id: string;
  sourcePlatform: 'Outlook 365' | 'ServiceNow' | 'Jira ITSM' | 'GLPI' | 'Zendesk';
  externalId: string;
  sender: string;
  senderRole: string;
  receivedAt: string;
  subject: string;
  snippet: string;
  isActionable: boolean;
  aiConfidence: number;
  aiReasoning: string;
  slaMinutes?: number;
  suggestedStatus?: TaskStatus;
  suggestedPriority?: TaskPriority;
  suggestedProject?: string;
  pcTrigger?: {
    label: string;
    appsToLaunch: string[];
    urlOrPath: string;
  };
  processedIntoKanban?: boolean;
  linkedTaskCode?: string;
}

export interface HostPC {
  id: string;
  name: string;
  os: 'Windows 11 Pro' | 'macOS Sequoia' | 'Ubuntu Linux';
  ip: string;
  tailscaleOrRelayId: string;
  route: ConnectionRoute;
  latencyMs: number;
  cpuPercent: number;
  ramPercent: number;
  batteryPercent: number;
  isCharging: boolean;
  online: boolean;
  activeWindow: string;
}

export interface OpsTask {
  id: string;
  code: string;
  title: string;
  project: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueTime: string;
  estimatedMinutes: number;
  loggedMinutes: number;
  assignee: string;
  sourceBadge?: string;
  pcTrigger?: {
    label: string;
    appsToLaunch: string[];
    urlOrPath: string;
  };
}

export interface DockTile {
  id: string;
  label: string;
  category: 'app' | 'control' | 'meeting' | 'macro';
  iconName: string;
  brandKey?: string;
  iconDataUri?: string | null;
  exePath?: string;
  shortcut?: string;
  running?: boolean;
  badge?: string;
  accentColor?: 'mint' | 'coral' | 'amber' | 'slate';
  commandVerb: string;
}

export interface MeetingItem {
  id: string;
  title: string;
  platform: 'OpsDeck LiveKit' | 'Microsoft Teams' | 'Zoom' | 'Google Meet';
  startTime: string;
  endTime: string;
  status: 'live' | 'upcoming' | 'completed';
  participants: string[];
  agenda: string[];
  aiSummary?: string;
  actionItemsCount?: number;
}

export interface ChatChannel {
  id: string;
  name: string;
  kind: 'channel' | 'direct';
  unread: number;
  encrypted: boolean;
  statusText?: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  sender: string;
  role: string;
  time: string;
  text: string;
  isOwn?: boolean;
  linkedTaskCode?: string;
  attachment?: string;
}

export interface AutomationMacro {
  id: string;
  name: string;
  trigger: string;
  requiresBiometric: boolean;
  steps: string[];
  lastRun: string;
  runsCount: number;
}
