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
  dialog.querySelector("[data-filters-apply]").addEventListener("click", () => {
    applied = readForm();
    const n = activeCount(applied);
    badge.textContent = n;
    badge.hidden = n === 0;
    openBtn.classList.toggle("is-on", n > 0);
    paintCards(applied.currency);
    scope.dispatchEvent(new Event("fx:refresh"));
    dialog.close();
  });

  paintPrice();
}
