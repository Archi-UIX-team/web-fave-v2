import "./fave-tokens.css";
import "./navbar.css";
import "./fave-pages.css";

document.documentElement.classList.add("js");

/* ---------- navbar (same behaviour as before) ---------- */
const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-toggle");
const setMenu = (open) => {
  header?.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
  menuButton?.setAttribute("aria-expanded", String(open));
};
menuButton?.addEventListener("click", () => setMenu(!header.classList.contains("is-open")));
document.querySelectorAll(".page-mobile-nav a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

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
*/
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
      return Object.entries(filters).every(([key, value]) =>
        value === "all" || (item.dataset[key] || "").split(" ").includes(value));
    });
    items.forEach((item) => { item.hidden = !matched.includes(item); item.classList.remove("is-capped"); });
    matched.forEach((item, i) => item.classList.toggle("is-capped", i >= limit));
    const shown = Math.min(matched.length, limit);
    const word = (n) => (n === 1 ? noun.replace(/s$/, "") : noun).replace(/storie$/, "story");
    if (count) count.textContent = matched.length ? `showing ${shown === matched.length ? matched.length : `1-${shown}`} of ${matched.length} ${word(matched.length)}` : `no ${noun} found`;
    if (more) more.hidden = shown >= matched.length;
    if (progress) progress.style.width = `${matched.length ? (shown / matched.length) * 100 : 0}%`;
    const moreLabel = scope.querySelector("[data-f-more-label]");
    if (moreLabel) moreLabel.textContent = `showing ${shown} of ${matched.length} ${noun}`;
    if (empty) empty.hidden = matched.length > 0;
    // reveal anything newly shown
    matched.slice(0, shown).forEach((item) => item.classList.add("in"));
  };

  const resetAndApply = () => { limit = step; apply(); };
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
    const value = (item) => item.dataset[key] ?? "";
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
  items.forEach((item, i) => { item.dataset.order = i; });
  apply();
});

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
    return Math.max(1, Math.round((track.clientWidth + gap) / (first.offsetWidth + gap)));
  };
  const update = () => {
    const per = pageSize();
    const pages = Math.max(1, Math.ceil(track.children.length / per));
    const page = Math.min(pages, Math.round(track.scrollLeft / Math.max(1, track.clientWidth)) + 1);
    if (counter) counter.textContent = `${page} / ${pages}`;
    if (prev) prev.disabled = track.scrollLeft < 4;
    if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
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
  const show = (i) => {
    index = (i + imgs.length) % imgs.length;
    imgs.forEach((img, n) => img.classList.toggle("is-on", n === index));
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
