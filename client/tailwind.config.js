/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  // classes built dynamically in LoopDiagram.jsx
  safelist: [
    { pattern: /^(fill|stroke)-(accent|target|outlet|inlet|flow|pwm|warn|ok|bad)$/ },
    { pattern: /^fill-(accent|outlet|pwm|warn)\/10$/ },
  ],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: v('ink'), soft: v('ink-soft'), mute: v('ink-mute') },
        surface: { DEFAULT: v('surface'), raised: v('surface-raised'), sunken: v('surface-sunken') },
        line: v('line'),
        // signal colours (one meaning each, used across charts and UI)
        target: v('c-target'),   // setpoints T*, q*
        outlet: v('c-outlet'),   // outlet temperature
        inlet: v('c-inlet'),     // inlet temperature
        flow: v('c-flow'),       // measured flow
        pwm: v('c-pwm'),         // pump command
        ok: v('c-ok'),
        warn: v('c-warn'),
        bad: v('c-bad'),
        accent: v('c-accent'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl2: '1.125rem' },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        pulseRing: { '0%': { boxShadow: '0 0 0 0 rgb(var(--c-ok) / .5)' }, '100%': { boxShadow: '0 0 0 8px rgb(var(--c-ok) / 0)' } },
        dash: { to: { strokeDashoffset: '-24' } },
      },
      animation: {
        'fade-up': 'fadeUp .35s ease-out both',
        'pulse-ring': 'pulseRing 1.6s ease-out infinite',
        dash: 'dash 1s linear infinite',
      },
    },
  },
  plugins: [],
};
