/*
  "all filters" pop-up for the hotels list: price range, currency and facilities.
  Hooks into the generic filter engine in fave-pages.js through
  scope.fxExtra (an extra item test) and the "fx:refresh" event.
*/

const FACILITIES = [
  "Balcony/Terrace", "Bathrobes", "Bathtub", "Beach View", "Bunk Bed", "Capsule Coffee Machine",
  "City View", "Dining Area", "Executive Lounge Access", "Extra Bed Available", "Family Bed",
  "Floating Breakfast", "Garden View", "Google Assistance", "Hair Dryer", "Hollywood Twin Bed",
  "In-Room Safe", "International TV Channels", "Iron & Ironing Board", "Jacuzzi", "King Bed",
  "Kitchenette", "Lagoon View", "LED TV", "Minibar", "Mountain View", "Non-Smoking Room",
  "Ocean View", "Pool Access", "Pool View", "Private Pool", "Queen / King Bed", "Queen Bed",
  "Refrigerator", "Shower", "Shower Tub", "Single Bed", "Smart TV", "Smoking Room",
  "Tea / Coffee Maker", "Toiletries", "Twin Bed", "Walk-In Closet", "Wellness", "Wi-Fi", "Writing Desk",
];
export const facilitySlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// PLACEHOLDER exchange rates for display only. Replace with live rates from
// the booking engine before launch.
const SAMPLE_RATES = { IDR: 1, USD: 1 / 16000, SGD: 1 / 12000, MYR: 1 / 3600 };
const MAX_IDR = 5000000;
const STEP_IDR = 50000;

const money = (idr, cur) => {
  const v = idr * SAMPLE_RATES[cur];
  return Math.round(v).toLocaleString("en-US");
};
// keep acronyms uppercase while the rest of the label follows the lowercase rule
const label = (name) => name.toLowerCase().replace(/\b(tv|led)\b/g, (m) => `<span class="fx-proper">${m.toUpperCase()}</span>`);

/*
  Aston-style dropdown menus ("all cities", "sort by"). Each wraps a visually hidden
  native <select>, which stays the source of truth for the filter engine; the listbox
  mirrors it. Add data-cdd-proper to keep option casing (city names).
*/
export function initSelectMenus(scope) {
  scope.querySelectorAll("[data-cdd]").forEach((wrap) => initSelectMenu(scope, wrap));
}

function initSelectMenu(scope, wrap) {
  const select = wrap.querySelector("select");
  const btn = wrap.querySelector(".fx-cdd__btn");
  const label = btn.querySelector("[data-cdd-label]");
  const menu = wrap.querySelector(".fx-cdd__menu");
  const proper = wrap.hasAttribute("data-cdd-proper");
  // option ids are built from the menu id, so every menu needs a unique one
  if (!menu.id) menu.id = `cdd-menu-${document.querySelectorAll(".fx-cdd__menu[id^='cdd-menu-']").length + 1}`;
  btn.setAttribute("aria-controls", menu.id);
  const fallback = select.options[0].value;
  menu.innerHTML = [...select.options].map((o, i) => `<li class="fx-cdd__opt${proper && o.value !== fallback ? " fx-proper" : ""}" role="option" id="${menu.id}-opt-${i}" data-value="${o.value}" aria-selected="${o.selected}"><span>${o.textContent}</span><svg class="fx-ico" aria-hidden="true"><use href="#i-check"/></svg></li>`).join("");
  const opts = [...menu.children];
  let focus = -1;

  const sync = () => {
    // a value with no matching option falls back to the first option
    if (!select.selectedOptions.length) {
      select.value = fallback;
      select.dispatchEvent(new Event("change"));
      return;
    }
    const current = select.selectedOptions[0];
    label.textContent = current.textContent;
    label.classList.toggle("fx-proper", proper && current.value !== fallback);
    opts.forEach((o) => o.setAttribute("aria-selected", String(o.dataset.value === select.value)));
  };
  const setFocus = (i) => {
    focus = (i + opts.length) % opts.length;
    opts.forEach((o, n) => o.classList.toggle("is-focus", n === focus));
    btn.setAttribute("aria-activedescendant", opts[focus].id);
    opts[focus].scrollIntoView({ block: "nearest" });
  };
  const toggle = (show) => {
    menu.hidden = !show;
    btn.setAttribute("aria-expanded", String(show));
    if (show) setFocus(Math.max(0, opts.findIndex((o) => o.dataset.value === select.value)));
    else btn.removeAttribute("aria-activedescendant");
  };
  const choose = (opt) => {
    select.value = opt.dataset.value;
    select.dispatchEvent(new Event("change"));
    toggle(false);
    btn.focus();
  };
  btn.addEventListener("click", () => toggle(menu.hidden));
  btn.addEventListener("keydown", (e) => {
    const open = !menu.hidden;
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      if (!open) toggle(true); else setFocus(focus + (e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Home" && open) { e.preventDefault(); setFocus(0); }
    else if (e.key === "End" && open) { e.preventDefault(); setFocus(opts.length - 1); }
    else if ((e.key === "Enter" || e.key === " ") && open) { e.preventDefault(); choose(opts[focus]); }
    else if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); toggle(false); }
  });
  // keep focus on the button while clicking an option, so blur does not close the menu first
  menu.addEventListener("pointerdown", (e) => e.preventDefault());
  menu.addEventListener("click", (e) => { const o = e.target.closest(".fx-cdd__opt"); if (o) choose(o); });
  document.addEventListener("pointerdown", (e) => { if (!menu.hidden && !wrap.contains(e.target)) toggle(false); });
  btn.addEventListener("blur", (e) => { if (!wrap.contains(e.relatedTarget)) toggle(false); });
  // the booking form and others change the select directly
  select.addEventListener("change", sync);
  // popular destination cards pick their city in the list below
  if (select.dataset.fSelect === "city") document.querySelectorAll("[data-pick-city]").forEach((card) => card.addEventListener("click", () => {
    scope.querySelector('[data-f-chips="country"] [data-value="indonesia"]:not(.is-on)')?.click();
    // a city pick replaces any earlier search (e.g. a hotel name from the booking form)
    const search = scope.querySelector("[data-f-search]");
    if (search?.value) { search.value = ""; search.dispatchEvent(new Event("input")); }
    select.value = card.dataset.pickCity;
    select.dispatchEvent(new Event("change"));
  }));
  sync();
}

export function initHotelFilters(scope) {
  const dialog = document.querySelector("#hotel-filters");
  const openBtn = scope.querySelector("[data-open-filters]");
  if (!dialog || !openBtn) return;
  const badge = openBtn.querySelector("[data-filter-badge]");
  const minR = dialog.querySelector("[data-price-min]");
  const maxR = dialog.querySelector("[data-price-max]");
  const minOut = dialog.querySelector("[data-price-min-out]");
  const maxOut = dialog.querySelector("[data-price-max-out]");
  const fill = dialog.querySelector("[data-price-fill]");
  const currency = dialog.querySelector("[data-currency]");
  const list = dialog.querySelector("[data-facilities]");

  [minR, maxR].forEach((r) => { r.min = 0; r.max = MAX_IDR; r.step = STEP_IDR; });
  list.innerHTML = FACILITIES.map((f) => `<label class="fx-check"><input type="checkbox" value="${facilitySlug(f)}"><span>${label(f)}</span></label>`).join("");
  const boxes = [...list.querySelectorAll("input")];

  let applied = { min: 0, max: MAX_IDR, currency: "IDR", facilities: [] };

  const readForm = () => ({
    min: Number(minR.value),
    max: Number(maxR.value),
    currency: currency.value,
    facilities: boxes.filter((b) => b.checked).map((b) => b.value),
  });
  const writeForm = (s) => {
    minR.value = s.min;
    maxR.value = s.max;
    currency.value = s.currency;
    boxes.forEach((b) => { b.checked = s.facilities.includes(b.value); });
    paintPrice();
  };
  // `moved` is the slider the user is moving; the other one gives way.
  // (Deciding by focus fails in browsers where clicking a slider does not focus it.)
  const paintPrice = (moved) => {
    if (Number(minR.value) > Number(maxR.value) - STEP_IDR) {
      if (moved === maxR) maxR.value = Number(minR.value) + STEP_IDR;
      else minR.value = Number(maxR.value) - STEP_IDR;
    }
    // keep the thumb that can still move on top, so a thumb pushed to an end can be grabbed again
    const minOnTop = moved === minR || (moved !== maxR && Number(minR.value) > MAX_IDR / 2);
    minR.style.zIndex = minOnTop ? "3" : "2";
    maxR.style.zIndex = minOnTop ? "2" : "3";
    const cur = currency.value;
    minOut.textContent = `${cur} ${money(Number(minR.value), cur)}`;
    maxOut.textContent = `${cur} ${money(Number(maxR.value), cur)}${Number(maxR.value) >= MAX_IDR ? "+" : ""}`;
    fill.style.left = `${(minR.value / MAX_IDR) * 100}%`;
    fill.style.right = `${100 - (maxR.value / MAX_IDR) * 100}%`;
    minR.setAttribute("aria-valuetext", minOut.textContent);
    maxR.setAttribute("aria-valuetext", maxOut.textContent);
  };
  minR.addEventListener("input", () => paintPrice(minR));
  maxR.addEventListener("input", () => paintPrice(maxR));
  minR.addEventListener("pointerdown", () => paintPrice(minR));
  maxR.addEventListener("pointerdown", () => paintPrice(maxR));
  currency.addEventListener("input", () => paintPrice());

  const activeCount = (s) => (s.min > 0 || s.max < MAX_IDR ? 1 : 0) + s.facilities.length;
  const paintCards = (cur) => {
    scope.querySelectorAll("[data-item]").forEach((card) => {
      const amt = card.querySelector(".fx-price__amt");
      if (amt) amt.textContent = `${cur} ${money(Number(card.dataset.price), cur)}`;
    });
  };

  // extra test used by the filter engine
  scope.fxExtra = (item) => {
    const price = Number(item.dataset.price);
    if (price < applied.min || (applied.max < MAX_IDR && price > applied.max)) return false;
    const has = (item.dataset.facilities || "").split(" ");
    return applied.facilities.every((f) => has.includes(f));
  };

  openBtn.addEventListener("click", () => {
    writeForm(applied);
    dialog.showModal();
    openBtn.setAttribute("aria-expanded", "true");
  });
  dialog.addEventListener("close", () => openBtn.setAttribute("aria-expanded", "false"));
  // a click on the dimmed backdrop closes without applying. A drag that starts
  // inside (slider, text selection) and ends outside must not count.
  let pressedOutside = false;
  const outside = (e) => {
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  dialog.addEventListener("pointerdown", (e) => { pressedOutside = e.target === dialog && outside(e); });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog && pressedOutside && outside(e)) dialog.close();
    pressedOutside = false;
  });
  dialog.querySelector("[data-filters-close]").addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-filters-reset]").addEventListener("click", () => {
    writeForm({ min: 0, max: MAX_IDR, currency: currency.value, facilities: [] });
  });
  const paintBadge = () => {
    const n = activeCount(applied);
    badge.textContent = n;
    badge.hidden = n === 0;
    openBtn.classList.toggle("is-on", n > 0);
  };
  dialog.querySelector("[data-filters-apply]").addEventListener("click", () => {
    applied = readForm();
    paintBadge();
    paintCards(applied.currency);
    scope.dispatchEvent(new Event("fx:refresh"));
    dialog.close();
  });

  // room-feature cards on the hotels page apply one facility filter in place
  document.querySelectorAll("[data-pick-facility]").forEach((card) => card.addEventListener("click", () => {
    const search = scope.querySelector("[data-f-search]");
    if (search?.value) { search.value = ""; search.dispatchEvent(new Event("input")); }
    applied = { ...applied, facilities: [card.dataset.pickFacility] };
    paintBadge();
    paintCards(applied.currency);
    scope.dispatchEvent(new Event("fx:refresh"));
  }));

  // filters the page starts with, e.g. the city view page: data-f-preset-facilities="city-view"
  const preset = (scope.dataset.fPresetFacilities || "").split(" ").filter(Boolean);
  if (preset.length) {
    applied = { ...applied, facilities: preset };
    paintBadge();
    scope.dispatchEvent(new Event("fx:refresh"));
  }

  paintPrice();
}
