const fs = require('fs');
const path = require('path');

const arscPath = 'C:\\Users\\Viver\\.gemini\\antigravity\\brain\\bd76ec50-23fe-479b-b6b8-3528c29badbf\\scratch\\apk\\resources.arsc';
const b = fs.readFileSync(arscPath);

// Exact index -> Spanish / Bilingual (ES/EN) translations (pure ASCII so u16len === blen)
const translations = {
  0: "1. Conecta tu celular al PC con un cable USB de datos.\n\n2. En Ajustes de Android, activa 'Compartir conexion por USB' (USB Tethering, en Zona Wi-Fi / Conexion). No requiere depuracion USB.\n\n3. Manten OpsDeck abierto en Windows, vuelve aqui y toca 'Buscar PC USB'.\n\nSi Windows pregunta, permite la red USB. (Option EN: Connect USB cable -> Enable USB Tethering in Android Settings -> Tap Find USB PC).\n\nPara conexion sin cables por red local o nube, toca 'Conectar Wi-Fi' arriba e ingresa la IP: 192.168.1.85:8620.",
  9: "Al cumplir el tiempo limite, la pantalla se atenua y permite que Android la apague para ahorrar bateria. Toca la pantalla para volver al dock inmediatamente.",
  10: "Disponible",
  11: "Disponible ya",
  12: "Busca la ultima actualizacion de OpsDeck en la nube.",
  13: "Actualizar App",
  14: "Buscando en la nube...",
  15: "Buscando...",
  16: "Elige tu PC. Las conexiones nuevas pueden pedir codigo.",
  17: "Cerrar",
  18: "Conectar USB",
  19: "Conectar Wi-Fi",
  20: "Conecta a tu PC o busca otro en la red/nube.",
  21: "No se pudo conectar al PC. Verifica la IP o red Wi-Fi.",
  22: "No se pudo verificar la nube. Revisa tu conexion a internet.",
  23: "PC Actual",
  24: "Atenuar inactividad",
  25: "Brillo atenuado",
  26: "Ajustes de pantalla solo para este movil. Tu PC no se modifica.",
  27: "Descarga el APK desde la nube y abrelo para actualizar OpsDeck.",
  28: "Ingresar IP",
  29: "Ingresa la direccion IPv4 LAN/Tailscale del PC (ej. 192.168.1.85:8620).",
  30: "Buscar USB",
  31: "Olvidar",
  32: "Olvidar %1$s",
  33: "Instalado en este movil: %1$s",
  34: "Manten OpsDeck activo en tu PC y conecta ambos a la misma red Wi-Fi.\nO escribe la IP del PC: 192.168.1.85:8620",
  35: "Buscando PCs con OpsDeck en tu red Wi-Fi...",
  36: "Buscando tu PC por Wi-Fi...",
  37: "Buscando tu PC por cable USB...",
  38: "Reducir el brillo protege tu pantalla. Mantener activa conserva la pantalla encendida mientras usas la botonera.",
  39: "Nunca",
  40: "No se hallaron PCs automaticos. Escribe 192.168.1.85:8620 abajo y toca Usar esta IP, o usa Conectar USB.",
  41: "No se detecto PC por USB. Revisa el cable, activa Compartir conexion por USB (USB Tethering) o toca Conectar Wi-Fi.",
  42: "No detectado · Toca para reintentar",
  43: "Abre Ajustes de Android para cambiar esto.",
  44: "Ajustes de red / USB",
  45: "Abre github.com/dariohtelecom-oss/opsdeck para actualizar.",
  46: "Abriendo OpsDeck...",
  47: "IP USB del PC · 192.168.42.10:8620",
  48: "IP LAN del PC · 192.168.1.85:8620",
  49: "Pantalla del telefono",
  50: "Buscar",
  51: "Elimina este PC guardado y detiene la reconexion automatica.",
  52: "OK",
  53: "PCs Guard",
  54: "Apagar",
  55: "Pantalla en reposo. Toca para volver.",
  56: "Mantener pantalla encendida",
  57: "Elegir PC",
  58: "Este movil",
  59: "USB desconectado. Buscando tu PC por Wi-Fi...",
  60: "Modo USB · Activa Compartir por USB",
  61: "Nube",
  62: "Tiempo del sistema",
  63: "Conectar a IP",
  64: "Descargar de la Nube",
  65: "Modo Wi-Fi · Celular y PC en la misma red",
  66: "OpsDeck",
  67: "OpsDeck %1$s disponible.",
  68: "OpsDeck actualizado."
};

const count = b.readUInt32LE(20);
const sStart = 12 + b.readUInt32LE(32);

for (const [idxStr, newText] of Object.entries(translations)) {
  const idx = Number(idxStr);
  if (idx >= count) continue;
  let p = sStart + b.readUInt32LE(40 + idx * 4);
  const u16Bytes = (b[p] & 0x80) ? 2 : 1;
  let pLen = p + u16Bytes;
  let blen = b[pLen];
  let blenBytes = 1;
  if (blen & 0x80) {
    blen = ((blen & 0x7f) << 8) | b[pLen + 1];
    blenBytes = 2;
  }
  const strStart = pLen + blenBytes;

  // Build pure ASCII buffer of exact length `blen`
  const cleanAscii = Buffer.from(newText, 'ascii');
  const padded = Buffer.alloc(blen, 0x20); // space padding
  cleanAscii.copy(padded, 0, 0, Math.min(cleanAscii.length, blen));

  // If u16len was 1 byte (< 128), update u16len to blen so UTF-16 length matches ASCII byte length
  if (u16Bytes === 1 && blen < 128) {
    b[p] = blen;
  } else if (u16Bytes === 2 && blen >= 128) {
    b[p] = 0x80 | ((blen >> 8) & 0x7f);
    b[p + 1] = blen & 0xff;
  }

  padded.copy(b, strStart);
}

fs.writeFileSync(arscPath, b);
console.log('Successfully patched resources.arsc with Spanish/Bilingual strings!');

// 2. Patch classes3.dex (Spanish keyboard strings + GitHub Cloud repo + allow Cloud HTTPS domains in EndpointPolicy)
const crypto = require('crypto');
const dexPath = 'C:\\Users\\Viver\\.gemini\\antigravity\\brain\\bd76ec50-23fe-479b-b6b8-3528c29badbf\\scratch\\apk\\classes3.dex';
const dex = fs.readFileSync(dexPath);

function replaceExactDexAscii(buf, oldStr, newStr) {
  if (oldStr.length !== newStr.length) throw new Error('Length mismatch: ' + oldStr);
  const idx = buf.indexOf(oldStr, 'ascii');
  if (idx !== -1) {
    Buffer.from(newStr, 'ascii').copy(buf, idx);
    console.log(`Patched DEX string at ${idx}: ${oldStr} -> ${newStr}`);
  }
}

replaceExactDexAscii(dex, 'Draw and insert a signature', 'Dibujar e insertar la firma');
replaceExactDexAscii(dex, 'Hide keyboard', 'Ocultar tecl.');
replaceExactDexAscii(
  dex,
  'https://github.com/aliihsaad/WinDock/releases',
  'https://github.com/dariohtelecom-oss/opsdeck/'
);

// Patch EndpointPolicy.isAllowedHost (at 37614: 38 00 03 00 -> 00 00 00 00 nop;nop so Cloud domains are allowed)
if (dex[37614] === 0x38 && dex[37615] === 0x00 && dex[37616] === 0x03 && dex[37617] === 0x00) {
  dex[37614] = 0x00;
  dex[37615] = 0x00;
  dex[37616] = 0x00;
  dex[37617] = 0x00;
  console.log('Patched EndpointPolicy.isAllowedHost to allow Cloud HTTPS domains');
}

// Recompute SHA-1 signature (bytes 12..31 = sha1(bytes 32..end))
const sha1 = crypto.createHash('sha1').update(dex.subarray(32)).digest();
sha1.copy(dex, 12);

// Recompute Adler-32 checksum (bytes 8..11 = adler32(bytes 12..end))
let s1 = 1;
let s2 = 0;
for (let i = 12; i < dex.length; i++) {
  s1 = (s1 + dex[i]) % 65521;
  s2 = (s2 + s1) % 65521;
}
const adler = ((s2 << 16) | s1) >>> 0;
dex.writeUInt32LE(adler, 8);

fs.writeFileSync(dexPath, dex);
console.log('Successfully updated classes3.dex SHA-1 and Adler-32 checksums!');

