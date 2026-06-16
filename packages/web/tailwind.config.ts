import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#5DAC81',
          light: '#7dd9a4',
          dark: '#3d8b65',
        },
        link: '#4a6cf7',
        like: '#ff6482',
        'text-primary': '#1a1a2e',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'organic-h1': '60% 40% 55% 45% / 45% 55% 45% 55%',
        'organic-h2': '55% 45% 50% 50% / 42% 50% 58% 58%',
        'organic-h3': '60% 40% 55% 45% / 50% 55% 45% 50%',
      },
      backdropBlur: {
        glass: '18px',
      },
      animation: {
        'bubble-float': 'bubbleFloat 25s ease-in-out infinite',
        'bubble-float-slow': 'bubbleFloat 30s ease-in-out infinite',
        'bubble-float-delayed': 'bubbleFloat 22s ease-in-out infinite 5s',
        ripple: 'ripple 150ms ease-in-out',
        shimmer: 'shimmer 200ms ease-out',
        'fade-in': 'fadeIn 300ms ease-out',
        'slide-up': 'slideUp 400ms ease-out',
      },
      keyframes: {
        bubbleFloat: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(15px, -20px) scale(1.05)' },
          '50%': { transform: 'translate(-10px, -35px) scale(0.97)' },
          '75%': { transform: 'translate(-20px, -10px) scale(1.03)' },
        },
        ripple: {
          '0%': { transform: 'scale(0.98)', opacity: '0.8' },
          '50%': { transform: 'scale(1.02)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { opacity: '0' },
          '100%': { opacity: '0.15' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config;
