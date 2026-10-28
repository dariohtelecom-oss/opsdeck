/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#06141B',        // Deepest abyssal navy from palette
          surface: '#11212D',   // Primary dark slate-navy card surface
          surface2: '#253745',  // Elevated slate-blue surface / interactive pill
          line: '#4A5C6A',      // Steel blue-gray border & divider
          text: '#CCD0CF',      // Crisp silver-mist primary text
          muted: '#9BA8AB',     // Muted cool gray-blue secondary text
          accent: '#CCD0CF',    // Primary tactile highlight from palette
          accentDark: '#06141B',// High-contrast dark ink on #CCD0CF buttons
          live: '#9BA8AB',      // Subtle steel indicator
          danger: '#E07A7A',    // Harmonized muted crimson for critical alerts
          dangerDark: '#1F0C0D',
          warn: '#D9B382',
        }
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Cascadia Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      }
    },
  },
  plugins: [],
}
