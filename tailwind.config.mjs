import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Apple-style dark system
        obsidian: '#000000',
        carbon:   '#0a0a0a',
        slate:    '#1d1d1f',
        fog:      '#2c2c2e',
        wire:     '#424245',
        chalk:    '#f5f5f7',
        silver:   '#a1a1a6',
        ash:      '#6e6e73',

        // Semantic aliases (used in components/prose)
        bg:      '#000000',
        surface: '#1d1d1f',
        border:  '#424245',
        muted:   '#6e6e73',
        dim:     '#a1a1a6',
        ink:     '#f5f5f7',

        rust: {
          DEFAULT: '#ff6b47',
          50:  '#fff3f0',
          100: '#ffe4dc',
          700: '#cc4422',
        },

        glow: {
          purple: '#9b5de5',
          blue:   '#4361ee',
          cyan:   '#4cc9f0',
        },

        verdict: {
          viable:       '#34d399',
          'viable-bg':  'rgba(52,211,153,0.12)',
          partial:      '#fbbf24',
          'partial-bg': 'rgba(251,191,36,0.12)',
          'not-yet':    '#f87171',
          'not-yet-bg': 'rgba(248,113,113,0.12)',
        },
      },
      fontFamily: {
        display: ['Fraunces', ...defaultTheme.fontFamily.serif],
        sans:    ['Inter',    ...defaultTheme.fontFamily.sans],
        mono:    ['"JetBrains Mono"', ...defaultTheme.fontFamily.mono],
      },
      maxWidth: {
        prose: '68ch',
        wide:  '1200px',
      },
      lineHeight: {
        editorial: '1.68',
      },
      animation: {
        'fade-up':  'fade-up 0.7s ease forwards',
        'fade-in':  'fade-in 0.6s ease forwards',
        'glow-pulse': 'glow-pulse 6s ease-in-out infinite',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%':      { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
