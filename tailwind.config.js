/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f8f9fb',
        surface: '#ffffff',
        'surface-soft': '#f3f1fa',
        'surface-muted': '#f4f5f8',
        'text-primary': '#1a1f2e',
        'text-secondary': '#6b7280',
        border: '#e4e7ef',
        primary: '#6b57eb',
        'primary-dark': '#5a46d6',
        'accent-blue': '#5b8def',
        'accent-coral': '#e07a5f',
        'accent-mint': '#3d9b82',
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(26, 31, 46, 0.04), 0 1px 2px rgba(26, 31, 46, 0.02)',
        'card-hover': '0 4px 16px rgba(26, 31, 46, 0.06)',
        float: '0 8px 30px rgba(26, 31, 46, 0.08)',
      },
    },
  },
  plugins: [],
};
