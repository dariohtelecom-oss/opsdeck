import { createServer } from 'node:http';
import { hostname, cpus, totalmem, freemem, platform } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.OPSDECK_PORT) || 8620;

// Constant PowerShell script (never interpolates user input) to scan real installed apps on Windows
const INVENTORY_PS = [
  "$ErrorActionPreference='SilentlyContinue';",
  "[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false);",
  "$out=@();",
  "$roots=@([Environment]::GetFolderPath('CommonStartMenu'),[Environment]::GetFolderPath('StartMenu'));",
  "$sh=New-Object -ComObject WScript.Shell;",
  "foreach($r in $roots){",
  "  if(-not $r){continue};",
  "  Get-ChildItem -LiteralPath $r -Recurse -Filter *.lnk | ForEach-Object {",
  "    $lk=$sh.CreateShortcut($_.FullName);",
  "    if($lk.TargetPath -and $lk.TargetPath.ToLower().EndsWith('.exe')){",
  "      $out+=[pscustomobject]@{ name=$_.BaseName; target=$lk.TargetPath; source='startmenu' }",
  "    }",
  "  }",
  "};",
  "$out | Select-Object -First 60 | ConvertTo-Json -Compress -Depth 3",
].join(' ');

const ICON_PS = [
  "param([string]$TargetPath)",
  "$ErrorActionPreference='SilentlyContinue';",
  "Add-Type -AssemblyName System.Drawing;",
  "if (-not (Test-Path -LiteralPath $TargetPath)) { exit 1 }",
  "$ico = [System.Drawing.Icon]::ExtractAssociatedIcon($TargetPath);",
  "if (-not $ico) { exit 1 }",
  "$bmp = $ico.ToBitmap();",
  "$ms = New-Object System.IO.MemoryStream;",
  "$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png);",
  "[Convert]::ToBase64String($ms.ToArray())",
].join('; ');

let cachedApps = null;
let cachedAt = 0;
const iconCache = new Map();

async function getInstalledApps() {
  if (cachedApps && Date.now() - cachedAt < 60_000) return cachedApps;
  if (platform() !== 'win32') return [];
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', INVENTORY_PS],
      { timeout: 12000, maxBuffer: 4 * 1024 * 1024 }
    );
    const parsed = JSON.parse(stdout.trim() || '[]');
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    const map = new Map();
    for (const r of rows) {
      if (!r?.name || !r?.target) continue;
      if (/uninstall|desinstalar|setup|installer|readme|help/i.test(r.name)) continue;
      const id = createHash('sha1').update(String(r.target).toLowerCase()).digest('hex').slice(0, 12);
      if (!map.has(id)) {
        map.set(id, {
          id: `pcapp-${id}`,
          name: String(r.name).trim(),
          target: String(r.target).trim(),
          source: r.source || 'startmenu',
        });
      }
    }
    cachedApps = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    cachedAt = Date.now();
    return cachedApps;
  } catch {
    return [];
  }
}

async function getAppIconBase64(targetPath) {
  if (iconCache.has(targetPath)) return iconCache.get(targetPath);
  if (platform() !== 'win32') return null;
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', `& { ${ICON_PS} }`, targetPath],
      { timeout: 6000 }
    );
    const b64 = stdout.trim();
    if (b64 && b64.length > 40) {
      const dataUri = `data:image/png;base64,${b64}`;
      iconCache.set(targetPath, dataUri);
      return dataUri;
    }
  } catch {
    // ignore icon extraction error
  }
  return null;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type,X-OpsDeck-Token',
    'cache-control': 'no-store',
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'Content-Type,X-OpsDeck-Token',
    });
    return res.end();
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health' && req.method === 'GET') {
    const usedMemPct = Math.round(((totalmem() - freemem()) / totalmem()) * 100);
    return sendJson(res, 200, {
      ok: true,
      app: 'opsdeck-host',
      hostName: hostname(),
      platform: platform(),
      cpuCount: cpus().length,
      ramPercent: usedMemPct,
    });
  }

  if (url.pathname === '/api/apps/installed' && req.method === 'GET') {
    const apps = await getInstalledApps();
    // Attach icons for top 25 apps in parallel
    const enriched = await Promise.all(
      apps.slice(0, 28).map(async (app) => ({
        ...app,
        iconDataUri: await getAppIconBase64(app.target),
      }))
    );
    return sendJson(res, 200, { hostName: hostname(), apps: enriched });
  }

  if (url.pathname === '/api/apps/launch' && req.method === 'POST') {
    let raw = '';
    req.on('data', (c) => {
      if (raw.length < 16384) raw += c;
    });
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw || '{}');
        const apps = await getInstalledApps();
        const found = apps.find((a) => a.id === body.id);
        if (!found) return sendJson(res, 404, { error: 'App not in inventory' });
        execFile('explorer.exe', [found.target]);
        return sendJson(res, 200, { ok: true, launched: found.name });
      } catch {
        return sendJson(res, 400, { error: 'Invalid launch payload' });
      }
    });
    return;
  }

  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  process.stdout.write(`OpsDeck Host Agent listening on http://localhost:${PORT}\n`);
});
