/*
  Hotels page booking form: destination search, date-range calendar,
  guests/rooms stepper, and the stuck booking strip under the navbar.
  Layout follows the Aston booking pickers; styling is Fave (fave-pages.css).
*/

const DESTINATIONS = [
  { name: "Jakarta", country: "Indonesia", city: "jakarta", group: "indonesia" },
  { name: "Bali", country: "Indonesia", city: "bali", group: "indonesia" },
  { name: "Bandung", country: "Indonesia", city: "bandung", group: "indonesia" },
  { name: "Yogyakarta", country: "Indonesia", city: "yogyakarta", group: "indonesia" },
  { name: "Surabaya", country: "Indonesia", city: "surabaya", group: "indonesia" },
  { name: "Semarang", country: "Indonesia", city: "semarang", group: "indonesia" },
  { name: "Malang", country: "Indonesia", city: "malang", group: "indonesia" },
  { name: "Cikarang", country: "Indonesia", city: "cikarang", group: "indonesia" },
  { name: "Lombok", country: "Indonesia", city: "lombok", group: "indonesia" },
  { name: "Medan", country: "Indonesia", city: "medan", group: "indonesia" },
  { name: "Padang", country: "Indonesia", city: "padang", group: "indonesia" },
  { name: "Palembang", country: "Indonesia", city: "palembang", group: "indonesia" },
  { name: "Banjarmasin", country: "Indonesia", city: "banjarmasin", group: "indonesia" },
  { name: "Makassar", country: "Indonesia", city: "makassar", group: "indonesia" },
  { name: "Malaysia", country: "Overseas", city: "", group: "overseas" },
];
const MAX_NIGHTS = 30;
const LIMITS = { adults: [1, 10], children: [0, 8], rooms: [1, 10] };

const icon = (id) => `<svg class="fx-ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- dates ---------- */
const DAY = 86400000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a, b) => a && b && a.getTime() === b.getTime();
const nights = (a, b) => Math.round((b - a) / DAY);
const fmtShort = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).replace(/^(\w+)/, "$1,");
const fmtLong = (d) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function initBooking(root) {
  const form = root.querySelector("[data-booking-form]");
  const fields = [...root.querySelectorAll("[data-field]")];
  const pops = { dest: root.querySelector("#pop-dest"), dates: root.querySelector("#pop-dates"), guests: root.querySelector("#pop-guests") };
  const today = startOfDay(new Date());
  // default stay: the coming friday to sunday
  const friday = addDays(today, ((5 - today.getDay() + 7) % 7) || 7);

  const state = {
    dest: DESTINATIONS[1],
    start: friday,
    end: addDays(friday, 2),
    guests: { adults: 2, children: 0, rooms: 1 },
  };
  let open = null; // "dest" | "dates" | "guests"
  let opener = null;

  /* ---------- outputs ---------- */
  const guestText = (g = state.guests) => [
    `${g.adults} adult${g.adults > 1 ? "s" : ""}`,
    g.children ? `${g.children} child${g.children > 1 ? "ren" : ""}` : "",
    `${g.rooms} room${g.rooms > 1 ? "s" : ""}`,
  ].filter(Boolean).join(", ");
  const destText = () => (state.dest.group === "indonesia" ? `${state.dest.name}, ${state.dest.country}` : state.dest.name);
  const render = () => {
    document.querySelectorAll('[data-out="dest"]').forEach((el) => { el.textContent = destText(); });
    document.querySelectorAll('[data-out="checkin"]').forEach((el) => { el.textContent = fmtShort(state.start); });
    document.querySelectorAll('[data-out="checkout"]').forEach((el) => { el.textContent = fmtShort(state.end); });
    document.querySelectorAll('[data-out="guests"]').forEach((el) => { el.textContent = guestText(); });
    document.querySelectorAll('[data-out="range"]').forEach((el) => { el.textContent = `${fmtShort(state.start)} - ${fmtShort(state.end)}`; });
    form.querySelector('[name="checkin"]').value = iso(state.start);
    form.querySelector('[name="checkout"]').value = iso(state.end);
    form.querySelector('[name="destination"]').value = destText();
    form.querySelector('[name="guests"]').value = guestText();
  };

  /* ---------- open / close ---------- */
  const fieldFor = (name) => fields.find((f) => f.dataset.field === name);
  const place = (pop, field) => {
    if (window.matchMedia("(max-width: 600px)").matches) { pop.style.left = ""; return; }
    const max = root.clientWidth - pop.offsetWidth;
    pop.style.left = `${Math.max(0, Math.min(field.offsetLeft, max))}px`;
  };
  const close = (returnFocus = true) => {
    if (!open) return;
    pops[open].hidden = true;
    fields.forEach((f) => { f.classList.remove("is-active"); f.querySelector("button").setAttribute("aria-expanded", "false"); });
    document.body.classList.remove("fx-sheet-open");
    if (returnFocus) opener?.focus();
    open = null;
  };
  const openPop = (name, fieldName) => {
    close(false);
    const field = fieldFor(fieldName);
    open = name;
    opener = field.querySelector("button");
    field.classList.add("is-active");
    opener.setAttribute("aria-expanded", "true");
    pops[name].hidden = false;
    document.body.classList.add("fx-sheet-open");
    if (name === "dest") openDest();
    if (name === "dates") openDates(fieldName);
    if (name === "guests") openGuests();
    place(pops[name], field);
  };
  fields.forEach((field) => {
    const name = field.dataset.field;
    const pop = name === "checkin" || name === "checkout" ? "dates" : name;
    field.querySelector("button").addEventListener("click", () => {
      if (open === pop && field.classList.contains("is-active")) close();
      else openPop(pop, name);
    });
  });
  document.addEventListener("pointerdown", (e) => {
    if (open && !pops[open].contains(e.target) && !e.target.closest("[data-field]") && !e.target.closest("[data-stuck]")) close(false);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) { e.stopPropagation(); close(); } });
  window.addEventListener("resize", () => { if (open) place(pops[open], root.querySelector("[data-field].is-active")); });
  root.querySelectorAll("[data-pop-close]").forEach((b) => b.addEventListener("click", () => close()));

  /* ---------- destination ---------- */
  const destSearch = pops.dest.querySelector("input");
  const destList = pops.dest.querySelector("[data-dest-list]");
  const hotelNames = [...document.querySelectorAll(".fx-hcard__name")].map((h) => h.textContent.trim());
  let destItems = [];
  let destIndex = -1;
  const renderDest = () => {
    const q = destSearch.value.trim().toLowerCase();
    const match = (s) => !q || s.toLowerCase().includes(q);
    const cities = DESTINATIONS.filter((d) => match(`${d.name} ${d.country}`));
    const hotels = q ? hotelNames.filter(match).slice(0, 6) : [];
    const group = (title, list, row) => (list.length ? `<p class="fx-dest__group">${title}</p>${list.map(row).join("")}` : "");
    const cityRow = (d) => `<li><button type="button" class="fx-dest__item" data-dest="${esc(d.name)}">${icon("pin")}<span class="fx-dest__name fx-proper">${esc(d.name)}</span><span class="fx-dest__meta fx-proper">${esc(d.country)}</span></button></li>`;
    const hotelRow = (n) => `<li><button type="button" class="fx-dest__item" data-hotel="${esc(n)}">${icon("door")}<span class="fx-dest__name fx-proper">${esc(n)}</span><span class="fx-dest__meta">hotel</span></button></li>`;
    destList.innerHTML = [
      group("indonesia", cities.filter((d) => d.group === "indonesia"), cityRow),
      group("overseas", cities.filter((d) => d.group === "overseas"), cityRow),
      group("hotels", hotels, hotelRow),
    ].join("") || '<li class="fx-dest__empty">no matches. try another city or hotel name.</li>';
    destItems = [...destList.querySelectorAll(".fx-dest__item")];
    destIndex = -1;
  };
  const chooseDest = (btn) => {
    if (btn.dataset.dest) {
      state.dest = DESTINATIONS.find((d) => d.name === btn.dataset.dest);
      state.hotel = "";
    } else {
      state.dest = { name: btn.dataset.hotel, country: "", city: "", group: "hotel" };
      state.hotel = btn.dataset.hotel;
    }
    render();
    close();
  };
  const openDest = () => {
    destSearch.value = "";
    renderDest();
    setTimeout(() => destSearch.focus(), 0);
  };
  destSearch.addEventListener("input", renderDest);
  destSearch.addEventListener("keydown", (e) => {
    if (!destItems.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      destIndex = (destIndex + (e.key === "ArrowDown" ? 1 : -1) + destItems.length) % destItems.length;
      destItems.forEach((b, i) => b.classList.toggle("is-focus", i === destIndex));
      destItems[destIndex].scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter") { e.preventDefault(); chooseDest(destItems[Math.max(destIndex, 0)]); }
  });
  destList.addEventListener("click", (e) => { const b = e.target.closest(".fx-dest__item"); if (b) chooseDest(b); });

  /* ---------- dates ---------- */
  const cal = pops.dates.querySelector("[data-cal]");
  const calNote = pops.dates.querySelector("[data-cal-note]");
  const calApply = pops.dates.querySelector("[data-cal-apply]");
  let draft = { start: null, end: null };
  let picking = "start";
  let viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let hover = null;
  const monthsShown = () => (window.matchMedia("(max-width: 760px)").matches ? 1 : 2);

  const monthGrid = (m) => {
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // monday first
    const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span class="fx-cal__blank"></span>');
    for (let d = 1; d <= days; d++) {
      const date = new Date(m.getFullYear(), m.getMonth(), d);
      const past = date < today;
      const tooLong = draft.start && !draft.end && picking === "end" && nights(draft.start, date) > MAX_NIGHTS;
      const end = draft.end || (picking === "end" && hover > draft.start ? hover : null);
      const cls = ["fx-cal__day",
        sameDay(date, today) && "is-today",
        sameDay(date, draft.start) && "is-start",
        sameDay(date, draft.end) && "is-end",
        draft.start && end && date > draft.start && date < end && "is-range",
        !draft.end && sameDay(date, hover) && picking === "end" && hover > draft.start && "is-hover-end",
      ].filter(Boolean).join(" ");
      const selected = sameDay(date, draft.start) || sameDay(date, draft.end);
      cells.push(`<button type="button" class="${cls}" data-day="${iso(date)}" aria-label="${fmtLong(date)}"${selected ? ' aria-pressed="true"' : ""}${past || tooLong ? " disabled" : ""}>${d}</button>`);
    }
    const title = m.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    return `<div class="fx-cal__month"><p class="fx-cal__title">${title}</p><div class="fx-cal__week" aria-hidden="true"><span>mon</span><span>tue</span><span>wed</span><span>thu</span><span>fri</span><span>sat</span><span>sun</span></div><div class="fx-cal__grid">${cells.join("")}</div></div>`;
  };
  const renderCal = () => {
    const count = monthsShown();
    const months = Array.from({ length: count }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth() + i, 1));
    const atStart = viewMonth <= new Date(today.getFullYear(), today.getMonth(), 1);
    cal.innerHTML = `<button type="button" class="fx-cal__nav fx-cal__nav--prev" data-cal-prev aria-label="Previous month"${atStart ? " disabled" : ""}>${icon("arrow-left")}</button>${months.map(monthGrid).join("")}<button type="button" class="fx-cal__nav fx-cal__nav--next" data-cal-next aria-label="Next month">${icon("arrow")}</button>`;
    if (draft.start && draft.end) {
      const n = nights(draft.start, draft.end);
      calNote.innerHTML = `<strong>${n} night${n > 1 ? "s" : ""}</strong> · ${fmtShort(draft.start)} - ${fmtShort(draft.end)}`;
    } else if (draft.start) {
      calNote.innerHTML = `${fmtShort(draft.start)} - <em>choose check-out</em>`;
    } else {
      calNote.innerHTML = "<em>choose check-in date</em>";
    }
    calApply.disabled = !(draft.start && draft.end);
  };
  const openDates = (fieldName) => {
    draft = { start: state.start, end: state.end };
    picking = fieldName === "checkout" ? "end" : "start";
    if (picking === "end") draft.end = null;
    viewMonth = new Date(state.start.getFullYear(), state.start.getMonth(), 1);
    renderCal();
    setTimeout(() => cal.querySelector(".is-start, .fx-cal__day:not([disabled])")?.focus(), 0);
  };
  cal.addEventListener("click", (e) => {
    if (e.target.closest("[data-cal-prev]")) { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1); renderCal(); return; }
    if (e.target.closest("[data-cal-next]")) { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1); renderCal(); return; }
    const btn = e.target.closest("[data-day]");
    if (!btn || btn.disabled) return;
    const [y, m, d] = btn.dataset.day.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (picking === "start" || !draft.start || date <= draft.start) {
      draft = { start: date, end: null };
      picking = "end";
      fieldFor("checkin").classList.remove("is-active");
      fieldFor("checkout").classList.add("is-active");
    } else {
      draft.end = date;
      picking = "start";
    }
    hover = null;
    renderCal();
    cal.querySelector(`[data-day="${iso(date)}"]`)?.focus();
  });
  cal.addEventListener("pointerover", (e) => {
    const btn = e.target.closest("[data-day]");
    if (picking !== "end" || !btn) return;
    const [y, m, d] = btn.dataset.day.split("-").map(Number);
    const next = new Date(y, m - 1, d);
    if (!sameDay(next, hover)) { hover = next; renderCal(); }
  });
  cal.addEventListener("keydown", (e) => {
    const btn = e.target.closest("[data-day]");
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!btn || !step) return;
    e.preventDefault();
    const [y, m, d] = btn.dataset.day.split("-").map(Number);
    const target = addDays(new Date(y, m - 1, d), step);
    if (target < today) return;
    const lastShown = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + monthsShown(), 0);
    if (target > lastShown || target < viewMonth) { viewMonth = new Date(target.getFullYear(), target.getMonth(), 1); renderCal(); }
    cal.querySelector(`[data-day="${iso(target)}"]`)?.focus();
  });
  pops.dates.querySelector("[data-cal-clear]").addEventListener("click", () => {
    draft = { start: null, end: null };
    picking = "start";
    renderCal();
  });
  calApply.addEventListener("click", () => {
    if (!(draft.start && draft.end)) return;
    state.start = draft.start;
    state.end = draft.end;
    render();
    close();
  });

  /* ---------- guests ---------- */
  let gDraft = { ...state.guests };
  const renderGuests = () => {
    pops.guests.querySelectorAll("[data-count]").forEach((row) => {
      const key = row.dataset.count;
      const [min, maxBase] = LIMITS[key];
      const max = key === "rooms" ? Math.min(maxBase, gDraft.adults) : maxBase;
      row.querySelector("output").textContent = gDraft[key];
      row.querySelector('[data-step="-1"]').disabled = gDraft[key] <= min;
      row.querySelector('[data-step="1"]').disabled = gDraft[key] >= max;
    });
    pops.guests.querySelector("[data-guest-note]").textContent = guestText(gDraft);
  };
  const openGuests = () => {
    gDraft = { ...state.guests };
    renderGuests();
    setTimeout(() => pops.guests.querySelector('[data-step="1"]:not([disabled])')?.focus(), 0);
  };
  pops.guests.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-step]");
    if (!btn) return;
    const key = btn.closest("[data-count]").dataset.count;
    gDraft[key] += Number(btn.dataset.step);
    gDraft.rooms = Math.min(gDraft.rooms, gDraft.adults);
    renderGuests();
  });
  pops.guests.querySelector("[data-guest-done]").addEventListener("click", () => {
    state.guests = { ...gDraft };
    render();
    close();
  });

  /* ---------- submit: show matching hotels ---------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    close(false);
    const scope = document.querySelector("#all-hotels");
    const citySelect = scope?.querySelector('[data-f-select="city"]');
    const search = scope?.querySelector("[data-f-search]");
    if (citySelect && search) {
      search.value = state.hotel || "";
      citySelect.value = !state.hotel && [...citySelect.options].some((o) => o.value === state.dest.city) ? state.dest.city : "all";
      citySelect.dispatchEvent(new Event("change"));
      search.dispatchEvent(new Event("input"));
    }
    scope?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------- stuck strip under the navbar ---------- */
  const strip = document.querySelector("[data-stuck]");
  if (strip) {
    const watch = new IntersectionObserver(([entry]) => {
      const passed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      strip.classList.toggle("is-on", passed);
      strip.inert = !passed;
      if (!passed) strip.setAttribute("aria-hidden", "true"); else strip.removeAttribute("aria-hidden");
    }, { rootMargin: "-90px 0px 0px 0px" });
    watch.observe(form);
    strip.addEventListener("click", (e) => {
      const target = e.target.closest("[data-stuck-field]");
      if (e.target.closest("[data-stuck-book]")) { form.requestSubmit(); return; }
      if (!target) return;
      const name = target.dataset.stuckField;
      root.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => fieldFor(name).querySelector("button").click(), 450);
    });
  }

  render();
}
