/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f0f5ff',
          100: '#e0eafc',
          200: '#c7d9f9',
          500: '#274275',
          600: '#163672',
          700: '#0d2554',
          800: '#091b3e',
          900: '#051026',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        '2xs': '0 1px 1px 0 rgb(15 23 42 / 0.04)',
        card: '0 4px 20px -2px rgb(15 23 42 / 0.05), 0 1px 3px 0 rgb(15 23 42 / 0.03)',
        dropdown: '0 12px 32px -4px rgb(15 23 42 / 0.14), 0 4px 12px -2px rgb(15 23 42 / 0.08)',
      },
      keyframes: {
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(-4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'dropdown-in': 'fadeInScale 140ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
