/*
  Hotels page booking form: destination search, date-range calendar,
  guests/rooms stepper, and the stuck booking strip under the navbar.
  Layout follows the Aston booking pickers; styling is Fave (fave-hotels.css).
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

/* ---------- dates (all local time) ---------- */
const DAY = 86400000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a, b) => Boolean(a && b) && a.getTime() === b.getTime();
const nights = (a, b) => Math.round((b - a) / DAY);
// always read the clock, so a page left open past midnight stays correct
const today = () => startOfDay(new Date());
// "Fri, 27 Nov" built from parts, so it does not depend on the browser's punctuation
const SHORT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const fmtShort = (d) => {
  const p = Object.fromEntries(SHORT.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.weekday}, ${p.day} ${p.month}`;
};
const fmtLong = (d) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
// default stay: this friday to sunday (today when today is friday, else the next friday)
const defaultStay = () => {
  const t = today();
  const start = addDays(t, (5 - t.getDay() + 7) % 7);
  return { start, end: addDays(start, 2) };
};

export function initBooking(root) {
  const form = root.querySelector("[data-booking-form]");
  const fields = [...root.querySelectorAll("[data-field]")];
  const pops = { dest: root.querySelector("#pop-dest"), dates: root.querySelector("#pop-dates"), guests: root.querySelector("#pop-guests") };

  const state = { dest: DESTINATIONS[1], hotel: "", ...defaultStay(), guests: { adults: 2, children: 0, rooms: 1 } };
  let open = null; // "dest" | "dates" | "guests"
  let opener = null;

  // if the chosen dates are now in the past, move to the default stay
  const keepDatesCurrent = () => {
    if (state.start < today()) Object.assign(state, defaultStay());
  };

  /* ---------- outputs ---------- */
  const guestText = (g = state.guests) => [
    `${g.adults} adult${g.adults > 1 ? "s" : ""}`,
    g.children ? `${g.children} child${g.children > 1 ? "ren" : ""}` : "",
    `${g.rooms} room${g.rooms > 1 ? "s" : ""}`,
  ].filter(Boolean).join(", ");
  const destText = () => (state.dest.group === "indonesia" ? `${state.dest.name}, ${state.dest.country}` : state.dest.name);
  const render = () => {
    const out = { dest: destText(), checkin: fmtShort(state.start), checkout: fmtShort(state.end), guests: guestText(), range: `${fmtShort(state.start)} - ${fmtShort(state.end)}` };
    Object.entries(out).forEach(([key, text]) => document.querySelectorAll(`[data-out="${key}"]`).forEach((el) => { el.textContent = text; }));
    form.querySelector('[name="checkin"]').value = iso(state.start);
    form.querySelector('[name="checkout"]').value = iso(state.end);
    form.querySelector('[name="destination"]').value = destText();
    form.querySelector('[name="guests"]').value = guestText();
  };

  /* ---------- open / close ---------- */
  const fieldFor = (name) => fields.find((f) => f.dataset.field === name);
  const popFor = (fieldName) => (fieldName === "checkin" || fieldName === "checkout" ? "dates" : fieldName);
  const setActive = (fieldName) => {
    fields.forEach((f) => {
      const on = f.dataset.field === fieldName;
      f.classList.toggle("is-active", on);
      f.querySelector("button").setAttribute("aria-expanded", String(on));
    });
  };
  const place = (pop, field) => {
    if (window.matchMedia("(max-width: 600px)").matches) { pop.style.left = ""; return; }
    const max = root.clientWidth - pop.offsetWidth;
    pop.style.left = `${Math.max(0, Math.min(field.offsetLeft, max))}px`;
  };
  const close = (returnFocus = true) => {
    if (!open) return;
    pops[open].hidden = true;
    setActive(null);
    document.body.classList.remove("fx-sheet-open");
    if (returnFocus) opener?.focus();
    open = null;
  };
  const openPop = (fieldName) => {
    const name = popFor(fieldName);
    close(false);
    const field = fieldFor(fieldName);
    open = name;
    opener = field.querySelector("button");
    setActive(fieldName);
    pops[name].hidden = false;
    document.body.classList.add("fx-sheet-open");
    if (name === "dest") openDest();
    if (name === "dates") openDates(fieldName);
    if (name === "guests") openGuests();
    place(pops[name], field);
  };
  fields.forEach((field) => {
    const name = field.dataset.field;
    field.querySelector("button").addEventListener("click", () => {
      // while the calendar is open, a date field only switches what is being picked
      // (it never closes the calendar or drops a half-picked range)
      if (open === "dates" && popFor(name) === "dates") {
        if (!field.classList.contains("is-active")) switchDateField(name);
        return;
      }
      if (open === popFor(name)) { close(); return; }
      openPop(name);
    });
  });
  document.addEventListener("pointerdown", (e) => {
    if (open && !pops[open].contains(e.target) && !e.target.closest("[data-field]") && !e.target.closest("[data-stuck]")) close(false);
  });
  // moving focus to anything outside the booking form closes the picker
  root.addEventListener("focusout", (e) => {
    if (open && e.relatedTarget && !root.contains(e.relatedTarget)) close(false);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) close(); });
  window.addEventListener("resize", () => { if (open) place(pops[open], root.querySelector("[data-field].is-active")); });
  root.querySelectorAll("[data-pop-close]").forEach((b) => b.addEventListener("click", () => close()));

  /* ---------- destination (combobox + listbox) ---------- */
  const destSearch = pops.dest.querySelector("input");
  const destList = pops.dest.querySelector("[data-dest-list]");
  destList.setAttribute("role", "listbox");
  destList.id = destList.id || "dest-listbox";
  destSearch.setAttribute("role", "combobox");
  destSearch.setAttribute("aria-controls", destList.id);
  destSearch.setAttribute("aria-autocomplete", "list");
  destSearch.setAttribute("aria-expanded", "true");
  const hotelNames = [...document.querySelectorAll(".fx-hcard__name")].map((h) => h.textContent.trim());
  let destItems = [];
  let destIndex = -1;
  const setDestIndex = (i) => {
    destIndex = i;
    destItems.forEach((el, n) => {
      el.classList.toggle("is-focus", n === i);
      el.setAttribute("aria-selected", String(n === i));
    });
    if (i >= 0) {
      destSearch.setAttribute("aria-activedescendant", destItems[i].id);
      destItems[i].scrollIntoView({ block: "nearest" });
    } else {
      destSearch.removeAttribute("aria-activedescendant");
    }
  };
  const renderDest = () => {
    const q = destSearch.value.trim().toLowerCase();
    const match = (s) => !q || s.toLowerCase().includes(q);
    const cities = DESTINATIONS.filter((d) => match(`${d.name} ${d.country}`));
    const hotels = q ? hotelNames.filter(match).slice(0, 6) : [];
    let n = 0;
    const group = (title, list, row) => (list.length ? `<li class="fx-dest__group" role="presentation">${title}</li>${list.map(row).join("")}` : "");
    const cityRow = (d) => `<li class="fx-dest__item" role="option" id="dest-opt-${n++}" aria-selected="false" data-dest="${esc(d.name)}">${icon("pin")}<span class="fx-dest__name fx-proper">${esc(d.name)}</span><span class="fx-dest__meta fx-proper">${esc(d.country)}</span></li>`;
    const hotelRow = (h) => `<li class="fx-dest__item" role="option" id="dest-opt-${n++}" aria-selected="false" data-hotel="${esc(h)}">${icon("door")}<span class="fx-dest__name fx-proper">${esc(h)}</span><span class="fx-dest__meta">hotel</span></li>`;
    destList.innerHTML = [
      group("indonesia", cities.filter((d) => d.group === "indonesia"), cityRow),
      group("overseas", cities.filter((d) => d.group === "overseas"), cityRow),
      group("hotels", hotels, hotelRow),
    ].join("") || '<li class="fx-dest__empty" role="presentation">no matches. try another city or hotel name.</li>';
    destItems = [...destList.querySelectorAll(".fx-dest__item")];
    setDestIndex(-1);
  };
  const chooseDest = (item) => {
    if (!item) return;
    if (item.dataset.dest) {
      state.dest = DESTINATIONS.find((d) => d.name === item.dataset.dest);
      state.hotel = "";
    } else {
      state.dest = { name: item.dataset.hotel, country: "", city: "", group: "hotel" };
      state.hotel = item.dataset.hotel;
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
      setDestIndex((destIndex + (e.key === "ArrowDown" ? 1 : -1) + destItems.length) % destItems.length);
    }
    if (e.key === "Enter") { e.preventDefault(); chooseDest(destItems[Math.max(destIndex, 0)]); }
  });
  destList.addEventListener("click", (e) => chooseDest(e.target.closest(".fx-dest__item")));

  /* ---------- dates ---------- */
  const cal = pops.dates.querySelector("[data-cal]");
  const calNote = pops.dates.querySelector("[data-cal-note]");
  const calApply = pops.dates.querySelector("[data-cal-apply]");
  let draft = { start: null, end: null };
  let picking = "start";
  let viewMonth = new Date();
  let hover = null;
  let focusDay = null; // the one day button that is in the tab order
  const monthsShown = () => (window.matchMedia("(max-width: 760px)").matches ? 1 : 2);
  const tooLong = (date) => picking === "end" && draft.start && !draft.end && nights(draft.start, date) > MAX_NIGHTS;

  const rangeEnd = () => draft.end || (picking === "end" && hover && draft.start && hover > draft.start ? hover : null);
  const dayClasses = (date, t) => {
    const end = rangeEnd();
    return ["fx-cal__day",
      sameDay(date, t) && "is-today",
      sameDay(date, draft.start) && "is-start",
      sameDay(date, draft.end) && "is-end",
      draft.start && end && date > draft.start && date < end && "is-range",
      !draft.end && end && sameDay(date, end) && "is-hover-end",
    ].filter(Boolean).join(" ");
  };
  const monthGrid = (m, t) => {
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // monday first
    const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span class="fx-cal__blank"></span>');
    for (let d = 1; d <= days; d++) {
      const date = new Date(m.getFullYear(), m.getMonth(), d);
      const disabled = date < t || tooLong(date);
      const selected = sameDay(date, draft.start) || sameDay(date, draft.end);
      cells.push(`<button type="button" class="${dayClasses(date, t)}" data-day="${iso(date)}" tabindex="-1" aria-label="${fmtLong(date)}"${selected ? ' aria-pressed="true"' : ""}${disabled ? " disabled" : ""}>${d}</button>`);
    }
    const title = m.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    return `<div class="fx-cal__month"><p class="fx-cal__title">${title}</p><div class="fx-cal__week" aria-hidden="true"><span>mon</span><span>tue</span><span>wed</span><span>thu</span><span>fri</span><span>sat</span><span>sun</span></div><div class="fx-cal__grid">${cells.join("")}</div></div>`;
  };
  // only the focus day is reachable with Tab; arrow keys move between days
  const setTabStop = () => {
    const buttons = [...cal.querySelectorAll("[data-day]:not([disabled])")];
    const target = buttons.find((b) => sameDay(fromIso(b.dataset.day), focusDay))
      || buttons.find((b) => b.classList.contains("is-start"))
      || buttons[0];
    buttons.forEach((b) => { b.tabIndex = b === target ? 0 : -1; });
    return target;
  };
  // hover only repaints classes, so the focused button is not replaced
  const paintRange = () => {
    const t = today();
    cal.querySelectorAll("[data-day]").forEach((b) => { b.className = dayClasses(fromIso(b.dataset.day), t); });
  };
  const renderCal = () => {
    const t = today();
    const count = monthsShown();
    const months = Array.from({ length: count }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth() + i, 1));
    const atStart = viewMonth <= new Date(t.getFullYear(), t.getMonth(), 1);
    cal.innerHTML = `<button type="button" class="fx-cal__nav fx-cal__nav--prev" data-cal-prev aria-label="Previous month"${atStart ? " disabled" : ""}>${icon("arrow-left")}</button>${months.map((m) => monthGrid(m, t)).join("")}<button type="button" class="fx-cal__nav fx-cal__nav--next" data-cal-next aria-label="Next month">${icon("arrow")}</button>`;
    if (draft.start && draft.end) {
      const n = nights(draft.start, draft.end);
      calNote.innerHTML = `<strong>${n} night${n > 1 ? "s" : ""}</strong> · ${fmtShort(draft.start)} - ${fmtShort(draft.end)}`;
    } else if (draft.start) {
      calNote.innerHTML = `${fmtShort(draft.start)} - <em>choose check-out</em>`;
    } else {
      calNote.innerHTML = "<em>choose check-in date</em>";
    }
    calApply.disabled = !(draft.start && draft.end);
    return setTabStop();
  };
  const focusOn = (date) => {
    focusDay = date;
    const btn = cal.querySelector(`[data-day="${iso(date)}"]:not([disabled])`);
    setTabStop();
    btn?.focus();
  };
  const openDates = (fieldName) => {
    keepDatesCurrent();
    render();
    draft = { start: state.start, end: state.end };
    picking = fieldName === "checkout" ? "end" : "start";
    if (picking === "end") draft.end = null;
    hover = null;
    focusDay = state.start;
    viewMonth = new Date(state.start.getFullYear(), state.start.getMonth(), 1);
    const stop = renderCal();
    setTimeout(() => stop?.focus(), 0);
  };
  const switchDateField = (fieldName) => {
    setActive(fieldName);
    opener = fieldFor(fieldName).querySelector("button");
    picking = fieldName === "checkout" && draft.start ? "end" : "start";
    if (picking === "end") draft.end = null;
    hover = null;
    renderCal();
  };
  cal.addEventListener("click", (e) => {
    if (e.target.closest("[data-cal-prev]")) { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1); renderCal(); return; }
    if (e.target.closest("[data-cal-next]")) { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1); renderCal(); return; }
    const btn = e.target.closest("[data-day]");
    if (!btn || btn.disabled) return;
    const date = fromIso(btn.dataset.day);
    if (picking === "start" || !draft.start || date <= draft.start) {
      draft = { start: date, end: null };
      picking = "end";
      setActive("checkout");
    } else {
      draft.end = date;
      picking = "start";
    }
    hover = null;
    renderCal();
    focusOn(date);
  });
  cal.addEventListener("pointerover", (e) => {
    const btn = e.target.closest("[data-day]");
    if (picking !== "end" || !btn) return;
    const next = fromIso(btn.dataset.day);
    if (!sameDay(next, hover)) { hover = next; paintRange(); }
  });
  cal.addEventListener("keydown", (e) => {
    const btn = e.target.closest("[data-day]");
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!btn || !step) return;
    e.preventDefault();
    const target = addDays(fromIso(btn.dataset.day), step);
    // stay on the current day when the target cannot be picked
    if (target < today() || tooLong(target)) return;
    const lastShown = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + monthsShown(), 0);
    if (target > lastShown || target < viewMonth) {
      viewMonth = new Date(target.getFullYear(), target.getMonth(), 1);
      focusDay = target;
      renderCal();
    }
    focusOn(target);
  });
  pops.dates.querySelector("[data-cal-clear]").addEventListener("click", () => {
    draft = { start: null, end: null };
    picking = "start";
    setActive("checkin");
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
    keepDatesCurrent();
    render();
    const scope = document.querySelector("#all-hotels");
    const citySelect = scope?.querySelector('[data-f-select="city"]');
    const search = scope?.querySelector("[data-f-search]");
    if (citySelect && search) {
      // the destination decides the place, so clear the region chip
      scope.querySelector('[data-f-chips="region"] [data-value="all"]:not(.is-on)')?.click();
      const isCity = !state.hotel && [...citySelect.options].some((o) => o.value === state.dest.city && o.value);
      citySelect.value = isCity ? state.dest.city : "all";
      // a hotel or a place with no city option (e.g. Malaysia) is searched by name
      search.value = isCity ? "" : state.dest.name;
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
      if (passed) strip.removeAttribute("aria-hidden"); else strip.setAttribute("aria-hidden", "true");
    }, { rootMargin: "-90px 0px 0px 0px" });
    watch.observe(form);
    strip.addEventListener("click", (e) => {
      if (e.target.closest("[data-stuck-book]")) { form.requestSubmit(); return; }
      const target = e.target.closest("[data-stuck-field]");
      if (!target) return;
      root.scrollIntoView({ behavior: "smooth", block: "center" });
      // always open (never toggle closed) the picker for this field
      setTimeout(() => openPop(target.dataset.stuckField), 450);
    });
  }

  render();
}
