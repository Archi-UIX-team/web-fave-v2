import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Shared HTML partials for the inner pages.
// In a page, `<!--#include header-->` is replaced with partials/header.html.
// The nav link matching <body data-page="..."> gets aria-current="page".
function htmlPartials() {
  const load = (name) => readFileSync(resolve(__dirname, "partials", `${name}.html`), "utf8");
  return {
    name: "fave-html-partials",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        let out = html.replace(/<!--#include ([a-z-]+)-->/g, (_, name) => load(name));
        const page = /<body[^>]*data-page="([a-z-]+)"/.exec(out)?.[1];
        if (page) {
          out = out.replace(
            new RegExp(`(<a )(data-nav="${page}")`, "g"),
            '$1aria-current="page" $2',
          );
        }
        return out;
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.replaceAll("\\", "/").includes("/partials/") && file.endsWith(".html")) {
        server.ws.send({ type: "full-reload" });
      }
    },
  };
}

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/, so the Pages workflow sets
  // BASE_PATH=/fave-v2/. Local dev and preview keep the root path.
  base: process.env.BASE_PATH || "/",
  plugins: [htmlPartials()],
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
