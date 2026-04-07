/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--background)',
          light: 'var(--background-light)',
          dark: 'var(--background-dark)',
          subtle: 'var(--background-subtle)',
        },
        foreground: {
          DEFAULT: 'var(--foreground)',
          muted: 'var(--muted-foreground)',
          inverted: 'var(--foreground-inverted)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          light: 'var(--surface-light)',
          dark: 'var(--surface-dark)',
          elevated: 'var(--surface-elevated)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          light: 'var(--primary-300)',
          dark: 'var(--primary-600)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          light: 'var(--secondary-300)',
          dark: 'var(--secondary-600)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          dark: 'var(--accent-dark)',
          foreground: 'var(--accent-foreground)',
        },
        success: {
          DEFAULT: 'var(--success)',
          soft: 'var(--success-soft)',
          border: 'var(--success-border)',
          foreground: 'var(--success-foreground)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          soft: 'var(--warning-soft)',
          border: 'var(--warning-border)',
          foreground: 'var(--warning-foreground)',
        },
        error: {
          DEFAULT: 'var(--error)',
          soft: 'var(--error-soft)',
          border: 'var(--error-border)',
          foreground: 'var(--error-foreground)',
        },
        danger: {
          DEFAULT: 'var(--error)',
          soft: 'var(--error-soft)',
          border: 'var(--error-border)',
          foreground: 'var(--error-foreground)',
        },
        info: {
          DEFAULT: 'var(--info)',
          soft: 'var(--info-soft)',
          border: 'var(--info-border)',
          foreground: 'var(--info-foreground)',
        },
        ring: 'var(--ring)',
        muted: 'var(--muted)',
      },
      fontFamily: {
        sans: ['ceibalMozaic', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        serif: ['Georgia', 'Cambria', "Times New Roman", 'Times', 'serif'],
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        medium: 'var(--shadow-medium)',
        glow: 'var(--shadow-glow)',
      },
    },
  },
  plugins: [],
}
