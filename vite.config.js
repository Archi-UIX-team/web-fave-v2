import { defineConfig } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// Every HTML file at the project root is a page (home, hotels, offer-*, etc.),
// so the build input is discovered rather than listed by hand.
const htmlInputs = Object.fromEntries(
  readdirSync(__dirname)
    .filter((f) => f.endsWith(".html"))
    .map((f) => [f.replace(/\.html$/, ""), resolve(__dirname, f)]),
);

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
      input: htmlInputs,
    },
  },
});
