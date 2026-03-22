import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0f',
          card: '#12121a',
          hover: '#1a1a28',
        },
        border: {
          card: '#1e1e2e',
          hover: '#2e2e42',
        },
        accent: {
          green: '#00ff88',
          yellow: '#ffcc00',
          red: '#ff4455',
          blue: '#4488ff',
        },
        muted: '#666680',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
