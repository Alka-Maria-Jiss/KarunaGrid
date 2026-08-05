/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        serene: {
          bg: '#fff9ef',
          dim: '#e0d9cc',
          bright: '#fff9ef',
          low: '#faf3e5',
          container: '#f4ede0',
          high: '#eee7da',
          highest: '#e9e2d5',
          text: '#1e1b14',
          muted: '#4a473d',
          outline: '#7b776c',
          'outline-subtle': '#cbc6ba',
          primary: '#645e45',
          'primary-hover': '#4c472f',
          'primary-container': '#b5ad8f',
          'on-primary-container': '#464129',
          secondary: '#695e3d',
          'secondary-container': '#f1e1b7',
          tertiary: '#605e5d',
          terracotta: '#ba1a1a',
        }
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'serene': '1rem',
        'serene-lg': '1.5rem',
      },
      boxShadow: {
        'serene-sm': '0 2px 8px -2px rgba(30, 27, 20, 0.05)',
        'serene': '0 8px 24px -4px rgba(100, 94, 69, 0.08)',
        'serene-hover': '0 16px 32px -6px rgba(100, 94, 69, 0.14)',
      }
    },
  },
  plugins: [],
}
