/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  darkMode: 'class',
  prefix: 'tq-',
  theme: {
    extend: {
      colors: {
        // Primary backgrounds
        'bg-primary': '#1e1e1e',
        'bg-secondary': '#2d2d30',
        'bg-tertiary': '#252525',
        'bg-hover': '#3c3c3c',
        'bg-active': '#333333',
        
        // Borders
        'border-default': '#3c3c3c',
        'border-subtle': '#555555',
        'border-focus': '#007acc',
        
        // Text colors
        'text-primary': '#cccccc',
        'text-secondary': '#858585',
        'text-muted': '#6e6e6e',
        'text-code': '#ce9178',
        
        // Brand colors - Kiro style
        'accent-blue': '#007acc',
        'accent-blue-hover': '#1177bb',
        'accent-blue-active': '#0d5a8f',
        'accent-blue-bg': 'rgba(0, 122, 204, 0.15)',
        'accent-blue-hover-bg': 'rgba(0, 122, 204, 0.25)',
        'accent-red': '#cb4830',
        'accent-red-hover': '#d95840',
        
        // Green accent - Kiro style for autopilot/approve
        'accent-green': '#3fb950',
        'accent-green-hover': '#2ea043',
        'accent-green-bg': 'rgba(63, 185, 80, 0.15)',
        'accent-green-hover-bg': 'rgba(63, 185, 80, 0.25)',
        
        // Status colors
        'success': '#3fb950',
        'success-bg': 'rgba(63, 185, 80, 0.15)',
        'error': '#f85149',
        'error-bg': 'rgba(248, 81, 73, 0.15)',
        'warning': '#d29922',
        'warning-bg': 'rgba(210, 153, 34, 0.15)',
        'pending': '#858585',
        'pending-bg': 'rgba(128, 128, 128, 0.15)',
        
        // Code syntax
        'code-bg': '#1a1a1a',
        'code-keyword': '#dcdcaa',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['Consolas', 'Monaco', 'SF Mono', 'monospace'],
      },
      fontSize: {
        'xs': '11px',
        'sm': '12px',
        'base': '13px',
        'md': '14px',
        'lg': '16px',
        'xl': '18px',
        '2xl': '28px',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
      },
      borderRadius: {
        'sm': '3px',
        'DEFAULT': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        'full': '9999px',
      },
      transitionDuration: {
        'fast': '100ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      boxShadow: {
        'dropdown': '0 4px 12px rgba(0, 0, 0, 0.3)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in',
        'slide-in': 'slideIn 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'pulse-dot': 'pulse 1.4s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          'from': { transform: 'translateX(100%)' },
          'to': { transform: 'translateX(0)' },
        },
        slideDown: {
          'from': { opacity: '0', maxHeight: '0' },
          'to': { opacity: '1', maxHeight: '500px' },
        },
        slideInUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 60%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '30%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
