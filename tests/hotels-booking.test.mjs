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
  // Default to the branded Edge/Chrome channel, but allow pointing at a
  // specific Chromium binary (e.g. the one pre-installed in CI/cloud
  // containers) via PW_EXECUTABLE_PATH, which takes precedence over PW_CHANNEL.
  const executablePath = process.env.PW_EXECUTABLE_PATH;
  if (executablePath) {
    browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
  } else {
    const channel = process.env.PW_CHANNEL || "msedge";
    browser = await chromium.launch({ channel });
  }
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

test("book now switches back to the Indonesia chip so the chosen city shows", async () => {
  const page = await openHotels();
  await page.click('[data-f-chips="country"] [data-value="overseas"]');
  await chooseDest(page, "Bali");
  await page.click('.fx-bar button[type="submit"]');
  assert.match(await count(page), /of 2 hotels/);
  assert.equal(await page.getAttribute('[data-f-chips="country"] [data-value="indonesia"]', "aria-pressed"), "true");
  await page.close();
});

test("choosing Malaysia shows no Indonesian hotels", async () => {
  const page = await openHotels();
  await chooseDest(page, "Malaysia");
  await page.click('.fx-bar button[type="submit"]');
  assert.match(await count(page), /^no hotels found/);
  assert.equal(await page.getAttribute('[data-f-chips="country"] [data-value="overseas"]', "aria-pressed"), "true");
  await page.close();
});

test("choose your stay has only Indonesia and Overseas chips, Indonesia on", async () => {
  const page = await openHotels();
  const chips = await page.$$eval('[data-f-chips] [data-value]', (b) => b.map((x) => `${x.dataset.value}:${x.getAttribute("aria-pressed")}`));
  assert.deepEqual(chips, ["indonesia:true", "overseas:false"]);
  await page.close();
});

test("city dropdown lists cities and filters the hotels", async () => {
  const page = await openHotels();
  await page.click(".fx-cdd__btn");
  assert.equal(await page.isVisible("#city-listbox"), true);
  assert.equal(await page.getAttribute(".fx-cdd__btn", "aria-expanded"), "true");
  await page.click('#city-listbox [data-value="jakarta"]');
  assert.equal(await page.isHidden("#city-listbox"), true);
  assert.equal((await page.textContent("[data-cdd-label]")).trim(), "Jakarta");
  assert.match(await count(page), /of 2 hotels/);
  // keyboard: open, move to "all cities", choose
  await page.focus(".fx-cdd__btn");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  assert.equal((await page.textContent("[data-cdd-label]")).trim(), "all cities");
  await page.close();
});

test("change next to lowest rates opens a floating booking form that applies", async () => {
  const page = await openHotels();
  await page.locator("[data-change-booking]").scrollIntoViewIfNeeded();
  await page.click("[data-change-booking]");
  assert.equal(await page.isVisible("#float-booking"), true);
  // the floating form must be on top of the hotel cards
  assert.equal(await page.evaluate(() => {
    const b = document.querySelector('#float-booking [data-field="checkin"] button');
    const r = b.getBoundingClientRect();
    return b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  }), true, "floating form is covered");
  await page.click('#float-booking [data-field="checkin"] button');
  assert.equal(await page.evaluate(() => document.querySelector("#float-booking").contains(document.querySelector("#pop-dates"))), true, "calendar opens inside the floating form");
  assert.equal(await page.isHidden("#pop-dates .fx-pop__head"), true, "phone-only sheet header stays hidden on desktop");
  const days = page.locator("#pop-dates [data-day]:not([disabled])");
  await days.nth(14).click();
  await page.locator("#pop-dates [data-day]:not([disabled])").nth(17).click();
  await page.click("#pop-dates [data-cal-apply]");
  const range = (await page.textContent('[data-out="range"]')).trim();
  await page.click('#float-booking button[type="submit"]');
  assert.equal(await page.isHidden("#float-booking"), true);
  assert.equal((await page.textContent('[data-out="range"]')).trim(), range);
  assert.equal(await page.inputValue('.fx-hero [name="checkin"]'), await page.inputValue('#float-booking [name="checkin"]'), "both forms share the dates");
  await page.close();
});

test("on phones a picker from the floating form is a bottom sheet over everything", async () => {
  const page = await openHotels({ width: 390, height: 844 });
  await page.locator("[data-change-booking]").scrollIntoViewIfNeeded();
  await page.click("[data-change-booking]");
  await page.click('#float-booking [data-field="checkin"] button');
  const sheet = await page.evaluate(() => {
    const p = document.querySelector("#pop-dates");
    const r = p.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + 30);
    return { bottom: Math.round(r.bottom), vh: innerHeight, onTop: p.contains(top) };
  });
  assert.ok(Math.abs(sheet.bottom - sheet.vh) <= 2, `sheet bottom ${sheet.bottom} vs viewport ${sheet.vh}`);
  assert.equal(sheet.onTop, true, "sheet must not be covered (e.g. by the navbar)");
  await page.close();
});

test("a destination card clears an old search", async () => {
  const page = await openHotels();
  await page.fill("[data-f-search]", "braga");
  await page.click('[data-pick-city="jakarta"]');
  assert.match(await count(page), /of 2 hotels/);
  assert.equal(await page.inputValue("[data-f-search]"), "");
  await page.close();
});

test("city listbox survives a value it does not list", async () => {
  const page = await openHotels();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => {
    const s = document.querySelector('[data-f-select="city"]');
    s.value = "atlantis";
    s.dispatchEvent(new Event("change"));
  });
  assert.deepEqual(errors, []);
  assert.equal((await page.textContent("[data-cdd-label]")).trim(), "all cities");
  await page.close();
});

test("space chooses a city and keeps the menu closed", async () => {
  const page = await openHotels();
  await page.focus(".fx-cdd__btn");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press(" ");
  await page.waitForTimeout(100);
  assert.equal(await page.isHidden("#city-listbox"), true);
  assert.equal((await page.textContent("[data-cdd-label]")).trim(), "Jakarta");
  await page.close();
});

test("escape in the filters pop-up does not also close the floating form", async () => {
  const page = await openHotels();
  await page.locator("[data-change-booking]").scrollIntoViewIfNeeded();
  await page.click("[data-change-booking]");
  await page.focus("[data-open-filters]");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.querySelector("#hotel-filters").open), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => document.querySelector("#hotel-filters").open), false);
  assert.equal(await page.isVisible("#float-booking"), true);
  await page.close();
});

test("no stuck booking strip under the navbar", async () => {
  const page = await openHotels();
  assert.equal(await page.locator("[data-stuck], .fx-stuck").count(), 0);
  await page.close();
});

test("pick your view has 5 cards and room features has no description", async () => {
  const page = await openHotels();
  assert.equal(await page.locator(".fx-vrow--5 .fx-tile").count(), 5);
  assert.equal(await page.locator('[aria-labelledby="rooms-title"] .fx-lead').count(), 0);
  await page.close();
});

test("popular destinations page through 4 cards at a time", async () => {
  const page = await openHotels();
  const counter = page.locator('[aria-labelledby="dest-title"] [data-car-count]');
  await counter.scrollIntoViewIfNeeded();
  assert.equal((await counter.textContent()).trim(), "4 / 8");
  await page.evaluate(() => { const t = document.querySelector(".fx-destrow"); t.style.scrollBehavior = "auto"; t.scrollLeft = t.scrollWidth; });
  await page.waitForFunction(() => document.querySelector('[aria-labelledby="dest-title"] [data-car-count]').textContent.trim() === "8 / 8");
  // a destination card filters the hotel list to that city
  await page.click('[data-pick-city="lombok"]');
  assert.match(await count(page), /of 1 hotel$/);
  await page.close();
});

/* ---------- linked pages: city view (view.html) and all cities (cities.html) ---------- */
const openPage = async (name, { width = 1440, height = 900 } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/${name}.html`, { waitUntil: "networkidle" });
  page.errors = errors;
  return page;
};

test("hotels page links: city card -> view.html, see all cities -> cities.html", async () => {
  const page = await openHotels();
  assert.equal(await page.getAttribute('[aria-labelledby="views-title"] .fx-tile >> nth=0', "href"), "view.html");
  assert.equal(await page.getAttribute('[aria-labelledby="dest-title"] a.fx-btn', "href"), "cities.html");
  await page.click('[aria-labelledby="views-title"] .fx-tile >> nth=0');
  await page.waitForURL(/view\.html$/);
  assert.match(await page.title(), /^city view hotels/);
  await page.close();
});

test("city view page: city view filter preset, numbered pages, feature list", async () => {
  const page = await openPage("view");
  await page.waitForFunction(() => document.querySelector("[data-filter-badge]") && !document.querySelector("[data-filter-badge]").hidden);
  assert.equal((await page.textContent("[data-filter-badge]")).trim(), "1");
  assert.equal((await page.textContent("#all-hotels [data-f-count]")).trim(), "displaying 8 of 9 available hotels");
  // every visible card has city view
  const fac = await page.$$eval("#all-hotels .fx-hcard:not([hidden]):not(.is-capped)", (c) => c.map((x) => x.dataset.facilities.includes("city-view")));
  assert.ok(fac.length === 8 && fac.every(Boolean));
  // page 2
  await page.click('#all-hotels [data-f-pager] [data-goto="2"]');
  assert.equal((await page.textContent("#all-hotels [data-f-count]")).trim(), "displaying 1 of 9 available hotels");
  assert.equal(await page.getAttribute('#all-hotels [data-f-pager] [aria-current="page"]', "data-goto"), "2");
  // sort menu
  await page.click("#all-hotels .fx-cdd__btn");
  await page.click('#sort-listbox [data-value="price"]');
  const prices = await page.$$eval("#all-hotels .fx-hcard:not([hidden]):not(.is-capped)", (c) => c.map((x) => Number(x.dataset.price)));
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  // feature list: city view is on; picking garden view shows only garden-view hotels
  assert.equal(await page.getAttribute('[data-feature="city-view"]', "aria-pressed"), "true");
  const visibleCards = () => page.$$eval("[data-feature-card]", (c) => c.filter((x) => x.offsetParent !== null).map((x) => x.dataset.facilities));
  assert.equal((await visibleCards()).length, 6, "city view shows at most 6 cards");
  await page.click('[data-feature="garden-view"]');
  const shown = await visibleCards();
  assert.ok(shown.length > 0 && shown.length <= 6 && shown.every((f) => f.includes("garden-view")), JSON.stringify(shown.length));
  assert.equal((await page.textContent(".desktop-nav [aria-current]")).trim(), "hotel");
  assert.deepEqual(page.errors, []);
  await page.close();
});

test("city view page: booking change form and reset of the preset filter", async () => {
  const page = await openPage("view");
  await page.locator("[data-change-booking]").scrollIntoViewIfNeeded();
  await page.click("[data-change-booking]");
  assert.equal(await page.isVisible("#float-booking"), true);
  await page.click('#float-booking button[type="submit"]');
  assert.equal(await page.isHidden("#float-booking"), true);
  await page.fill("#all-hotels [data-f-search]", "");
  await page.click("[data-open-filters]");
  await page.click("[data-filters-reset]");
  await page.click("[data-filters-apply]");
  assert.equal((await page.textContent("#all-hotels [data-f-count]")).trim(), "displaying 8 of 16 available hotels");
  await page.close();
});

test("all cities page: count, search, overseas", async () => {
  const page = await openPage("cities");
  const count = () => page.textContent("[data-f-count]").then((t) => t.trim());
  assert.equal(await count(), "31 destinations · A–Z");
  await page.fill("[data-f-search]", "ja");
  await page.click(".fx-csearch button");
  const names = await page.$$eval(".fx-ccard:not([hidden]) .fx-ccard__n", (n) => n.map((x) => x.textContent));
  assert.ok(names.includes("Jakarta") && names.every((n) => true));
  assert.equal(await count(), `${names.length} destinations · A–Z`);
  await page.fill("[data-f-search]", "");
  await page.click('[data-f-chips="country"] [data-value="overseas"]');
  assert.equal(await count(), "2 destinations · A–Z");
  await page.fill("[data-f-search]", "zzz");
  assert.equal(await page.isVisible("[data-f-empty]"), true);
  assert.equal((await page.textContent(".fx-ccard__r >> nth=0")).trim().length > 0, true);
  assert.deepEqual(page.errors, []);
  await page.close();
});

test("new pages have no sideways scroll on phones", async () => {
  for (const name of ["view", "cities"]) {
    const page = await openPage(name, { width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name);
    await page.close();
  }
});

/* ---------- single city page (city.html) ---------- */
test("Bali card links to city.html, which lists that city's hotels", async () => {
  const page = await openHotels();
  const bali = page.locator('[aria-labelledby="dest-title"] .fx-tile').first();
  assert.equal(await bali.getAttribute("href"), "city.html");
  assert.equal(await bali.getAttribute("data-pick-city"), null, "a card with its own page must not also filter");
  await page.close();

  const city = await openPage("city");
  assert.match(await city.title(), /^hotels in bali/);
  assert.equal((await city.textContent("#all-hotels [data-f-count]")).trim(), "displaying 2 of 2 available hotels in Bali");
  const names = await city.$$eval(".fx-rowcard:not([hidden])", (c) => c.map((x) => x.dataset.city));
  assert.deepEqual(names, ["bali", "bali"]);
  // the booking bar has no destination field (the city is fixed)
  assert.equal(await city.locator('[data-field="dest"]').count(), 0);
  assert.equal(await city.locator('.fx-hero [data-field="checkin"]').isVisible(), true);
  // map pins match the hotels in the list
  const pins = await city.$$eval(".fx-map__pin", (p) => p.map((x) => x.textContent.trim()));
  const prices = await city.$$eval(".fx-rowcard", (c) => c.map((x) => `IDR ${Math.round(Number(x.dataset.price) / 1000)}K / night`));
  assert.deepEqual(pins, prices, JSON.stringify(pins));
  // search and the filters dialog still work here
  await city.fill("[data-f-search]", "seminyak");
  assert.equal((await city.textContent("#all-hotels [data-f-count]")).trim(), "displaying 1 of 1 available hotel in Bali");
  await city.fill("[data-f-search]", "");
  await city.click("[data-change-booking]");
  assert.equal(await city.isVisible("#float-booking"), true);
  assert.deepEqual(city.errors, []);
  await city.close();
});

test("city page: map sticks, pins follow the list, cards fill, search kept", async () => {
  const page = await openPage("city");
  // nothing between the map and the page may be a scroll container, or sticky is dead
  const blockers = await page.evaluate(() => {
    const out = [];
    for (let el = document.querySelector(".fx-map").parentElement; el; el = el.parentElement) {
      const s = getComputedStyle(el);
      if (["hidden", "auto", "scroll"].includes(s.overflowY) && el !== document.documentElement) {
        out.push(`${el.tagName}.${el.className} overflow-y:${s.overflowY}`);
      }
    }
    return out;
  });
  assert.deepEqual(blockers, [], "a clipping ancestor stops the map sticking");
  // with a long list the map stays in view while the rows scroll past
  const sticky = await page.evaluate(async () => {
    const list = document.querySelector(".fx-rowlist");
    const card = list.querySelector(".fx-rowcard");
    for (let i = 0; i < 8; i++) list.append(card.cloneNode(true));
    const map = document.querySelector(".fx-map");
    window.scrollTo({ top: document.querySelector("#all-hotels").getBoundingClientRect().top + scrollY + 700, behavior: "instant" });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { position: getComputedStyle(map).position, top: Math.round(map.getBoundingClientRect().top) };
  });
  assert.equal(sticky.position, "sticky");
  assert.ok(sticky.top >= 0, `map scrolled out of view (top ${sticky.top})`);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  // pins follow the visible list
  const visiblePins = () => page.$$eval(".fx-map__pin", (p) => p.filter((x) => x.offsetParent !== null).map((x) => x.textContent.trim()));
  assert.equal((await visiblePins()).length, 2);
  await page.fill("[data-f-search]", "seminyak");
  await page.waitForTimeout(150);
  const pins = await visiblePins();
  assert.equal(pins.length, 1, pins.join(","));
  assert.match(pins[0], /610K/);
  // book now keeps what the visitor typed
  await page.locator('.fx-hero button[type="submit"]').click();
  await page.waitForTimeout(200);
  assert.equal(await page.inputValue("[data-f-search]"), "seminyak");
  await page.fill("[data-f-search]", "");

  // the row card photo fills the whole card
  const fill = await page.evaluate(() => {
    const card = document.querySelector(".fx-rowcard");
    return { card: Math.round(card.getBoundingClientRect().height), photo: Math.round(card.querySelector(".fx-media").getBoundingClientRect().height) };
  });
  assert.equal(fill.photo, fill.card, JSON.stringify(fill));

  // the map's own controls are reachable, and its description is readable
  const a11y = await page.evaluate(() => ({
    mapRole: document.querySelector(".fx-map").getAttribute("role"),
    canvasRole: document.querySelector(".fx-map__canvas").getAttribute("role"),
    label: document.querySelector('.fx-map [role="img"]').getAttribute("aria-label"),
    buttons: [...document.querySelectorAll(".fx-map button")].map((b) => b.getAttribute("aria-label") || b.textContent.trim()),
  }));
  assert.notEqual(a11y.mapRole, "img", "role=img on the panel hides its buttons");
  assert.equal(a11y.canvasRole, "img");
  assert.match(a11y.label, /545K/, "the label names the prices");
  assert.deepEqual(a11y.buttons, ["Zoom in", "Zoom out"]);
  // zoom does something
  const zoom = await page.evaluate(async () => {
    const canvas = document.querySelector(".fx-map__canvas");
    const before = getComputedStyle(canvas).scale;
    document.querySelector('.fx-map button[aria-label="Zoom in"]').click();
    await new Promise((r) => setTimeout(r, 50));
    return [before, getComputedStyle(canvas).scale];
  });
  assert.notEqual(zoom[0], zoom[1], `scale did not change (${zoom.join(" -> ")})`);
  assert.deepEqual(page.errors, []);
  await page.close();
});

test("booking bar field dividers stay visible on the violet bar", async () => {
  const page = await openHotels();
  const seen = await page.evaluate(() => {
    const fld = document.querySelectorAll(".fx-hero .fx-bar .fx-fld")[1];
    const bar = getComputedStyle(document.querySelector(".fx-hero .fx-bar")).backgroundColor;
    return { border: getComputedStyle(fld).borderLeftColor, bar };
  });
  // a 50% violet-500 divider over a violet-500 bar composites to the bar colour
  assert.notEqual(seen.border, "rgba(118, 27, 71, 0.5)", "divider is invisible on the new bar colour");
  assert.notEqual(seen.border, seen.bar);
  await page.close();
});

test("phone: city page stacks the list above the map", async () => {
  const page = await openPage("city", { width: 390, height: 844 });
  const list = await page.locator(".fx-rowlist").boundingBox();
  const map = await page.locator(".fx-map").boundingBox();
  assert.ok(map.y > list.y, "map comes after the list");
  const card = await page.locator(".fx-rowcard").first().boundingBox();
  const photo = await page.locator(".fx-rowcard .fx-media").first().boundingBox();
  assert.ok(photo.width > card.width * 0.9, "photo is full width on phones");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.close();
});

/* ---------- room feature page (room.html) + revised room-feature cards ---------- */
test("hotels page room-feature cards: 4 cards, kitchenette links to room.html", async () => {
  const page = await openHotels();
  const cards = await page.$$eval('[aria-labelledby="rooms-title"] .fx-tile', (t) => t.map((x) => ({
    label: x.querySelector(".fx-label__t").textContent.trim(),
    href: x.getAttribute("href"),
    pick: x.dataset.pickFacility || null,
  })));
  assert.deepEqual(cards.map((c) => c.label), ["balcony / terrace", "bathtub", "kitchenette", "private pool"]);
  const kit = cards.find((c) => c.label === "kitchenette");
  assert.equal(kit.href, "room.html");
  assert.equal(kit.pick, null);
  // the other three filter the all-hotels list in place
  for (const c of cards.filter((c) => c.label !== "kitchenette")) assert.equal(c.href, "#all-hotels");
  // clicking bathtub applies that facility and sets the badge
  await page.click('[data-pick-facility="bathtub"]');
  await page.waitForTimeout(150);
  assert.equal((await page.textContent("[data-filter-badge]")).trim(), "1");
  const shown = await page.$$eval("#all-hotels .fx-hcard:not([hidden])", (c) => c.map((x) => x.dataset.facilities.includes("bathtub")));
  assert.ok(shown.length > 0 && shown.every(Boolean), JSON.stringify(shown.length));
  await page.close();
});

test("each room-feature card count matches the hotels it filters to", async () => {
  const page = await openHotels();
  const cards = await page.$$eval('[aria-labelledby="rooms-title"] .fx-tile', (tiles) => tiles.map((x) => ({
    facility: x.dataset.pickFacility || "kitchenette",
    count: Number(x.querySelector(".fx-label__s").textContent.match(/\d+/)[0]),
  })));
  const have = await page.$$eval("#all-hotels .fx-hcard", (hc) => hc.map((x) => x.dataset.facilities.split(" ")));
  for (const c of cards) {
    const actual = have.filter((f) => f.includes(c.facility)).length;
    assert.equal(c.count, actual, `${c.facility}: card says ${c.count}, data has ${actual}`);
  }
  await page.close();
});

test("room.html lists kitchenette hotels with show-more and no feature index", async () => {
  const page = await openPage("room");
  assert.match(await page.title(), /^hotels with kitchenettes/);
  await page.waitForFunction(() => document.querySelector("[data-filter-badge]") && !document.querySelector("[data-filter-badge]").hidden);
  assert.equal((await page.textContent("[data-filter-badge]")).trim(), "1");
  assert.equal((await page.textContent("#all-hotels [data-f-count]")).trim(), "displaying 7 of 7 available hotels");
  const fac = await page.$$eval("#all-hotels .fx-hcard:not([hidden]):not(.is-capped)", (c) => c.map((x) => x.dataset.facilities.includes("kitchenette")));
  assert.ok(fac.length === 7 && fac.every(Boolean), JSON.stringify(fac.length));
  assert.equal(await page.locator("[data-f-more]").count(), 1, "uses show-more, not a pager");
  assert.equal(await page.locator("[data-f-pager]").count(), 0);
  assert.equal(await page.locator("[data-feature-split]").count(), 0, "no room-feature index section");
  // the change booking form still works here
  await page.locator("[data-change-booking]").scrollIntoViewIfNeeded();
  await page.click("[data-change-booking]");
  assert.equal(await page.isVisible("#float-booking"), true);
  assert.deepEqual(page.errors, []);
  await page.close();
});

/* ---------- upcoming page (upcoming.html) ---------- */
test("upcoming.html is a coming-soon teaser linked from the upcoming list", async () => {
  const hotels = await openHotels();
  const kl = await hotels.evaluate(() => [...document.querySelectorAll("[data-ugroup] a")].find((a) => /kuala lumpur/i.test(a.textContent))?.getAttribute("href"));
  assert.equal(kl, "upcoming.html");
  await hotels.close();

  const page = await openPage("upcoming");
  assert.match(await page.title(), /coming soon to kuala lumpur/);
  assert.match((await page.textContent(".fx-up-hero h1")).trim(), /^a new fave is coming to kuala lumpur$/i);
  assert.equal((await page.textContent(".fx-up-lock__city")).trim(), "Kuala Lumpur");
  assert.equal(await page.getAttribute('.fx-up-hero a.fx-btn', "href"), "hotels.html");
  assert.ok((await page.locator(".fx-up-card").count()) >= 2, "discover strip has cards");
  // the hero photo has empty alt (decorative) so it is not announced
  assert.equal(await page.getAttribute(".fx-up-hero__bg", "alt"), "");
  assert.deepEqual(page.errors, []);
  await page.close();
});

test("the five card/button links from the hotels page resolve", async () => {
  const page = await openHotels();
  const got = await page.evaluate(() => ({
    city: document.querySelector('[aria-labelledby="views-title"] .fx-tile').getAttribute("href"),
    kitchenette: [...document.querySelectorAll('[aria-labelledby="rooms-title"] .fx-tile')].find((a) => a.textContent.includes("kitchenette")).getAttribute("href"),
    seeAll: document.querySelector('[aria-labelledby="dest-title"] a.fx-btn').getAttribute("href"),
    bali: document.querySelector('[aria-labelledby="dest-title"] .fx-tile').getAttribute("href"),
    upcoming: [...document.querySelectorAll('[data-ugroup] a')].find((a) => /kuala lumpur/i.test(a.textContent)).getAttribute("href"),
  }));
  assert.deepEqual(got, { city: "view.html", kitchenette: "room.html", seeAll: "cities.html", bali: "city.html", upcoming: "upcoming.html" });
  // each target is a real built page (200)
  for (const name of ["view", "room", "cities", "city", "upcoming"]) {
    const r = await page.request.get(`${base}/${name}.html`);
    assert.equal(r.status(), 200, name);
  }
  await page.close();
});

/* ---------- look: bar colour, borders, patterns ---------- */
test("booking bars use violet-500 and region borders use violet-400", async () => {
  for (const name of ["hotels", "view", "city"]) {
    const page = await openPage(name);
    const bar = await page.evaluate(() => getComputedStyle(document.querySelector(".fx-bar")).backgroundColor);
    assert.equal(bar, "rgb(118, 27, 71)", `${name} booking bar`);
    await page.close();
  }
  const page = await openHotels();
  const borders = await page.evaluate(() => ({
    upcoming: getComputedStyle(document.querySelector(".fx-ugroup__l")).borderTopColor,
    region: getComputedStyle(document.querySelector(".fx-region__item")).borderTopColor,
  }));
  assert.equal(borders.upcoming, "rgb(145, 73, 108)");
  assert.equal(borders.region, "rgb(145, 73, 108)");
  await page.close();
});

test("patterns: 3 discs per page, 2 in the footer, no gradient over them", async () => {
  for (const name of ["hotels", "view", "cities", "city", "offers", "news"]) {
    const page = await openPage(name);
    const info = await page.evaluate(() => ({
      top: document.querySelectorAll(".fx-pattern-top .fx-disc").length,
      foot: document.querySelectorAll(".fx-foot__pattern .fx-disc").length,
      topOverlay: getComputedStyle(document.querySelector(".fx-pattern-top"), "::after").content,
      footOverlay: getComputedStyle(document.querySelector(".fx-foot__pattern"), "::after").content,
    }));
    assert.equal(info.top, 3, `${name} top discs`);
    assert.equal(info.foot, 2, `${name} footer discs`);
    assert.equal(info.topOverlay, "none", `${name} pattern overlay`);
    assert.equal(info.footOverlay, "none", `${name} footer overlay`);
    await page.close();
  }
});

test("footer discs sit in the bottom corners", async () => {
  const page = await openHotels();
  const pos = await page.evaluate(() => {
    const wrap = document.querySelector(".fx-foot__pattern").getBoundingClientRect();
    return [...document.querySelectorAll(".fx-foot__pattern .fx-disc")].map((d) => {
      const r = d.getBoundingClientRect();
      return { left: r.left < wrap.left + wrap.width / 2, bottomPast: r.bottom > wrap.bottom };
    });
  });
  assert.equal(pos.length, 2);
  assert.equal(pos[0].left, true, "first disc on the left");
  assert.equal(pos[1].left, false, "second disc on the right");
  assert.ok(pos.every((p) => p.bottomPast), "both reach past the bottom edge");
  await page.close();
});

/* ---------- phone layout (aston mobile) ---------- */
test("phone: hotels page follows the aston mobile layout", async () => {
  const page = await openPage("hotels", { width: 390, height: 844 });
  const box = (sel) => page.locator(sel).first().boundingBox();
  // booking: check-in and check-out side by side, destination full width
  const [ci, co, dest] = [await box('.fx-hero [data-field="checkin"]'), await box('.fx-hero [data-field="checkout"]'), await box('.fx-hero [data-field="dest"]')];
  assert.equal(Math.round(ci.y), Math.round(co.y));
  assert.ok(dest.width > ci.width * 1.8);
  // pick your view: 2 columns, pool (5th) full width in third place
  const tiles = await page.$$eval(".fx-vrow--5 .fx-tile", (t) => t.map((x) => { const r = x.getBoundingClientRect(); return { y: Math.round(r.y), w: Math.round(r.width), label: x.querySelector(".fx-label__t").textContent }; }));
  const pool = tiles.find((t) => t.label === "pool");
  const city = tiles.find((t) => t.label === "city");
  const mountain = tiles.find((t) => t.label === "mountain");
  assert.ok(pool.w > city.w * 1.8 && pool.y > city.y && pool.y < mountain.y, JSON.stringify(tiles));
  // room features: 2 columns
  const rf = await page.$$eval(".fx-rgrid .fx-tile", (t) => t.slice(0, 2).map((x) => Math.round(x.getBoundingClientRect().y)));
  assert.equal(rf[0], rf[1]);
  // popular destinations: 2 x 2, row first, counter 4 / 8
  const d = await page.$$eval(".fx-destrow .fx-tile", (t) => t.map((x) => { const r = x.getBoundingClientRect(); return [x.querySelector(".fx-label__t").textContent, Math.round(r.x), Math.round(r.y)]; }));
  const at = (n) => d.find((x) => x[0] === n);
  assert.ok(at("Bali")[2] === at("Jakarta")[2] && at("Jakarta")[1] > at("Bali")[1], "Bali and Jakarta share the top row");
  assert.ok(at("Yogyakarta")[2] > at("Bali")[2] && at("Yogyakarta")[1] === at("Bali")[1], "Yogyakarta under Bali");
  assert.equal((await page.textContent('[aria-labelledby="dest-title"] [data-car-count]')).trim(), "4 / 8");
  // filters: Indonesia | overseas, all filters | all cities as half-width pairs
  const [indo, over, allf, cities] = [await box('[data-value="indonesia"]'), await box('[data-value="overseas"]'), await box("[data-open-filters]"), await box(".fx-cdd__btn")];
  assert.equal(Math.round(indo.y), Math.round(over.y));
  assert.equal(Math.round(allf.y), Math.round(cities.y));
  assert.ok(Math.abs(indo.width - allf.width) < 2);
  // upcoming hotels: first region open, others folded; tapping opens one
  const groups = page.locator("[data-ugroup]");
  assert.equal(await groups.nth(0).locator(".fx-ugroup__l").isVisible(), true);
  assert.equal(await groups.nth(1).locator(".fx-ugroup__l").isVisible(), false);
  await groups.nth(1).locator(".fx-ugroup__h").click();
  assert.equal(await groups.nth(1).locator(".fx-ugroup__l").isVisible(), true);
  assert.equal(await groups.nth(1).locator(".fx-ugroup__h").getAttribute("aria-expanded"), "true");
  // browse by region: 2 columns
  const rc = await page.$$eval(".fx-rcols .fx-region", (r) => r.map((x) => Math.round(x.getBoundingClientRect().y)));
  assert.equal(rc[0], rc[1]);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(page.errors, []);
  await page.close();
});

test("desktop: upcoming hotel lists all show and headers are not controls", async () => {
  const page = await openHotels();
  const vis = await page.$$eval("[data-ugroup] .fx-ugroup__l", (l) => l.every((x) => x.offsetParent !== null));
  assert.equal(vis, true);
  assert.equal(await page.getAttribute("[data-ugroup] >> nth=1 >> .fx-ugroup__h", "tabindex"), "-1");
  assert.equal(await page.getAttribute("[data-ugroup] >> nth=1 >> .fx-ugroup__h", "aria-expanded"), null, "no expand state announced on desktop");
  await page.close();
});

test("phone: upcoming regions stay readable without the page script", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${base}/hotels.html`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("[data-ugroup] >> nth=1 >> .fx-ugroup__l").isVisible(), true);
  await page.close();
});

test("phone: destinations snap and count by whole pages", async () => {
  const page = await openPage("hotels", { width: 390, height: 844 });
  const snaps = await page.$$eval(".fx-destrow > *", (c) => c.map((x) => getComputedStyle(x).scrollSnapAlign));
  assert.deepEqual(snaps.map((s) => s !== "none"), [true, false, false, false, true, false, false, false], snaps.join(","));
  // half a page in: counter still names a page boundary
  const counts = await page.evaluate(async () => {
    const t = document.querySelector(".fx-destrow");
    t.style.scrollBehavior = "auto";
    t.style.scrollSnapType = "none";
    const out = [];
    for (const f of [0.3, 0.6]) {
      t.scrollLeft = (t.scrollWidth - t.clientWidth) * f;
      t.dispatchEvent(new Event("scroll"));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      out.push(document.querySelector('[aria-labelledby="dest-title"] [data-car-count]').textContent.trim());
    }
    return out;
  });
  assert.ok(counts.every((c) => c === "4 / 8" || c === "8 / 8"), counts.join(","));
  // a last page of 3 still reads left to right
  const order = await page.evaluate(() => {
    const t = document.querySelector(".fx-destrow");
    t.lastElementChild.remove();
    window.dispatchEvent(new Event("resize"));
    return [...t.children].slice(4).map((c) => c.style.order);
  });
  assert.deepEqual(order, ["4", "6", "5"]);
  await page.close();
});

test("phone: view and cities pages follow the aston mobile layout", async () => {
  const view = await openPage("view", { width: 390, height: 844 });
  const fi = await view.$$eval(".fx-fi", (b) => b.slice(0, 2).map((x) => Math.round(x.getBoundingClientRect().x)));
  assert.equal(fi[0], fi[1], "feature list is vertical");
  const fg = await view.$$eval("[data-feature-card]", (c) => c.filter((x) => x.offsetParent).slice(0, 2).map((x) => Math.round(x.getBoundingClientRect().y)));
  assert.ok(fg[1] > fg[0], "one hotel per row");
  const rel = await view.$$eval(".fx-rel-card", (c) => c.map((x) => Math.round(x.getBoundingClientRect().y)));
  assert.equal(rel[0], rel[1], "related offers side by side");
  assert.equal(await view.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await view.close();
  const cities = await openPage("cities", { width: 390, height: 844 });
  const input = await cities.locator(".fx-csearch input").boundingBox();
  const btn = await cities.locator(".fx-csearch button").boundingBox();
  assert.ok(input.height >= 44 && Math.abs(input.y + input.height / 2 - (btn.y + btn.height / 2)) < 2, "search box and button side by side");
  const cc = await cities.$$eval(".fx-ccard", (c) => c.slice(0, 2).map((x) => Math.round(x.getBoundingClientRect().y)));
  assert.equal(cc[0], cc[1]);
  await cities.close();
});

test("phone layout does not change offers, news, meetings or weddings", async () => {
  const page = await openPage("offers", { width: 390, height: 844 });
  const cols = await page.evaluate(() => getComputedStyle(document.querySelector(".fx-foot__cols")).flexDirection);
  assert.equal(cols, "row");
  await page.close();
});

test("page background matches the reels section, without the dots", async () => {
  const page = await openHotels();
  const bg = await page.evaluate(() => ({
    color: getComputedStyle(document.body).backgroundColor,
    glow: getComputedStyle(document.body, "::before").backgroundImage,
  }));
  assert.equal(bg.color, "rgb(118, 27, 71)");
  assert.match(bg.glow, /radial-gradient\(62% 58% at 50% 48%/);
  assert.doesNotMatch(bg.glow, /0\.7px/, "no dot pattern");
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
