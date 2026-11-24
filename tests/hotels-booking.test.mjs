/*
  Browser regression tests for the hotels page booking pickers and filters.
  Run: npm run test:browser
  Builds the site to a temp folder, serves it with `vite preview`, and drives
  the installed Microsoft Edge (or Chrome) through playwright-core.
*/
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { build, preview } from "vite";
import { chromium } from "playwright-core";

const outDir = join(tmpdir(), "fave-browser-test-dist");
let server;
let browser;
let base;

before(async () => {
  await build({ logLevel: "error", build: { outDir, emptyOutDir: true, minify: false } });
  server = await preview({ logLevel: "error", build: { outDir }, preview: { host: "127.0.0.1", port: 0 } });
  base = server.resolvedUrls.local[0].replace(/\/$/, "");
  const channel = process.env.PW_CHANNEL || "msedge";
  browser = await chromium.launch({ channel });
});
after(async () => {
  await browser?.close();
  await new Promise((r) => server?.httpServer.close(r));
});

// opens hotels.html; `now` fixes the browser clock (local time)
const openHotels = async ({ now, width = 1440, height = 900 } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  const page = await context.newPage();
  if (now) await page.clock.install({ time: now });
  await page.goto(`${base}/hotels.html`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector('[data-out="checkin"]')?.textContent.trim());
  await page.waitForFunction(() => document.querySelectorAll(".fx-check").length > 0);
  return page;
};
const count = (page) => page.textContent("#all-hotels [data-f-count]");
const chooseDest = async (page, name) => {
  await page.click('[data-field="dest"] button');
  await page.fill("#pop-dest input", name);
  await page.keyboard.press("Enter");
};

test("book now resets the region chip so the chosen city shows", async () => {
  const page = await openHotels();
  await page.click('[data-f-chips="region"] [data-value="java"]');
  await chooseDest(page, "Bali");
  await page.click('.fx-bar button[type="submit"]');
  assert.match(await count(page), /of 2 hotels/);
  assert.equal(await page.getAttribute('[data-f-chips="region"] [data-value="all"]', "aria-pressed"), "true");
  await page.close();
});

test("choosing Malaysia shows no Indonesian hotels", async () => {
  const page = await openHotels();
  await chooseDest(page, "Malaysia");
  await page.click('.fx-bar button[type="submit"]');
  assert.match(await count(page), /^no hotels found/);
  await page.close();
});

test("today is recomputed when the page stays open past midnight", async () => {
  const page = await openHotels({ now: new Date(2026, 10, 23, 23, 58) });
  await page.clock.fastForward("05:00"); // now 24 nov, 00:03
  await page.click('[data-field="checkin"] button');
  assert.equal(await page.isDisabled('#pop-dates [data-day="2026-11-23"]'), true, "yesterday must be disabled");
  assert.equal(await page.getAttribute('#pop-dates [data-day="2026-11-24"]', "class").then((c) => c.includes("is-today")), true);
  await page.close();
});

test("default stay starts today when today is a friday", async () => {
  const page = await openHotels({ now: new Date(2026, 10, 27, 9, 0) }); // fri 27 nov
  assert.equal(await page.inputValue('[name="checkin"]'), "2026-11-27");
  assert.equal(await page.inputValue('[name="checkout"]'), "2026-11-29");
  await page.close();
});

test("hovering the calendar keeps keyboard focus on a day", async () => {
  const page = await openHotels();
  await page.click('[data-field="checkin"] button');
  const days = page.locator("#pop-dates [data-day]:not([disabled])");
  await days.nth(3).click();
  await days.nth(4).focus();
  await days.nth(8).hover();
  assert.equal(await page.evaluate(() => Boolean(document.activeElement?.dataset.day)), true);
  await page.close();
});

test("clicking check-out while picking keeps the calendar open", async () => {
  const page = await openHotels();
  await page.click('[data-field="checkin"] button');
  await page.locator("#pop-dates [data-day]:not([disabled])").nth(3).click();
  await page.click('[data-field="checkout"] button');
  assert.equal(await page.isVisible("#pop-dates"), true);
  assert.equal(await page.getAttribute('[data-field="checkout"] button', "aria-expanded"), "true");
  assert.equal(await page.getAttribute('[data-field="checkin"] button', "aria-expanded"), "false");
  await page.close();
});

test("a strip field opens its picker even if it was already open", async () => {
  const page = await openHotels();
  await page.click('[data-field="dest"] button');
  await page.mouse.wheel(0, 1600);
  await page.waitForFunction(() => document.querySelector("[data-stuck]").classList.contains("is-on"));
  await page.click('[data-stuck-field="dest"]');
  await page.waitForTimeout(700);
  assert.equal(await page.isVisible("#pop-dest"), true);
  await page.close();
});

test("tabbing out of a picker closes it", async () => {
  const page = await openHotels();
  await page.click('[data-field="guests"] button');
  await page.focus('[data-f-search]');
  await page.waitForTimeout(50);
  assert.equal(await page.isHidden("#pop-guests"), true);
  await page.close();
});

test("destination list is a listbox with an active option", async () => {
  const page = await openHotels();
  await page.click('[data-field="dest"] button');
  assert.equal(await page.getAttribute("[data-dest-list]", "role"), "listbox");
  await page.keyboard.press("ArrowDown");
  const active = await page.getAttribute("#pop-dest input", "aria-activedescendant");
  assert.ok(active, "input must point at the active option");
  assert.equal(await page.getAttribute(`#${active}`, "aria-selected"), "true");
  await page.close();
});

test("calendar has a single tab stop", async () => {
  const page = await openHotels();
  await page.click('[data-field="checkin"] button');
  const stops = await page.$$eval('#pop-dates [data-day]:not([disabled])', (b) => b.filter((x) => x.tabIndex === 0).length);
  assert.equal(stops, 1);
  await page.close();
});

test("dragging out of the filters dialog does not close it", async () => {
  const page = await openHotels();
  await page.click("[data-open-filters]");
  await page.evaluate(() => {
    const d = document.querySelector("#hotel-filters");
    d.querySelector(".fx-check").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    d.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 5, clientY: 5 }));
  });
  assert.equal(await page.evaluate(() => document.querySelector("#hotel-filters").open), true);
  await page.close();
});

test("min price slider cannot cross or hide under max", async () => {
  const page = await openHotels();
  await page.click("[data-open-filters]");
  const state = await page.evaluate(() => {
    const min = document.querySelector("[data-price-min]");
    const max = document.querySelector("[data-price-max]");
    min.value = 5000000; // no focus on purpose (e.g. Safari)
    min.dispatchEvent(new Event("input", { bubbles: true }));
    return { min: Number(min.value), max: Number(max.value), minZ: Number(getComputedStyle(min).zIndex) || 0, maxZ: Number(getComputedStyle(max).zIndex) || 0 };
  });
  assert.equal(state.max, 5000000);
  assert.equal(state.min, 4950000);
  assert.ok(state.minZ > state.maxZ, "min thumb must be on top near the right end");
  await page.close();
});

test("currency labels use the code everywhere", async () => {
  const page = await openHotels();
  await page.click("[data-open-filters]");
  await page.selectOption("[data-currency]", "USD");
  assert.match(await page.textContent("[data-price-max-out]"), /^USD /);
  await page.click("[data-filters-apply]");
  assert.match(await page.textContent(".fx-price__amt"), /^USD /);
  await page.close();
});

test("every facility matches at least one sample hotel", () => {
  const html = readFileSync(new URL("../hotels.html", import.meta.url), "utf8");
  const js = readFileSync(new URL("../src/hotel-filters.js", import.meta.url), "utf8");
  const names = [...js.matchAll(/"([^"]+)"/g)].map((m) => m[1]).slice(0, 200);
  const list = js.slice(js.indexOf("FACILITIES = ["), js.indexOf("];", js.indexOf("FACILITIES = [")));
  const facilities = [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  const used = new Set([...html.matchAll(/data-facilities="([^"]+)"/g)].flatMap((m) => m[1].split(" ")));
  assert.ok(names.length && facilities.length === 46);
  assert.deepEqual(facilities.filter((f) => !used.has(f)), []);
});
