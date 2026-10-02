/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Built around the DewanTech blue (#006fef) and the DoNext navy (#012360).
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdaff',
          300: '#8ec2ff',
          400: '#4f9dff',
          500: '#1a80ff',
          600: '#006fef',
          700: '#0059c4',
          800: '#00479d',
          900: '#012360',
        },
        // Accent from the DoNext check mark
        success: {
          500: '#01bc7a',
          600: '#019a64',
        },
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        wave: 'wave 0.9s ease-in-out infinite',
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [],
};
