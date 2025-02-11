/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      // Constant colours that don't change between themes
      colors: {
        'red': '#FF9A9C',
        'purple': {
          'default': '#C398FF',
          'very-light': '#E6DBF5'
        },
        'grey': {
          'light': '#E1E1E1',
          'dark': '#8C8C8C',
          'darker': '#474747'
        },
        'brown': '#322113',
        'black': '#020202',
        'pink': {
          'select': '#FF00E5'
        }
      },
      fontFamily: {
        sans: ['Atkinson-Hyperlegible', 'sans-serif'],
        pixel: ['Handjet', 'serif'],
      },
      boxShadow: {
        'default': '-4px 4px 10px rgba(0, 0, 0, 0.25);'
      }

    },
  },
  plugins: [
    require('tailwindcss-themer')({
      defaultTheme: {
        extend: {
          /**
           * Colours for default theme
           */
          colors: {
            'green': '#B4FFB2',
            'pink': '#FF00E5',
            'blue': '#FFDFFA',
            'yellow': '#FDFFB4',
            'grey': '#C2C2C2',
          }
        }
      },
      themes: [
        {
          name: 'dark',
          extend: {
            /**
             * Colours from dark theme. visually these  might look different 
             * from the colour mentionedbut we call them the same thing so we
             * can swap them around automatically
             */
            colors: {
              'green': '#00000',
              'pink': '#051F07',
              'blue': '#010143',
              'yellow': '#3B0346',
              'grey': '#FFFFFF',
            }
          }
        }
      ]
    })
  ],
}