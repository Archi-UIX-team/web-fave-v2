import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/, so the Pages workflow sets
  // BASE_PATH=/fave-v2/. Local dev and preview keep the root path.
  base: process.env.BASE_PATH || "/",
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        hotels: resolve(__dirname, "hotels.html"),
        offers: resolve(__dirname, "offers.html"),
        meetings: resolve(__dirname, "meetings.html"),
        weddings: resolve(__dirname, "weddings.html"),
        news: resolve(__dirname, "news.html"),
      },
    },
  },
});
