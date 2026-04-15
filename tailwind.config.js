/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fazai: {
          bg: '#000005',
          card: '#0A0A0F',
          blue: '#4A7CF7',
          cyan: '#00D4FF',
          green: '#00E676',
        },
      },
    },
  },
  plugins: [],
};
