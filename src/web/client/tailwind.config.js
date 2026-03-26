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
        primary: {
          DEFAULT: '#6366f1', // Indigo 500
          dark: '#4f46e5',    // Indigo 600
        },
        accent: {
          DEFAULT: '#ec4899', // Pink 500
          dark: '#db2777',    // Pink 600
        },
        background: {
          light: '#f8fafc',   // Slate 50
          dark: '#020617',    // Slate 950
        },
        surface: {
          light: '#ffffff',
          dark: '#0f172a',    // Slate 900
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        serif: ['Georgia', 'Cambria', "Times New Roman", 'Times', 'serif'],
      },
    },
  },
  plugins: [],
}
