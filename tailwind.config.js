/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4: use content com as extensões corretas
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Tokens do design system PoolSafe (tema escuro)
        background: '#041728',
        'background-deep': '#070E16',
        surface: '#072438',
        'surface-raised': '#082E45',
        border: '#175464',
        primary: '#00D9E8',
        'primary-pressed': '#00B8C6',
        success: '#10B981',
        warning: '#F6C95C',
        danger: '#FF4D73',
        info: '#44A8FF',
        offline: '#78909C',
      },
    },
  },
  plugins: [],
};
