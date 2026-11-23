import "./inner-pages.css";

const header = document.querySelector(".site-header, .page-header");
const menuButton = document.querySelector(".menu-toggle, .page-menu-button");
menuButton?.addEventListener("click", () => {
  const open = header.classList.toggle("is-open");
  document.body.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
});

document.querySelectorAll(".page-mobile-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    header.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    menuButton?.setAttribute("aria-expanded", "false");
  });
});

const searchInput = document.querySelector("[data-page-search]");
const filterSelect = document.querySelector("[data-page-filter]");
const searchableCards = [...document.querySelectorAll("[data-search-card]")];
const applyFilter = () => {
  const query = searchInput?.value.trim().toLowerCase() || "";
  const category = filterSelect?.value || "all";
  searchableCards.forEach((card) => {
    const matchesQuery = card.textContent.toLowerCase().includes(query);
    const matchesCategory = category === "all" || card.dataset.category === category || card.dataset.city === category;
    card.hidden = !(matchesQuery && matchesCategory);
  });
};
searchInput?.addEventListener("input", applyFilter);
filterSelect?.addEventListener("change", applyFilter);
document.querySelector("[data-search-button]")?.addEventListener("click", applyFilter);

document.querySelectorAll("[data-city-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-city-tab]").forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
    const city = tab.dataset.cityTab;
    searchableCards.forEach((card) => { card.hidden = city !== "all" && card.dataset.city !== city; });
  });
});

document.querySelectorAll("[data-deal-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-deal-tab]").forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
  });
});

document.querySelectorAll("[data-hotel-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-hotel-tab]").forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting));
}, { threshold: .12 });
document.querySelectorAll(".reveal-card").forEach((card) => revealObserver.observe(card));
