
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './styles/**/*.{css}',
    
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'var(--color-border)', 
        input: 'var(--color-input)', 
        ring: 'var(--color-ring)', 
        background: 'var(--color-background)', 
        foreground: 'var(--color-foreground)', 
        primary: {
          DEFAULT: 'var(--color-primary)', 
          foreground: 'var(--color-primary-foreground)', 
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)', 
          foreground: 'var(--color-secondary-foreground)', 
        },
        accent: {
          DEFAULT: 'var(--color-accent)', 
          foreground: 'var(--color-accent-foreground)', 
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)', 
          foreground: 'var(--color-destructive-foreground)', 
        },
        muted: {
          DEFAULT: 'var(--color-muted)', 
          foreground: 'var(--color-muted-foreground)', 
        },
        card: {
          DEFAULT: 'var(--color-card)', 
          foreground: 'var(--color-card-foreground)', 
        },
        popover: {
          DEFAULT: 'var(--color-popover)', 
          foreground: 'var(--color-popover-foreground)', 
        },
        success: {
          DEFAULT: 'var(--color-success)', 
          foreground: 'var(--color-success-foreground)', 
        },
        warning: {
          DEFAULT: 'var(--color-warning)', 
          foreground: 'var(--color-warning-foreground)', 
        },
        error: {
          DEFAULT: 'var(--color-error)', 
          foreground: 'var(--color-error-foreground)', 
        },
        surface: {
          elevated: 'var(--color-surface-elevated)', 
          overlay: 'var(--color-surface-overlay)', 
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
        },
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
        },
        'border-primary': 'var(--color-border-primary)',
        'nobel-gold': 'var(--color-nobel-gold)',
      },
      fontFamily: {
        sans: ['"Styrene"', 'sans-serif'],
        serif: ['"Galaxie Copernicus"', '"Tiempos Text"', 'serif'],
        heading: ['"Galaxie Copernicus"', 'serif'],
        caption: ['"Styrene"', 'sans-serif'],
        mono: ['"Styrene"', 'monospace'],
      },
      fontSize: {
        'h1': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['1.875rem', { lineHeight: '1.25', fontWeight: '600' }],
        'h3': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h4': ['1.25rem', { lineHeight: '1.4', fontWeight: '500' }],
        'h5': ['1.125rem', { lineHeight: '1.5', fontWeight: '500' }],
        'caption': ['0.875rem', { lineHeight: '1.4', letterSpacing: '0.025em' }],
      },

      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      },
      boxShadow: {
        'glow': 'var(--shadow-glow)',
        'glow-accent': '0 0 0 1px rgba(6, 182, 212, 0.2)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      transitionDuration: {
        'fast': 'var(--transition-fast)',
        'base': 'var(--transition-base)',
        'slow': 'var(--transition-slow)',
      },
      transitionTimingFunction: {
        'smooth': 'ease-out',
        'spring': 'cubic-bezier(0.34, 1.26, 0.64, 1)',
      },
      zIndex: {
        'base': 'var(--z-base)',
        'card': 'var(--z-card)',
        'dropdown': 'var(--z-dropdown)',
        'sidebar': 'var(--z-sidebar)',
        'alert': 'var(--z-alert)',
        'modal': 'var(--z-modal)',
        'tooltip': 'var(--z-tooltip)',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-down': 'slide-down 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
      },
    },
  },
  plugins: [],
}