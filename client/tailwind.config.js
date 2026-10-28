/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f1115',
        panel: '#1a1d23',
        'panel-2': '#222630',
        line: '#2d323d',
        ink: '#e6e8ec',
        muted: '#9aa1ad',
        brand: '#d93a22',
        'brand-hover': '#e5472f',
        'brand-text': '#ff6a4d',
        amber: '#f08a24',
        ok: '#3ddc84',
        info: '#4aa3ff',
        danger: '#ff5c5c',
        'type-room': '#ff6a4d',
        'type-desk': '#4aa3ff',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
