import React from 'react';

export interface PCInstalledApp {
  id: string;
  name: string;
  category: 'Productividad' | 'Desarrollo' | 'Comunicación' | 'Diseño & Media' | 'Sistema';
  exePath: string;
  brandKey: string;
  iconDataUri?: string | null;
}

export const DEFAULT_PC_APPS_CATALOG: PCInstalledApp[] = [
  {
    id: 'app-excel',
    name: 'Microsoft Excel',
    category: 'Productividad',
    exePath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE',
    brandKey: 'excel',
  },
  {
    id: 'app-word',
    name: 'Microsoft Word',
    category: 'Productividad',
    exePath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
    brandKey: 'word',
  },
  {
    id: 'app-powerpoint',
    name: 'PowerPoint',
    category: 'Productividad',
    exePath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
    brandKey: 'powerpoint',
  },
  {
    id: 'app-outlook',
    name: 'Outlook (Corp)',
    category: 'Comunicación',
    exePath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE',
    brandKey: 'outlook',
  },
  {
    id: 'app-teams',
    name: 'Microsoft Teams',
    category: 'Comunicación',
    exePath: 'shell:AppsFolder\\MSTeams_8wekyb3d8bbwe!MSTeams',
    brandKey: 'teams',
  },
  {
    id: 'app-zoom',
    name: 'Zoom Workplace',
    category: 'Comunicación',
    exePath: 'C:\\Users\\AppData\\Roaming\\Zoom\\bin\\Zoom.exe',
    brandKey: 'zoom',
  },
  {
    id: 'app-slack',
    name: 'Slack',
    category: 'Comunicación',
    exePath: 'C:\\Users\\AppData\\Local\\slack\\slack.exe',
    brandKey: 'slack',
  },
  {
    id: 'app-chrome',
    name: 'Google Chrome',
    category: 'Productividad',
    exePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    brandKey: 'chrome',
  },
  {
    id: 'app-edge',
    name: 'Microsoft Edge',
    category: 'Productividad',
    exePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    brandKey: 'edge',
  },
  {
    id: 'app-vscode',
    name: 'Visual Studio Code',
    category: 'Desarrollo',
    exePath: 'C:\\Users\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',
    brandKey: 'vscode',
  },
  {
    id: 'app-terminal',
    name: 'Windows Terminal',
    category: 'Desarrollo',
    exePath: 'shell:AppsFolder\\Microsoft.WindowsTerminal_8wekyb3d8bbwe!App',
    brandKey: 'terminal',
  },
  {
    id: 'app-powerbi',
    name: 'Power BI Desktop',
    category: 'Productividad',
    exePath: 'C:\\Program Files\\Microsoft Power BI Desktop\\bin\\PBIDesktop.exe',
    brandKey: 'powerbi',
  },
  {
    id: 'app-notion',
    name: 'Notion',
    category: 'Productividad',
    exePath: 'C:\\Users\\AppData\\Local\\Programs\\Notion\\Notion.exe',
    brandKey: 'notion',
  },
  {
    id: 'app-figma',
    name: 'Figma Desktop',
    category: 'Diseño & Media',
    exePath: 'C:\\Users\\AppData\\Local\\Figma\\Figma.exe',
    brandKey: 'figma',
  },
  {
    id: 'app-acrobat',
    name: 'Adobe Acrobat PDF',
    category: 'Productividad',
    exePath: 'C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe',
    brandKey: 'acrobat',
  },
  {
    id: 'app-spotify',
    name: 'Spotify',
    category: 'Diseño & Media',
    exePath: 'C:\\Users\\AppData\\Roaming\\Spotify\\Spotify.exe',
    brandKey: 'spotify',
  },
  {
    id: 'app-explorer',
    name: 'Explorador de Archivos',
    category: 'Sistema',
    exePath: 'C:\\Windows\\explorer.exe',
    brandKey: 'explorer',
  },
  {
    id: 'app-calc',
    name: 'Calculadora Científica',
    category: 'Sistema',
    exePath: 'shell:AppsFolder\\Microsoft.WindowsCalculator_8wekyb3d8bbwe!App',
    brandKey: 'calculator',
  },
];

interface AppLogoProps {
  brandKey?: string;
  iconDataUri?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AppBrandLogo: React.FC<AppLogoProps> = ({
  brandKey,
  iconDataUri,
  name,
  size = 'lg',
}) => {
  const sizeClass =
    size === 'sm'
      ? 'w-9 h-9 rounded-[22%] neuglass-pedestal'
      : size === 'md'
      ? 'w-11 h-11 rounded-[23%] neuglass-pedestal'
      : size === 'xl'
      ? 'w-16 h-16 sm:w-20 sm:h-20 rounded-[24%] neuglass-pedestal'
      : 'w-14 h-14 rounded-[23%] neuglass-pedestal';

  if (iconDataUri) {
    return (
      <div
        className={`${sizeClass} relative grid place-items-center bg-[#11212D]/90 border border-[#4A5C6A]/50 shadow-lg overflow-hidden p-1.5`}
      >
        <img
          src={iconDataUri}
          alt={name}
          className="w-full h-full object-contain drop-shadow-[0_4px_6px_rgba(6,20,27,0.65)]"
        />
      </div>
    );
  }

  const key = (brandKey || name).toLowerCase();

  if (key.includes('excel')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#21A366] to-[#107C41] border border-[#33C481]/50 shadow-[0_8px_18px_rgba(16,124,65,0.45)] text-white font-black`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" fill="none">
          <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="white" strokeWidth="1.8" opacity="0.35" />
          <path d="M8 8L13 16M13 8L8 16" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M15.5 9H18.5M15.5 12H18.5M15.5 15H18.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (key.includes('word')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#2B7CD3] to-[#185ABD] border border-[#5EA0EF]/50 shadow-[0_8px_18px_rgba(24,90,189,0.45)] text-white`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" fill="none">
          <path d="M5 7L7.5 17L10.5 9.5L13.5 17L16 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17.5 9H20M17.5 12H20M17.5 15H20" stroke="white" strokeWidth="1.7" strokeLinecap="round" opacity="0.7" />
        </svg>
      </div>
    );
  }

  if (key.includes('powerpoint') || key.includes('ppt')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#ED6C47] to-[#C43E1C] border border-[#FF8F6B]/50 shadow-[0_8px_18px_rgba(196,62,28,0.45)] text-white`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" fill="none">
          <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="1.8" opacity="0.35" />
          <path d="M9 16V8H12.5C14 8 15 9 15 10.5C15 12 14 13 12.5 13H9" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (key.includes('outlook') || key.includes('mail')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#28A8EA] to-[#0078D4] border border-[#69C3F5]/50 shadow-[0_8px_18px_rgba(0,120,212,0.45)] text-white`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" fill="none">
          <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="white" strokeWidth="2" />
          <path d="M4 7L12 13L20 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (key.includes('teams')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#7B83EB] to-[#4B53BC] border border-[#9FA6F5]/50 shadow-[0_8px_18px_rgba(75,83,188,0.45)] text-white`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" fill="none">
          <circle cx="15.5" cy="7.5" r="2.3" fill="white" opacity="0.85" />
          <path d="M6 9H13M9.5 9V17" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="13" y="11" width="6" height="6" rx="2" stroke="white" strokeWidth="1.9" />
        </svg>
      </div>
    );
  }

  if (key.includes('zoom')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#2D8CFF] to-[#0B5CFF] border border-[#6EB0FF]/50 shadow-[0_8px_18px_rgba(11,92,255,0.45)] text-white`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" fill="none">
          <rect x="3" y="7" width="12" height="10" rx="2.5" fill="white" />
          <path d="M16 10.5L21 7.5V16.5L16 13.5V10.5Z" fill="white" />
        </svg>
      </div>
    );
  }

  if (key.includes('slack')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#4A154B] to-[#2C0B2D] border border-[#E01E5A]/45 shadow-[0_8px_18px_rgba(74,21,75,0.5)] text-white`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" fill="none">
          <path d="M9 4V14M15 10V20M4 9H14M10 15H20" stroke="#36C5F0" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="15" cy="6" r="1.8" fill="#2EB67D" />
          <circle cx="6" cy="15" r="1.8" fill="#E01E5A" />
          <circle cx="15" cy="18" r="1.8" fill="#ECB22E" />
        </svg>
      </div>
    );
  }

  if (key.includes('chrome')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#2b3945] to-[#1a242c] border border-white/20 shadow-lg`}
      >
        <svg viewBox="0 0 24 24" className="w-2/3 h-2/3">
          <circle cx="12" cy="12" r="9" fill="#EA4335" />
          <path d="M12 3A9 9 0 0 1 20.5 15H12L8.5 9L12 3Z" fill="#FBBC05" />
          <path d="M3.5 9A9 9 0 0 0 12 21L16 14L8.5 14L3.5 9Z" fill="#34A853" />
          <circle cx="12" cy="12" r="4.2" fill="white" />
          <circle cx="12" cy="12" r="3.1" fill="#4285F4" />
        </svg>
      </div>
    );
  }

  if (key.includes('edge')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#0078D4] to-[#10B981] border border-[#6EE7B7]/40 shadow-lg text-white`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" fill="none">
          <path d="M19 14.5C17.5 17.5 14.5 19 11.5 19C7.5 19 4.5 16 4.5 12C4.5 8 7.8 5 12 5C16 5 19 7.8 19 11.2C19 12.6 17.8 13.5 16.2 13.5H9.5" stroke="white" strokeWidth="2.3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (key.includes('vscode') || key.includes('code')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#24ADF3] to-[#0065A9] border border-[#67C7F7]/50 shadow-[0_8px_18px_rgba(0,101,169,0.45)] text-white`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" fill="none">
          <path d="M17 4L7 14L4 11.5M17 4L20 5.5V18.5L17 20M17 4V20M17 20L7 10L4 12.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (key.includes('terminal') || key.includes('powershell')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#253745] to-[#06141B] border border-[#9BA8AB]/45 shadow-lg text-[#CCD0CF]`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" fill="none">
          <path d="M6 8L10.5 12L6 16" stroke="#CCD0CF" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12.5 16H18.5" stroke="#9BA8AB" strokeWidth="2.3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (key.includes('powerbi') || key.includes('power bi')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#F2C811] to-[#C89600] border border-[#FFE36E]/60 shadow-[0_8px_18px_rgba(242,200,17,0.35)] text-[#1E1905]`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" fill="none">
          <rect x="5" y="13" width="3.5" height="6" rx="1" fill="#1E1905" />
          <rect x="10.2" y="9" width="3.5" height="10" rx="1" fill="#1E1905" />
          <rect x="15.4" y="5" width="3.5" height="14" rx="1" fill="#1E1905" />
        </svg>
      </div>
    );
  }

  if (key.includes('notion')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#F7F6F3] to-[#D9D8D4] border border-white/60 shadow-lg text-[#191919] font-serif font-black text-xl`}
      >
        N
      </div>
    );
  }

  if (key.includes('figma')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#2C2C32] to-[#18181B] border border-white/20 shadow-lg`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5">
          <circle cx="9.5" cy="6.5" r="2.8" fill="#F24E1E" />
          <circle cx="14.5" cy="6.5" r="2.8" fill="#FF7262" />
          <circle cx="9.5" cy="12" r="2.8" fill="#A259FF" />
          <circle cx="14.5" cy="12" r="2.8" fill="#1ABCFE" />
          <circle cx="9.5" cy="17.5" r="2.8" fill="#0ACF83" />
        </svg>
      </div>
    );
  }

  if (key.includes('acrobat') || key.includes('pdf')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#FA0F00] to-[#A60A00] border border-[#FF6B61]/50 shadow-lg text-white font-bold text-xs`}
      >
        PDF
      </div>
    );
  }

  if (key.includes('spotify')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#1ED760] to-[#119942] border border-[#69F098]/50 shadow-lg text-[#0B1911]`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" fill="none">
          <path d="M6 9.5C10 8 15 8.5 18.5 10.5M7 13C10.5 11.8 14.5 12.2 17.2 13.8M8 16.2C10.8 15.3 13.8 15.6 15.8 16.8" stroke="#0B1911" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (key.includes('explorer') || key.includes('archivo')) {
    return (
      <div
        className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#F5BA36] to-[#D48B08] border border-[#FFE08A]/50 shadow-lg text-[#291B02]`}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" fill="currentColor">
          <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4l2 2.5H18.5A2.5 2.5 0 0 1 21 9v8.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-11Z" />
        </svg>
      </div>
    );
  }

  // Fallback monogram logo styled with the 6-color oceanic slate palette
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      className={`${sizeClass} grid place-items-center bg-gradient-to-br from-[#253745] to-[#11212D] border border-[#4A5C6A]/65 text-[#CCD0CF] font-bold text-xl shadow-lg`}
    >
      {initial}
    </div>
  );
};
