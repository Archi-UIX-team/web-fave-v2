import "./fave-tokens.css";
import "./navbar.css";
import "./fave-pages.css";
import "./fave-hotels.css";
import "./fave-view-cities.css";
import "./fave-city.css";
import "./fave-upcoming.css";
import "./fave-offer-detail.css";
import "./fave-hotels-mobile.css";

document.documentElement.classList.add("js");

// hotels page only: booking pickers and the all-filters pop-up
const bookingRoots = document.querySelectorAll("[data-booking]");
if (bookingRoots.length) import("./booking.js").then((m) => m.initBooking(bookingRoots));
const mapRoot = document.querySelector("[data-map]")?.closest("[data-filter-scope]");
if (mapRoot) import("./city-map.js").then((m) => m.initCityMap(mapRoot));
const filterRoot = document.querySelector("[data-open-filters]")?.closest("[data-filter-scope]");
if (filterRoot) import("./hotel-filters.js").then((m) => { m.initHotelFilters(filterRoot); m.initSelectMenus(filterRoot); });

/* ---------- navbar (same behaviour as before) ---------- */
const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-toggle");
const setMenu = (open) => {
  header?.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
  menuButton?.setAttribute("aria-expanded", String(open));
  menuButton?.setAttribute("aria-label", open ? "Close menu" : "Open menu");
};
menuButton?.addEventListener("click", () => setMenu(!header.classList.contains("is-open")));
document.querySelectorAll(".page-mobile-nav a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !header?.classList.contains("is-open")) return;
  setMenu(false);
  menuButton?.focus();
});

/* ---------- scroll reveal ---------- */
// A fully clipped element (data-r="clip") never reports as intersecting,
// so clip reveals are triggered by their parent element instead.
const revealTargets = new Map();
const reveal = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    (revealTargets.get(entry.target) || []).forEach((el) => el.classList.add("in"));
    reveal.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll("[data-r]").forEach((el) => {
  const watch = el.dataset.r === "clip" ? el.parentElement : el;
  if (!revealTargets.has(watch)) revealTargets.set(watch, []);
  revealTargets.get(watch).push(el);
  reveal.observe(watch);
});

/* ---------- filter + search + show more ----------
  <section data-filter-scope data-f-limit="12">
    <input data-f-search>              free-text search over each item's text
    <select data-f-select="city">      matches item data-city (space separated)
    <div data-f-chips="region"><button data-value="all">  single-choice chips
    <select data-f-sort>               option values: name, price, date, ending
    <p data-f-count>                   "showing x of y"
    <div data-f-list> ... <article data-item data-city="bali" ...>
    <button data-f-more>               reveals the next batch
  Optional on the scope:
    data-f-page-size="8" + <nav data-f-pager>   numbered pages (aston style) instead of show-more
    data-f-count-format="displaying {shown} of {total} available {noun}"   count wording
*/
const toDatasetKey = (name) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
document.querySelectorAll("[data-filter-scope]").forEach((scope) => {
  const list = scope.querySelector("[data-f-list]");
  const items = [...scope.querySelectorAll("[data-item]")];
  const step = Number(scope.dataset.fLimit) || Infinity;
  let limit = step;
  const search = scope.querySelector("[data-f-search]");
  const selects = [...scope.querySelectorAll("[data-f-select]")];
  const chipGroups = [...scope.querySelectorAll("[data-f-chips]")];
  const sort = scope.querySelector("[data-f-sort]");
  const count = scope.querySelector("[data-f-count]");
  const more = scope.querySelector("[data-f-more]");
  const progress = scope.querySelector("[data-f-progress]");
  const empty = scope.querySelector("[data-f-empty]");
  const noun = scope.dataset.fNoun || "items";
  const pageSize = Number(scope.dataset.fPageSize) || 0;
  const pager = scope.querySelector("[data-f-pager]");
  const countFormat = scope.dataset.fCountFormat;
  let page = 1;

  // 1 2 3 … 10 with prev/next, like the aston pager
  const pageList = (pages) => {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    const near = [page - 1, page, page + 1].filter((p) => p > 1 && p < pages);
    const list = [1, ...near, pages];
    return list.flatMap((p, i) => (i && p - list[i - 1] > 1 ? ["…", p] : [p]));
  };
  const renderPager = (pages) => {
    if (!pager) return;
    pager.hidden = pages <= 1;
    const icon = (id) => `<svg class="fx-ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;
    pager.innerHTML = `<button type="button" data-goto="${page - 1}" aria-label="Previous page"${page <= 1 ? " disabled" : ""}>${icon("arrow-left")}</button>${pageList(pages).map((p) => (p === "…" ? '<span aria-hidden="true">…</span>' : `<button type="button" data-goto="${p}"${p === page ? ' class="is-on" aria-current="page"' : ""}>${p}</button>`)).join("")}<button type="button" data-goto="${page + 1}" aria-label="Next page"${page >= pages ? " disabled" : ""}>${icon("arrow")}</button>`;
  };
  pager?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-goto]");
    if (!btn || btn.disabled) return;
    page = Number(btn.dataset.goto);
    apply();
    list.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const active = () => {
    const filters = {};
    selects.forEach((s) => { filters[s.dataset.fSelect] = s.value; });
    chipGroups.forEach((g) => { filters[g.dataset.fChips] = g.querySelector(".is-on")?.dataset.value || "all"; });
    return filters;
  };

  const apply = () => {
    const q = (search?.value || "").trim().toLowerCase();
    const filters = active();
    const matched = items.filter((item) => {
      if (q && !item.textContent.toLowerCase().includes(q)) return false;
      if (typeof scope.fxExtra === "function" && !scope.fxExtra(item)) return false;
      // data-f-select="room-type" must read data-room-type, i.e. dataset.roomType
      return Object.entries(filters).every(([key, value]) =>
        value === "all" || (item.dataset[toDatasetKey(key)] || "").split(" ").includes(value));
    });
    items.forEach((item) => { item.hidden = !matched.includes(item); item.classList.remove("is-capped"); });
    let first = 0;
    let shown;
    if (pageSize) {
      const pages = Math.max(1, Math.ceil(matched.length / pageSize));
      page = Math.min(Math.max(1, page), pages);
      first = (page - 1) * pageSize;
      matched.forEach((item, i) => item.classList.toggle("is-capped", i < first || i >= first + pageSize));
      shown = Math.max(0, Math.min(pageSize, matched.length - first));
      renderPager(pages);
    } else {
      matched.forEach((item, i) => item.classList.toggle("is-capped", i >= limit));
      shown = Math.min(matched.length, limit);
    }
    const word = (n) => (n === 1 ? noun.replace(/s$/, "") : noun).replace(/storie$/, "story");
    if (count && countFormat) {
      count.textContent = countFormat.replace("{shown}", shown).replace("{total}", matched.length).replace("{noun}", word(matched.length));
    } else if (count) count.textContent = matched.length ? `showing ${shown === matched.length ? matched.length : `1-${shown}`} of ${matched.length} ${word(matched.length)}` : `no ${noun} found`;
    if (more) more.hidden = shown >= matched.length;
    if (progress) progress.style.width = `${matched.length ? (shown / matched.length) * 100 : 0}%`;
    const moreLabel = scope.querySelector("[data-f-more-label]");
    if (moreLabel) moreLabel.textContent = `showing ${shown} of ${matched.length} ${noun}`;
    if (empty) empty.hidden = matched.length > 0;
    // reveal anything newly shown
    matched.slice(first, first + shown).forEach((item) => item.classList.add("in"));
  };

  const resetAndApply = () => { limit = step; page = 1; apply(); };
  search?.addEventListener("input", resetAndApply);
  selects.forEach((s) => s.addEventListener("change", resetAndApply));
  chipGroups.forEach((group) => group.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-value]");
    if (!chip) return;
    group.querySelectorAll("[data-value]").forEach((c) => {
      c.classList.toggle("is-on", c === chip);
      c.setAttribute("aria-pressed", String(c === chip));
    });
    resetAndApply();
  }));
  sort?.addEventListener("change", () => {
    const key = sort.value;
    const value = (item) => item.dataset[toDatasetKey(key)] ?? "";
    const numeric = items.every((item) => value(item) === "" || !Number.isNaN(Number(value(item))));
    const sorted = [...items].sort((a, b) => {
      if (key === "default") return Number(a.dataset.order) - Number(b.dataset.order);
      return numeric ? Number(value(a)) - Number(value(b)) : value(a).localeCompare(value(b));
    });
    sorted.forEach((item) => list.append(item));
    items.splice(0, items.length, ...sorted);
    apply();
  });
  more?.addEventListener("click", () => { limit += step; apply(); });
  scope.addEventListener("fx:refresh", resetAndApply);
  items.forEach((item, i) => { item.dataset.order = i; });
  apply();
});

/* ---------- search forms that only filter the page (all cities) ---------- */
document.querySelectorAll("form.fx-csearch").forEach((form) => form.addEventListener("submit", (e) => {
  e.preventDefault();
  form.querySelector("[data-f-search]")?.dispatchEvent(new Event("input"));
}));

/* ---------- hotels by room feature (view page) ----------
  <section data-feature-split data-feature-max="6">
    <button data-feature="city-view">   feature list (one is .is-on)
    <article data-feature-card data-facilities="...">   cards; up to max shown per feature
*/
document.querySelectorAll("[data-feature-split]").forEach((sec) => {
  const buttons = [...sec.querySelectorAll("[data-feature]")];
  const cards = [...sec.querySelectorAll("[data-feature-card]")];
  const max = Number(sec.dataset.featureMax) || 6;
  const show = (btn) => {
    buttons.forEach((b) => { b.classList.toggle("is-on", b === btn); b.setAttribute("aria-pressed", String(b === btn)); });
    let n = 0;
    cards.forEach((card) => {
      const match = (card.dataset.facilities || "").split(" ").includes(btn.dataset.feature) && n < max;
      if (match) n += 1;
      card.hidden = !match;
      if (match) card.classList.add("in");
    });
  };
  buttons.forEach((b) => b.addEventListener("click", () => show(b)));
  show(buttons.find((b) => b.classList.contains("is-on")) || buttons[0]);
});

/* ---------- upcoming hotels: fold per region on phones (aston) ---------- */
const phone = window.matchMedia("(max-width: 600px)");
const ugroups = [...document.querySelectorAll("[data-ugroup]")];
// regions start folded only when this script runs (without it every list stays visible)
ugroups.slice(1).forEach((g) => g.classList.add("is-closed"));
const syncUgroups = () => ugroups.forEach((g) => {
  const btn = g.querySelector(".fx-ugroup__h");
  const list = g.querySelector(".fx-ugroup__l");
  if (phone.matches) {
    btn.setAttribute("aria-expanded", String(!g.classList.contains("is-closed")));
    btn.setAttribute("aria-controls", list.id);
    btn.tabIndex = 0;
  } else {
    // on larger screens every list is shown, so the header is not a control
    btn.removeAttribute("aria-expanded");
    btn.removeAttribute("aria-controls");
    btn.tabIndex = -1;
  }
});
ugroups.forEach((g) => g.querySelector(".fx-ugroup__h").addEventListener("click", () => {
  if (!phone.matches) return;
  g.classList.toggle("is-closed");
  syncUgroups();
}));
phone.addEventListener("change", syncUgroups);
syncUgroups();

/* ---------- regions accordion ---------- */
document.querySelectorAll("[data-acc]").forEach((region) => {
  const head = region.querySelector("[data-acc-head]");
  head?.addEventListener("click", () => {
    const closed = region.classList.toggle("is-closed");
    head.setAttribute("aria-expanded", String(!closed));
  });
});

/* ---------- carousel ---------- */
document.querySelectorAll("[data-car]").forEach((car) => {
  const track = car.querySelector("[data-car-track]");
  const prev = car.querySelector("[data-car-prev]");
  const next = car.querySelector("[data-car-next]");
  const counter = car.querySelector("[data-car-count]");
  const pageSize = () => {
    const first = track.firstElementChild;
    if (!first) return 1;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const columns = Math.max(1, Math.round((track.clientWidth + gap) / (first.offsetWidth + gap)));
    // a track laid out in 2 rows (phone 2x2 grid) shows columns x rows cards per page
    const rows = new Set([...track.children].map((c) => c.offsetTop)).size || 1;
    return columns * rows;
  };
  const update = () => {
    const per = pageSize();
    const pages = Math.max(1, Math.ceil(track.children.length / per));
    // Map the scroll position onto the page count, so the end of the track is
    // always the last page even when the cards do not divide evenly.
    const maxScroll = track.scrollWidth - track.clientWidth;
    const page = maxScroll > 0 ? Math.round((track.scrollLeft / maxScroll) * (pages - 1)) + 1 : 1;
    if (counter && car.dataset.carCount === "items") {
      // aston style: last card of the current page / total ("4 / 8"), counted by whole pages
      const total = track.children.length;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      const pageIndex = atEnd ? pages - 1 : Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      counter.textContent = `${Math.min(total, (pageIndex + 1) * per)} / ${total}`;
    } else if (counter) counter.textContent = `${page} / ${pages}`;
    if (prev) prev.disabled = track.scrollLeft < 4;
    if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  // a 2-row track fills column by column; reorder each group of 4 so a page
  // reads left to right like aston: [1 2 / 3 4] instead of [1 3 / 2 4]
  const readRowFirst = () => {
    const twoRows = getComputedStyle(track).gridTemplateRows.trim().split(/\s+/).length === 2;
    [...track.children].forEach((c, i) => {
      c.style.order = twoRows ? String(i - (i % 4) + [0, 2, 1, 3][i % 4]) : "";
    });
  };
  readRowFirst();
  window.addEventListener("resize", readRowFirst);
  prev?.addEventListener("click", () => track.scrollBy({ left: -track.clientWidth, behavior: "smooth" }));
  next?.addEventListener("click", () => track.scrollBy({ left: track.clientWidth, behavior: "smooth" }));
  track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  window.addEventListener("resize", update);
  update();
});

/* ---------- venue photo gallery ---------- */
document.querySelectorAll("[data-gal]").forEach((gal) => {
  const imgs = [...gal.querySelectorAll("img")];
  const count = gal.querySelector("[data-gal-count]");
  const dots = gal.querySelector("[data-gal-dots]");
  let index = 0;
  if (dots) dots.innerHTML = imgs.map(() => "<i></i>").join("");
  count?.setAttribute("aria-live", "polite");
  const show = (i) => {
    index = (i + imgs.length) % imgs.length;
    imgs.forEach((img, n) => {
      img.classList.toggle("is-on", n === index);
      if (n === index) img.removeAttribute("aria-hidden"); else img.setAttribute("aria-hidden", "true");
    });
    dots?.querySelectorAll("i").forEach((d, n) => d.classList.toggle("is-on", n === index));
    if (count) count.textContent = `${index + 1} / ${imgs.length}`;
  };
  gal.querySelector("[data-gal-prev]")?.addEventListener("click", () => show(index - 1));
  gal.querySelector("[data-gal-next]")?.addEventListener("click", () => show(index + 1));
  show(0);
});

/* ---------- news pager (visual only until real articles exist) ---------- */
document.querySelectorAll("[data-pager]").forEach((pager) => {
  pager.addEventListener("click", (e) => {
    let btn = e.target.closest("button[data-page]");
    if (!btn) return;
    if (btn.dataset.page === "next") {
      const pages = [...pager.querySelectorAll("button[data-page]:not([data-page=next])")];
      const current = pages.findIndex((b) => b.classList.contains("is-on"));
      btn = pages[Math.min(current + 1, pages.length - 1)];
    }
    pager.querySelectorAll("button[data-page]").forEach((b) => {
      b.classList.toggle("is-on", b === btn);
      if (b === btn) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
  });
});

/* ---------- offer / detail page: tabs, copy code, read-more ---------- */
document.querySelectorAll("[data-tabs]").forEach((wrap) => {
  const tabs = [...wrap.querySelectorAll('[role="tab"]')];
  const panels = [...wrap.querySelectorAll('[role="tabpanel"]')];
  const select = (i) => {
    tabs.forEach((t, n) => t.setAttribute("aria-selected", String(n === i)));
    panels.forEach((p, n) => { p.hidden = n !== i; });
  };
  tabs.forEach((t, i) => t.addEventListener("click", () => select(i)));
  select(tabs.findIndex((t) => t.getAttribute("aria-selected") === "true") < 0 ? 0 : tabs.findIndex((t) => t.getAttribute("aria-selected") === "true"));
});
document.querySelectorAll("[data-copy]").forEach((btn) => {
  const label = btn.querySelector("span");
  const original = label?.textContent;
  btn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(btn.dataset.copy); } catch (e) { /* clipboard unavailable */ }
    btn.classList.add("is-done");
    if (label) label.textContent = "copied";
    setTimeout(() => { btn.classList.remove("is-done"); if (label) label.textContent = original; }, 1600);
  });
});
document.querySelectorAll("[data-readmore]").forEach((btn) => {
  const target = document.getElementById(btn.getAttribute("aria-controls"));
  if (!target) return;
  target.classList.add("is-clamped");
  btn.addEventListener("click", () => {
    const clamped = target.classList.toggle("is-clamped");
    btn.setAttribute("aria-expanded", String(!clamped));
    btn.textContent = clamped ? "read more" : "read less";
  });
});

/* ---------- footer ---------- */
const pillars = document.querySelector(".fx-foot__pillars");
document.querySelector("[data-toggle-pillars]")?.addEventListener("click", (e) => {
  const closed = pillars.classList.toggle("is-closed");
  e.currentTarget.setAttribute("aria-expanded", String(!closed));
});
// duplicate the brand logos once so the marquee loops without a gap
const brandTrack = document.querySelector(".fx-foot__brands-track");
if (brandTrack) {
  [...brandTrack.children].forEach((img) => {
    const copy = img.cloneNode(true);
    copy.alt = "";
    copy.setAttribute("aria-hidden", "true");
    brandTrack.append(copy);
  });
}
document.querySelector("[data-back-top]")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
