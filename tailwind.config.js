/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'yellow': {
          'light': '#FDFFB4'
        },
        'red': {
          'light': '#FF9A9C'
        },
        'fluro-green': {
          'light': '#B4FFB2'
        }
      }
    },
  },
  plugins: [],
}

