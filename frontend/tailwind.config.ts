import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        void: '#08080c',
        surface: '#0f0f14',
        card: '#141419',
        elevated: '#1a1a22',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'glow-blue': '0 0 20px -5px rgba(59, 130, 246, 0.2)',
        'glow-green': '0 0 20px -5px rgba(16, 185, 129, 0.2)',
        'glow-red': '0 0 20px -5px rgba(239, 68, 68, 0.2)',
      },
    },
  },
  plugins: [],
} satisfies Config;
