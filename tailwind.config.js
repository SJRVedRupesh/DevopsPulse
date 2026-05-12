/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        devops: {
          bg: '#080c14',
          surface: '#0d1420',
          border: '#1a2535',
          accent: '#00d4ff',
          green: '#00e676',
          red: '#ff3d5a',
          yellow: '#ffab00',
          purple: '#bf69ff',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Space Grotesk"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
