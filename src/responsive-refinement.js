const destinationMenu = document.querySelector(".destination-menu");
const destinationInput = document.querySelector("#destination-search-input");
const destinationSearchButton = document.querySelector(".destination-search__button");
const destinationEmpty = document.querySelector(".destination-empty");

/* Fixed-position sheets cannot escape the transformed hero. On phone widths,
   temporarily portal open booking menus to <body>, then restore their exact
   DOM position after they close. */
const mobileSheetQuery = window.matchMedia("(max-width: 600px)");
document.querySelectorAll(".destination-menu, .guest-menu").forEach((menu) => {
  const home = menu.parentElement;
  const nextSibling = menu.nextSibling;
  let restoreTimer;
  const syncSheetPosition = () => {
    window.clearTimeout(restoreTimer);
    if (menu.classList.contains("is-open") && mobileSheetQuery.matches) {
      if (menu.parentElement !== document.body) document.body.appendChild(menu);
      return;
    }
    if (menu.parentElement === document.body) {
      restoreTimer = window.setTimeout(() => home.insertBefore(menu, nextSibling), 240);
    }
  };
  new MutationObserver(syncSheetPosition).observe(menu, { attributes: true, attributeFilter: ["class"] });
  mobileSheetQuery.addEventListener("change", syncSheetPosition);
});

if (destinationMenu && destinationInput) {
  const options = [...destinationMenu.querySelectorAll('button[role="option"]')];
  const filterDestinations = () => {
    const query = destinationInput.value.trim().toLocaleLowerCase();
    let visibleCount = 0;
    options.forEach((option) => {
      const match = option.textContent.toLocaleLowerCase().includes(query);
      option.hidden = !match;
      if (match) visibleCount += 1;
    });
    if (destinationEmpty) destinationEmpty.hidden = visibleCount > 0;
  };

  destinationInput.addEventListener("input", filterDestinations);
  destinationInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      options.find((option) => !option.hidden)?.focus();
    }
  });
  destinationSearchButton?.addEventListener("click", () => {
    filterDestinations();
    (options.find((option) => !option.hidden) || destinationInput).focus();
  });

  const trigger = document.querySelector(".destination-trigger");
  trigger?.addEventListener("click", () => {
    if (trigger.getAttribute("aria-expanded") === "true") {
      requestAnimationFrame(() => destinationInput.focus({ preventScroll: true }));
    }
  });
}

const dealsSection = document.querySelector(".deals-showcase");

if (dealsSection && window.matchMedia("(min-width: 901px)").matches) {
  const cursor = document.createElement("div");
  cursor.className = "offers-swipe-cursor";
  cursor.textContent = "swipe to discover";
  cursor.setAttribute("aria-hidden", "true");
  document.body.appendChild(cursor);

  let pointerX = -200;
  let pointerY = -200;
  let cursorX = -200;
  let cursorY = -200;
  let visible = false;

  const render = () => {
    cursorX += (pointerX - cursorX) * .18;
    cursorY += (pointerY - cursorY) * .18;
    cursor.style.translate = `${cursorX}px ${cursorY}px`;
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);

  dealsSection.addEventListener("pointerenter", (event) => {
    if (event.target.closest("a,button")) return;
    visible = true;
    document.body.classList.add("offers-cursor-active");
    pointerX = event.clientX;
    pointerY = event.clientY;
    cursor.classList.add("is-visible");
  });
  dealsSection.addEventListener("pointermove", (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    const overControl = Boolean(event.target.closest("a,button"));
    cursor.classList.toggle("is-visible", visible && !overControl);
  });
  dealsSection.addEventListener("pointerleave", () => {
    visible = false;
    document.body.classList.remove("offers-cursor-active");
    cursor.classList.remove("is-visible", "is-dragging");
  });
  dealsSection.addEventListener("pointerdown", () => cursor.classList.add("is-dragging"));
  window.addEventListener("pointerup", () => cursor.classList.remove("is-dragging"));
}
