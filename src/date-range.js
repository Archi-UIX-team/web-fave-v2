const calendarMenu = document.querySelector(".date-range-menu");
const calendarGrid = document.querySelector("#calendar-grid");
const calendarMonth = document.querySelector("#calendar-month");
const calendarGridNext = document.querySelector("#calendar-grid-next");
const calendarMonthNext = document.querySelector("#calendar-month-next");
const rangeLabel = document.querySelector("#date-range-label");
const rangeNights = document.querySelector("#date-range-nights");
const checkinInput = document.querySelector("#checkin");
const checkoutInput = document.querySelector("#checkout");
const dateTriggers = [...document.querySelectorAll(".date-trigger")];
const calendarHome = calendarMenu?.parentElement;
const calendarNextSibling = calendarMenu?.nextSibling;
const mobileCalendar = window.matchMedia("(max-width: 600px)");

const atMidnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const toISO = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const fromISO = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const humanDate = (date) => new Intl.DateTimeFormat("en-GB", { day:"2-digit", month:"2-digit", year:"numeric" }).format(date);
const headerDate = (date) => `${String(date.getDate()).padStart(2,"0")} ${date.toLocaleString("en", { month:"short" }).toUpperCase()} ${date.getFullYear()}`;

if (calendarMenu && calendarGrid && checkinInput && checkoutInput) {
  const today = atMidnight(new Date());
  let start = today;
  let end = new Date(today);
  end.setDate(end.getDate() + 1);
  let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
  let selecting = "start";
  let hasSelection = false;
  let restoreTimer;

  const setMobileSheetLayout = (active) => {
    if (!mobileCalendar.matches) return;
    const important = (name, value) => calendarMenu.style.setProperty(name, value, "important");
    important("position", "fixed");
    important("inset", "auto 0 0 0");
    important("width", "100%");
    important("height", "min(570px, 68svh)");
    important("min-height", "520px");
    important("margin", "0");
    important("border-radius", "24px 24px 0 0");
    important("background", "#fff");
    important("opacity", active ? "1" : "0");
    important("pointer-events", active ? "auto" : "none");
    important("transform", active ? "translateY(0)" : "translateY(100%)");
  };

  const setDesktopPopupLayout = (active) => {
    if (mobileCalendar.matches) return;
    const activeTrigger = dateTriggers.find((trigger) => trigger.getAttribute("aria-expanded") === "true") || dateTriggers[0];
    const fieldRect = activeTrigger.closest(".booking-field").getBoundingClientRect();
    const important = (name, value) => calendarMenu.style.setProperty(name, value, "important");
    important("position", "fixed");
    const popupHeight = Math.min(calendarMenu.offsetHeight || 552, window.innerHeight - 32);
    const popupWidth = Math.min(1040, window.innerWidth - 48);
    const top = Math.max(16, Math.min(window.innerHeight - popupHeight - 16, fieldRect.top - popupHeight - 12));
    const left = Math.max(24, Math.min(fieldRect.left, window.innerWidth - popupWidth - 24));
    important("inset", `${top}px auto auto ${left}px`);
    important("width", `${popupWidth}px`);
    important("margin", "0");
    important("opacity", active ? "1" : "0");
    important("pointer-events", active ? "auto" : "none");
    important("transform", active ? "translateY(0) scale(1)" : "translateY(12px) scale(.98)");
    important("transform-origin", "bottom left");
    important("z-index", "10020");
  };

  const clearMobileSheetLayout = () => {
    ["position", "inset", "width", "height", "min-height", "margin", "border-radius", "background", "opacity", "pointer-events", "transform", "z-index"]
      .forEach((property) => calendarMenu.style.removeProperty(property));
  };

  const syncInputs = () => {
    checkinInput.value = toISO(start);
    checkoutInput.value = toISO(end);
    dateTriggers[0].querySelector("span").textContent = humanDate(start);
    dateTriggers[1].querySelector("span").textContent = humanDate(end);
    const nights = Math.max(1, Math.round((end - start) / 86400000));
    rangeLabel.textContent = `${headerDate(start)} - ${headerDate(end)}`;
    rangeNights.textContent = `${nights} ${nights === 1 ? "Night" : "Nights"}`;
    checkinInput.dispatchEvent(new Event("change", { bubbles:true }));
    checkoutInput.dispatchEvent(new Event("change", { bubbles:true }));
  };

  const renderMonth = (grid, heading, monthDate) => {
    if (!grid || !heading) return;
    grid.replaceChildren();
    heading.textContent = monthDate.toLocaleString("en", { month:"long", year:"numeric" });
    grid.setAttribute("aria-label", heading.textContent);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const previousDays = new Date(year, month, 0).getDate();

    for (let cell = 0; cell < 42; cell += 1) {
      let day = cell - firstWeekday + 1;
      let cellMonth = month;
      let cellYear = year;
      let outside = false;
      if (day < 1) { day = previousDays + day; cellMonth -= 1; outside = true; }
      if (day > days) { day -= days; cellMonth += 1; outside = true; }
      if (cellMonth < 0) { cellMonth = 11; cellYear -= 1; }
      if (cellMonth > 11) { cellMonth = 0; cellYear += 1; }
      const date = new Date(cellYear, cellMonth, day);
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.date = toISO(date);
      button.dataset.rate = String(280000 + ((day * 37000 + month * 19000) % 420000));
      button.setAttribute("aria-label", `${headerDate(date)}, rates from IDR ${Number(button.dataset.rate).toLocaleString("id-ID")}`);
      button.setAttribute("role", "gridcell");
      button.textContent = String(day);
      if (outside) button.classList.add("is-outside");
      if (date < today) { button.disabled = true; button.classList.add("is-past"); }
      if (date.getTime() === today.getTime()) { button.classList.add("is-today"); button.innerHTML = `<span>${day}</span><small>TODAY</small>`; }
      if (hasSelection && date >= start && date <= end) button.classList.add("is-in-range");
      if (hasSelection && date.getTime() === start.getTime()) button.classList.add("is-range-start");
      if (hasSelection && date.getTime() === end.getTime()) button.classList.add("is-range-end");
      grid.appendChild(button);
    }
  };

  const renderCalendar = () => {
    renderMonth(calendarGrid, calendarMonth, viewDate);
    const nextMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderMonth(calendarGridNext, calendarMonthNext, nextMonth);
  };

  const restoreMenu = () => {
    window.clearTimeout(restoreTimer);
    if (calendarMenu.parentElement === document.body) {
      restoreTimer = window.setTimeout(() => {
        calendarHome.insertBefore(calendarMenu, calendarNextSibling);
        clearMobileSheetLayout();
      }, 240);
    }
  };

  const closeCalendar = () => {
    calendarMenu.classList.remove("is-open");
    setMobileSheetLayout(false);
    setDesktopPopupLayout(false);
    calendarHome.classList.remove("date-menu-open");
    dateTriggers.forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
      trigger.closest(".booking-field").classList.remove("is-expanded");
    });
    document.body.classList.remove("booking-modal-open");
    restoreMenu();
  };

  const openCalendar = (role) => {
    selecting = role;
    viewDate = new Date((role === "end" ? end : start).getFullYear(), (role === "end" ? end : start).getMonth(), 1);
    window.clearTimeout(restoreTimer);
    if (calendarMenu.parentElement !== document.body) document.body.appendChild(calendarMenu);
    document.dispatchEvent(new CustomEvent("booking:popover-open", { detail: "date" }));
    dateTriggers.forEach((trigger) => {
      const isActive = trigger.dataset.dateRole === role;
      trigger.setAttribute("aria-expanded", String(isActive));
      trigger.closest(".booking-field").classList.toggle("is-expanded", isActive);
    });
    calendarMenu.classList.add("is-open");
    setMobileSheetLayout(true);
    setDesktopPopupLayout(true);
    calendarHome.classList.add("date-menu-open");
    document.body.classList.toggle("booking-modal-open", mobileCalendar.matches);
    renderCalendar();
  };

  dateTriggers.forEach((trigger) => trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    openCalendar(trigger.dataset.dateRole);
  }));
  calendarMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    const nav = event.target.closest("[data-calendar-nav]")?.dataset.calendarNav;
    if (nav) {
      viewDate.setMonth(viewDate.getMonth() + (nav === "next" ? 1 : -1));
      renderCalendar();
      return;
    }
    const dateButton = event.target.closest("[data-date]");
    if (!dateButton || dateButton.disabled) return;
    const picked = fromISO(dateButton.dataset.date);
    hasSelection = true;
    if (selecting === "start") {
      start = picked;
      if (end <= start) { end = new Date(start); end.setDate(end.getDate() + 1); }
      selecting = "end";
      dateTriggers.forEach((trigger) => {
        const isActive = trigger.dataset.dateRole === "end";
        trigger.setAttribute("aria-expanded", String(isActive));
        trigger.closest(".booking-field").classList.toggle("is-expanded", isActive);
      });
    } else {
      if (picked <= start) {
        start = picked;
        end = new Date(start);
        end.setDate(end.getDate() + 1);
      } else end = picked;
      selecting = "start";
    }
    syncInputs();
    renderCalendar();
  });
  document.addEventListener("click", (event) => {
    if (calendarMenu.classList.contains("is-open") && !event.target.closest(".date-trigger")) closeCalendar();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeCalendar(); });
  document.addEventListener("booking:popover-open", (event) => {
    if (event.detail !== "date" && calendarMenu.classList.contains("is-open")) closeCalendar();
  });
  mobileCalendar.addEventListener("change", () => { if (!mobileCalendar.matches) restoreMenu(); });

  queueMicrotask(() => {
    start = checkinInput.value ? fromISO(checkinInput.value) : today;
    end = checkoutInput.value ? fromISO(checkoutInput.value) : new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    viewDate = new Date(start.getFullYear(), start.getMonth(), 1);
    syncInputs();
    renderCalendar();
  });
}
