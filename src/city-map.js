/*
  City page map panel (a placeholder, not a real map).
  Keeps the pins in step with the hotel list and makes the zoom buttons work.
*/
export function initCityMap(scope) {
  const map = scope.querySelector("[data-map]");
  if (!map) return;
  const canvas = map.querySelector(".fx-map__canvas");
  const pins = [...map.querySelectorAll("[data-pin-for]")];
  const places = [...map.querySelectorAll("[data-place-for]")];
  const items = [...scope.querySelectorAll("[data-item]")];

  // the canvas is the picture; its label lists what the pins show
  const label = () => {
    const shown = pins.filter((p) => !p.hidden).map((p) => `${p.dataset.place} from ${p.dataset.price} per night`);
    canvas.setAttribute("aria-label", shown.length
      ? `Sample map of fave hotels: ${shown.join(", ")}.`
      : "Sample map: no hotels match the current filters.");
  };

  const sync = () => {
    const visible = new Set(items.filter((i) => !i.hidden && !i.classList.contains("is-capped")).map((i) => i.dataset.name));
    pins.forEach((p) => { p.hidden = !visible.has(p.dataset.pinFor); });
    places.forEach((p) => { p.hidden = !visible.has(p.dataset.placeFor); });
    label();
  };

  // zoom the placeholder canvas, so the controls do something real
  let zoom = 1;
  const setZoom = (next) => {
    zoom = Math.min(1.8, Math.max(1, Number(next.toFixed(2))));
    canvas.style.scale = String(zoom);
    map.querySelector("[data-zoom-in]").disabled = zoom >= 1.8;
    map.querySelector("[data-zoom-out]").disabled = zoom <= 1;
  };
  map.querySelector("[data-zoom-in]")?.addEventListener("click", () => setZoom(zoom + 0.2));
  map.querySelector("[data-zoom-out]")?.addEventListener("click", () => setZoom(zoom - 0.2));
  setZoom(1);

  // these listeners are added after the filter engine's, so the list is already
  // filtered by the time sync() runs
  scope.addEventListener("fx:refresh", sync);
  [scope.querySelector("[data-f-search]"), ...scope.querySelectorAll("[data-f-select]")]
    .forEach((el) => el?.addEventListener(el.tagName === "SELECT" ? "change" : "input", sync));
  sync();
}
