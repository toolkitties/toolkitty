/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        // Theme dependent colours declared in app.css
        bg: "var(--bg-color)",
        "bg-secondary": "var(--bg-secondary-color)",
        primary: "var(--primary-color)",
        physical: "var(--physical-color)",
        geo: "var(--geo-color)",
        virtual: "var(--virtual-color)",
        text: "var(--text-color)",
        // Constant colours that don't change between themes
        red: {
          light: "#FF9A9C",
        },
        purple: {
          default: "#C398FF",
          "very-light": "#E6DBF5",
        },
        grey: {
          "very-light": "#F0F0F0",
          light: "#E1E1E1",
          dark: "#8C8C8C",
          darker: "#474747",
        },
        brown: {
          dark: "#322113",
        },
        black: "#020202",
        pink: {
          hot: "#FF00E5",
          light: "#FFDFFA",
        },
        blue: {
          light: "#baceff",
        },
        green: {
          "light-fluro": "#B4FFB2",
        },
      },
      fontFamily: {
        sans: ["Atkinson-Hyperlegible", "sans-serif"],
        pixel: ["Handjet", "serif"],
      },
      boxShadow: {
        default: "-4px 4px 10px rgba(0, 0, 0, 0.25);",
      },
      backgroundImage: (theme) => ({
        "gradient-attention": `linear-gradient(90deg, ${theme("colors.primary")} 24%, ${theme("colors.red.light")} 100%)`,
      }),
    },
  },
  plugins: [],
};
