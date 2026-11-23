import "./style.css";
import "./hero.css";
import "./newsletter.css";
import "./entrance.css";
import "./entrance.js";
import "./cities.js";
import "./introduction.js";
import "./experience-motion.js";
import "./desktop-density.css";
import "./news-editorial.css";
import "./news-reference.css";
import "./news-editorial.js";
import "./deals-drag.js";
import "./responsive-refinement.css";
import "./responsive-refinement.js";
import "./date-range.js";
import "./date-range-responsive.css";

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Keep the immersive timelines active in narrow desktop/tablet previews.
// Only true phone widths use the touch-first static fallback.
const staticMotionLayout = () => window.innerWidth <= 600 || reducedMotion;
const header = document.querySelector("#site-header");
const menuToggle = document.querySelector(".menu-toggle");
const mobileLanguage = document.querySelector(".mobile-language");
const mobileLanguageTrigger = document.querySelector(".mobile-language__trigger");
const mobileLanguageMenu = document.querySelector(".mobile-language__menu");
const mobileNav = document.querySelector(".mobile-nav");
const sidebarReserveTrigger = document.querySelector("[data-sidebar-reserve]");
const destinationTrigger = document.querySelector(".destination-trigger");
const destinationMenu = document.querySelector(".destination-menu");
const guestTrigger = document.querySelector(".guest-trigger");
const guestMenu = document.querySelector(".guest-menu");
const bookingForm = document.querySelector("#booking");
const checkin = document.querySelector("#checkin");
const checkout = document.querySelector("#checkout");
const toast = document.querySelector(".toast");
const toastMessage = document.querySelector("#toast-message");
const heroSection = document.querySelector(".hero");
const mobileFloatingBook = document.querySelector(".mobile-floating-book");
const citySection = document.querySelector(".city-section");
const heroGallery = document.querySelector(".hero-gallery");
const galleryCards = [...document.querySelectorAll(".gallery-card")];
const storySection = document.querySelector(".story-scroll");
const storyCards = [...document.querySelectorAll("[data-story-card]")];
const placesSection = document.querySelector(".places-scroll");
const placesTrack = document.querySelector("#places-track");
const placesPercent = document.querySelector("#places-percent");
const placeCards = [...document.querySelectorAll(".place-card")];
const placeImages = [...document.querySelectorAll(".deal-face--front img")];
const expandSection = document.querySelector(".expand-story");
const expandFrame = document.querySelector("#expand-frame");
const offersSection = document.querySelector(".offers");
const offerCards = [...document.querySelectorAll(".offer-card")];
const newsRailTrack = document.querySelector("#news-rail-track");
const newsRailScenes = [...document.querySelectorAll(".news-rail__scene")];
const newsRailProgress = document.querySelector("#news-rail-progress");
const newsRailCount = document.querySelector("#news-rail-count");
const appSection = document.querySelector(".app-section");
const socialSection = document.querySelector(".social-section");
const socialCards = [...document.querySelectorAll(".social-card")];
const newsletterSection = document.querySelector(".newsletter");
const footerSection = document.querySelector(".footer");
const storyBridge = document.querySelector(".section-bridge--story");
const placesBridge = document.querySelector(".section-bridge--places");
const appBridge = document.querySelector(".section-bridge--app");
const socialBridge = document.querySelector(".section-bridge--social");
const parallaxItems = [...document.querySelectorAll("[data-parallax]")];

// Shared cinematic motion layer. These sections keep their individual pinned
// interactions, while their copy, media, and patterns use one lightweight
// scroll-scrubbed depth system for cleaner handoffs between straight sections.
const cinematicScenes = [
  [citySection, ".city-heading", ".city-stack"],
  [storySection, ".story-copy", ".story-cinematic-disabled"],
  [placesSection, ".places-heading", ".deal-cinematic-disabled"],
  [offersSection, ".news-rail__intro-copy,.news-item__copy", ".news-item__image"],
  [expandSection, ".reels-heading", ".coverflow__viewport"],
  [appSection, ".app-copy", ".phone-wrap"],
  [socialSection, ".social-heading", ".social-grid"],
  [newsletterSection, ".newsletter__inner", ".newsletter__photos"]
].filter(([section]) => section).map(([section, copySelector, mediaSelector]) => {
  const copy = [...section.querySelectorAll(copySelector)];
  const media = [...section.querySelectorAll(mediaSelector)];
  copy.forEach((element) => element.classList.add("cinematic-copy"));
  media.forEach((element) => element.classList.add("cinematic-media"));
  section.classList.add("cinematic-section");
  return { section, copy, media };
});
const storyVisuals = [...document.querySelectorAll(".story-card__visual")];
const reelHeading = document.querySelector(".reels-heading");
const reelStage = document.querySelector(".coverflow-stage");
const appCopy = document.querySelector(".app-copy");
const phoneWrap = document.querySelector(".phone-wrap");
const footerBrandRibbon = document.querySelector(".footer-reference__brands");

if (footerBrandRibbon && !footerBrandRibbon.querySelector(".footer-reference__brand-track")) {
  const track = document.createElement("div");
  const brandSet = document.createElement("div");
  track.className = "footer-reference__brand-track";
  brandSet.className = "footer-reference__brand-set";
  [...footerBrandRibbon.children].forEach((logo) => brandSet.appendChild(logo));
  const duplicateSet = brandSet.cloneNode(true);
  duplicateSet.setAttribute("aria-hidden", "true");
  duplicateSet.querySelectorAll("img").forEach((logo) => { logo.alt = ""; });
  track.append(brandSet, duplicateSet);
  footerBrandRibbon.appendChild(track);
}

let selectedDestination = "";
let guests = 2;
let rooms = 1;
let toastTimer;
let scrollTicking = false;

const dateToInput = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().split("T")[0];
};

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
checkin.min = dateToInput(today);
checkout.min = dateToInput(tomorrow);
checkin.value = dateToInput(today);
checkout.value = dateToInput(tomorrow);

const showToast = (message) => {
  toastMessage.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3600);
};

const closePopovers = (except) => {
  if (except !== "destination") {
    destinationMenu.classList.remove("is-open");
    destinationTrigger.setAttribute("aria-expanded", "false");
    destinationTrigger.closest(".booking-field").classList.remove("is-expanded");
  }
  if (except !== "guest") {
    guestMenu.classList.remove("is-open");
    guestTrigger.setAttribute("aria-expanded", "false");
    guestTrigger.closest(".booking-field").classList.remove("is-expanded");
  }
  document.body.classList.toggle("booking-modal-open", except === "destination" || except === "guest");
};

document.addEventListener("booking:popover-open", (event) => {
  if (event.detail === "date") closePopovers();
});

const setDestination = (value, label = value) => {
  selectedDestination = value.toLowerCase();
  destinationTrigger.querySelector(":scope > span").textContent = label.toLowerCase();
};

document.querySelectorAll('[data-city-book]').forEach((button) => {
  button.addEventListener('click', () => {
    setDestination(button.dataset.cityBook);
    bookingForm.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block:'center' });
    destinationTrigger.focus({ preventScroll:true });
    showToast('City selected — choose your dates to explore stays');
  });
});

menuToggle.addEventListener("click", () => {
  const open = header.classList.toggle("menu-active");
  if (!open) mobileNav?.classList.remove("is-reserving");
  document.body.classList.toggle("menu-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});

sidebarReserveTrigger?.addEventListener("click", () => {
  header.classList.remove("menu-active");
  document.body.classList.remove("menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open menu");

  // Close the drawer, make a deliberately quick trip to the hero form, then
  // reveal the existing animated destination bottom sheet.
  window.setTimeout(() => {
    const startY = window.scrollY;
    const formRect = bookingForm.getBoundingClientRect();
    const targetY = Math.max(0, startY + formRect.top - ((window.innerHeight - formRect.height) / 2));
    const duration = reducedMotion ? 0 : 280;
    const startedAt = performance.now();
    const easeOut = (progress) => 1 - Math.pow(1 - progress, 3);

    const finish = () => window.setTimeout(() => destinationTrigger?.click(), reducedMotion ? 0 : 40);
    if (!duration) {
      window.scrollTo(0, targetY);
      finish();
      return;
    }

    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      window.scrollTo(0, startY + ((targetY - startY) * easeOut(progress)));
      if (progress < 1) requestAnimationFrame(step);
      else finish();
    };
    requestAnimationFrame(step);
  }, reducedMotion ? 0 : 140);
});

mobileLanguageTrigger?.addEventListener("click", (event) => {
  event.stopPropagation();
  const open = mobileLanguageMenu.hasAttribute("hidden");
  mobileLanguageMenu.toggleAttribute("hidden", !open);
  mobileLanguageTrigger.setAttribute("aria-expanded", String(open));
  mobileLanguage.classList.toggle("is-open", open);
});

mobileLanguageMenu?.addEventListener("click", (event) => {
  event.stopPropagation();
  const option = event.target.closest("[data-language]");
  if (!option) return;
  mobileLanguageTrigger.firstChild.textContent = `${option.dataset.language} `;
  mobileLanguageMenu.setAttribute("hidden", "");
  mobileLanguageTrigger.setAttribute("aria-expanded", "false");
  mobileLanguage.classList.remove("is-open");
});

document.querySelectorAll(".mobile-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    header.classList.remove("menu-active");
    mobileNav?.classList.remove("is-reserving");
    document.body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
  });
});

destinationTrigger.addEventListener("click", (event) => {
  event.stopPropagation();
  const open = !destinationMenu.classList.contains("is-open");
  if (open) document.dispatchEvent(new CustomEvent("booking:popover-open", { detail: "destination" }));
  closePopovers(open ? "destination" : null);
  destinationMenu.classList.toggle("is-open", open);
  destinationTrigger.setAttribute("aria-expanded", String(open));
  destinationTrigger.closest(".booking-field").classList.toggle("is-expanded", open);
  document.body.classList.toggle("booking-modal-open", open);
});

destinationMenu.addEventListener("click", (event) => event.stopPropagation());

destinationMenu.querySelectorAll('button[role="option"]').forEach((option) => {
  option.addEventListener("click", () => {
    setDestination(option.dataset.value, option.querySelector("strong").textContent);
    closePopovers();
  });
});

guestTrigger.addEventListener("click", (event) => {
  event.stopPropagation();
  const open = !guestMenu.classList.contains("is-open");
  if (open) document.dispatchEvent(new CustomEvent("booking:popover-open", { detail: "guest" }));
  closePopovers(open ? "guest" : null);
  guestMenu.classList.toggle("is-open", open);
  guestTrigger.setAttribute("aria-expanded", String(open));
  guestTrigger.closest(".booking-field").classList.toggle("is-expanded", open);
  document.body.classList.toggle("booking-modal-open", open);
});

const updateGuestLabels = () => {
  document.querySelector("#guest-output").textContent = guests;
  document.querySelector("#room-output").textContent = rooms;
  guestTrigger.querySelector(":scope > span").innerHTML = `<b id="guest-count">${guests}</b> ${guests === 1 ? "guest" : "guests"} · <b id="room-count">${rooms}</b> ${rooms === 1 ? "room" : "rooms"}`;
};

guestMenu.addEventListener("click", (event) => {
  event.stopPropagation();
  const action = event.target.dataset.action;
  if (!action) return;
  if (action === "guest-up") guests = Math.min(8, guests + 1);
  if (action === "guest-down") guests = Math.max(1, guests - 1);
  if (action === "room-up") rooms = Math.min(4, rooms + 1);
  if (action === "room-down") rooms = Math.max(1, rooms - 1);
  if (guests < rooms) guests = rooms;
  updateGuestLabels();
});

document.addEventListener("click", () => {
  closePopovers();
  mobileLanguageMenu?.setAttribute("hidden", "");
  mobileLanguageTrigger?.setAttribute("aria-expanded", "false");
  mobileLanguage?.classList.remove("is-open");
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePopovers();
    mobileLanguageMenu?.setAttribute("hidden", "");
    mobileLanguageTrigger?.setAttribute("aria-expanded", "false");
    mobileLanguage?.classList.remove("is-open");
    if (header.classList.contains("menu-active")) menuToggle.click();
  }
});

checkin.addEventListener("change", () => {
  const nextDay = new Date(`${checkin.value}T00:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  checkout.min = dateToInput(nextDay);
  if (!checkout.value || checkout.value <= checkin.value) checkout.value = dateToInput(nextDay);
});

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedDestination) {
    destinationTrigger.focus();
    destinationMenu.classList.add("is-open");
    destinationTrigger.setAttribute("aria-expanded", "true");
    showToast("pick a favorite place to start");
    return;
  }
  showToast(`finding happy stays in ${selectedDestination}`);
});

document.querySelectorAll(".place-card[data-deal]").forEach((card) => {
  // Deal cards can be entirely link-driven in the flipped-card layout.  Do not
  // let a missing optional button abort the rest of the application startup.
  const dealButton = card.querySelector("button");
  if (!dealButton) return;
  dealButton.addEventListener("click", () => {
    const deal = card.dataset.deal;
    document.querySelector("#booking").scrollIntoView({ behavior: "smooth", block: "center" });
    showToast(`${deal} is looking good — choose your dates next`);
  });
});

document.querySelectorAll('a[href="#"]').forEach((link) => {
  link.addEventListener("click", (event) => event.preventDefault());
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.14, rootMargin: "0px 0px -8%" });

document.querySelectorAll(".line-reveal,.reveal-item").forEach((element) => revealObserver.observe(element));

// The opening copy is the first thing visitors should see. Reveal it eagerly
// so an observer scheduling delay can never leave the hero blank on reload.
document.querySelectorAll(".hero .line-reveal,.hero .reveal-item").forEach((element) => {
  element.classList.add("is-visible");
});

// Keep the opening scene lively only while it is visible.
const heroVisibilityObserver = new IntersectionObserver(([entry]) => {
  heroSection.classList.toggle("is-out-of-view", !entry.isIntersecting);
}, { threshold:0 });
heroVisibilityObserver.observe(heroSection);

// Keep scroll-driven timelines dormant until their section is close to the viewport.
const activeMotionSections = new WeakSet();
const motionSectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    entry.target.classList.toggle("is-motion-active", entry.isIntersecting);
    if (entry.isIntersecting) activeMotionSections.add(entry.target);
    else activeMotionSections.delete(entry.target);
  });
  requestScrollUpdate();
}, { rootMargin:"35% 0px", threshold:0 });
[heroSection, citySection, storySection, placesSection, expandSection, offersSection, appSection, socialSection, newsletterSection, footerSection]
  .filter(Boolean)
  .forEach((section) => motionSectionObserver.observe(section));
const isMotionActive = (section) => Boolean(section && activeMotionSections.has(section));

// Images below the opening viewport decode only when the browser needs them.
document.querySelectorAll("main section:not(.hero) img").forEach((image) => {
  image.loading = "lazy";
  image.decoding = "async";
});

const sectionProgress = (section) => {
  const distance = Math.max(1, section.offsetHeight - window.innerHeight);
  return clamp((window.scrollY - section.offsetTop) / distance);
};

const entryProgress = (section, start = .92, end = .18) => {
  const rect = section.getBoundingClientRect();
  return clamp((window.innerHeight * start - rect.top) / (window.innerHeight * (start - end)));
};

const updateHero = () => {
  if (!isMotionActive(heroSection)) return;
  const staticHero = staticMotionLayout();
  if (staticHero) {
    ["--hero-title-y", "--hero-accent-x", "--hero-accent-y", "--hero-accent-r", "--hero-booking-y", "--hero-gallery-y", "--hero-gallery-scale", "--hero-pattern-turn", "--era-hero-copy-opacity", "--era-hero-copy-scale", "--era-booking-opacity", "--era-booking-scale", "--era-gallery-radius", "--era-ribbon-y"].forEach((property) => heroSection.style.removeProperty(property));
    galleryCards.forEach((card) => { card.style.translate = ""; card.style.rotate = ""; });
    return;
  }
  // A long pinned opening, inspired by editorial real-estate storytelling:
  // typography recedes while the image rail grows toward the viewer.
  const progress = sectionProgress(heroSection);
  const bookingProgress = clamp((progress - .12) / .88);
  const copyExit = clamp(progress / .34);
  const galleryProgress = clamp((progress - .08) / .78);
  heroSection.style.setProperty("--hero-title-y", `${-118 * copyExit}px`);
  heroSection.style.setProperty("--era-hero-copy-opacity", String(1 - copyExit * .94));
  heroSection.style.setProperty("--era-hero-copy-scale", String(1 - copyExit * .12));
  heroSection.style.setProperty("--era-booking-opacity", String(1 - clamp((progress - .08) / .3) * .96));
  heroSection.style.setProperty("--era-booking-scale", String(1 - clamp((progress - .08) / .3) * .08));
  heroSection.style.setProperty("--hero-accent-x", `${6 * progress}px`);
  heroSection.style.setProperty("--hero-accent-y", `${-12 * progress}px`);
  heroSection.style.setProperty("--hero-accent-r", `${-.7 * progress}deg`);
  heroSection.style.setProperty("--hero-booking-y", `${-23 * bookingProgress}px`);
  heroSection.style.setProperty("--hero-gallery-y", `${-58 * galleryProgress}px`);
  heroSection.style.setProperty("--hero-gallery-scale", String(1 + galleryProgress * .58));
  heroSection.style.setProperty("--era-gallery-radius", `${Math.max(0, 28 - galleryProgress * 28)}px`);
  heroSection.style.setProperty("--era-ribbon-y", `${galleryProgress * 92}px`);
  heroSection.style.setProperty("--hero-pattern-turn", `${progress * 30}deg`);
  heroSection.style.setProperty("--hero-curve-height", `${72 + progress * 22}px`);
  heroSection.style.setProperty("--hero-curve-radius", `${38 + progress * 18}% ${62 - progress * 18}% 0 0 / ${62 + progress * 22}% ${88 - progress * 12}% 0 0`);
  heroSection.style.setProperty("--hero-peel-height", `${21 + progress * 29}px`);
  heroSection.style.setProperty("--hero-peel-y", `${progress * -2}px`);
  const shifts = [19, -12, 14, -20, 9, -15];
  const rotations = [-2.2, 1.4, -.8, 2.4, -1.5, 1.8];
  galleryCards.forEach((card, index) => {
    card.style.translate = `0 ${shifts[index % shifts.length] * progress}px`;
    card.style.rotate = `${rotations[index % rotations.length] * progress}deg`;
  });
};

const updateStory = () => {
  if (!isMotionActive(storySection)) return;
  if (staticMotionLayout()) return;
  const progress = sectionProgress(storySection);
  const cardOneProgress = clamp((progress - .02) / .26);
  const cardTwoProgress = clamp((progress - .16) / .28);
  const cardThreeProgress = clamp((progress - .42) / .3);
  const values = [
    { x: (1 - cardOneProgress) * -150, y: (1 - cardOneProgress) * 76, r: -9 + cardOneProgress * 5, s: .94 + cardOneProgress * .06, o: cardOneProgress },
    { x: (1 - cardTwoProgress) * 170, y: (1 - cardTwoProgress) * -34, r: 9 - cardTwoProgress * 6, s: .92 + cardTwoProgress * .08, o: cardTwoProgress },
    { x: (1 - cardThreeProgress) * 110, y: (1 - cardThreeProgress) * 170, r: -8 + cardThreeProgress * 6, s: .92 + cardThreeProgress * .08, o: cardThreeProgress }
  ];
  storyCards.forEach((card, index) => {
    card.style.setProperty("--card-x", `${values[index].x}px`);
    card.style.setProperty("--card-y", `${values[index].y}px`);
    card.style.setProperty("--card-r", `${values[index].r}deg`);
    card.style.setProperty("--card-scale", values[index].s);
    card.style.setProperty("--card-opacity", values[index].o);
  });
  storySection.style.setProperty("--story-sticker-turn", `${-18 + progress * 58}deg`);
  storySection.style.setProperty("--era-story-title-scale", String(.84 + clamp(progress / .38) * .16));
  storySection.style.setProperty("--era-story-title-x", `${(1 - clamp(progress / .38)) * -64}px`);
  storySection.style.setProperty("--era-story-title-opacity", String(.28 + clamp(progress / .24) * .72));
  storyVisuals.forEach((visual, index) => {
    const local = clamp((progress - index * .14) / .34);
    visual.style.setProperty("--era-story-mask", `${(1 - local) * 100}%`);
    visual.style.setProperty("--era-story-image-scale", String(1.18 - local * .18));
  });
  const active = progress < .34 ? 1 : progress < .7 ? 2 : 3;
  document.querySelector("#story-index").textContent = `0${active} / 03`;
  document.querySelector(".story-progress").style.setProperty("--story-progress", progress);
};

const updatePlaces = () => {
  if (!isMotionActive(placesSection)) return;
  if (placesSection?.classList.contains("is-drag-carousel")) return;
  if (staticMotionLayout()) {
    placeCards.forEach((card) => { card.style.scale = ""; });
    return;
  }
  const sectionRect = placesSection.getBoundingClientRect();
  if (sectionRect.bottom < -window.innerHeight || sectionRect.top > window.innerHeight * 1.5) return;
  const progress = sectionProgress(placesSection);
  const railProgress = clamp(progress / .9);
  const trackStart = Math.max(32, (window.innerWidth - 1280) / 2);
  const maxTravel = Math.max(0, placesTrack.scrollWidth - window.innerWidth + trackStart + 64);
  placesTrack.style.setProperty("--track-x", `${-railProgress * maxTravel}px`);
  document.querySelector(".places-counter").style.setProperty("--places-progress", progress);
  placesPercent.textContent = String(Math.round(progress * 100)).padStart(2, "0");
  placesSection.style.setProperty("--places-pattern-scale", String(1.225 + progress * .275));
  placesSection.style.setProperty("--places-pattern-turn", `${-18 + progress * 72}deg`);
  placesSection.style.setProperty("--era-deals-title-scale", String(.82 + clamp(progress / .24) * .18));
  placesSection.style.setProperty("--era-deals-title-x", `${(1 - clamp(progress / .24)) * -24}px`);
  placesSection.style.setProperty("--era-deals-copy-opacity", String(.5 + clamp(progress / .2) * .5));
  placeCards.forEach((card) => { card.style.scale = "1"; });
};

const updateExpand = () => {
  if (!expandSection || !expandFrame || staticMotionLayout() || !isMotionActive(expandSection)) return;
  if (expandSection.classList.contains("reels-section")) return;
  const progress = sectionProgress(expandSection);
  const eased = 1 - Math.pow(1 - progress, 3);
  expandFrame.style.setProperty("--frame-inset", `${8 * (1 - eased)}vw`);
  expandFrame.style.setProperty("--frame-radius", `${80 * (1 - eased)}px`);
  expandFrame.style.setProperty("--image-scale", 1.15 - .15 * eased);
  expandSection.style.setProperty("--pattern-scale", String(.8 + eased * 2.7));
  expandSection.style.setProperty("--pattern-rotation", `${eased * 80}deg`);
};

const initCoverflow = () => {
  const root = document.querySelector("[data-coverflow]");
  if (!root) return;
  const cards = [...root.querySelectorAll("[data-coverflow-card]")];
  const dots = root.querySelector(".coverflow__dots");
  const count = root.querySelector(".coverflow__count");
  let active = 2;
  let timer;
  let sectionVisible = false;

  const loadVideo = (video, preload = "metadata") => {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = preload;
    if (!video.src && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }
  };

  const playWhenReady = (video) => {
    const attempt = () => {
      if (video.closest("[data-coverflow-card]")?.classList.contains("is-active") && sectionVisible && !document.hidden) {
        video.play().catch(() => {});
      }
    };
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) attempt();
    else video.addEventListener("canplay", attempt, { once:true });
  };

  const syncPlayback = () => {
    cards.forEach((card, index) => {
      const video = card.querySelector("video");
      const position = Number(card.dataset.position || 0);
      const nearActive = Math.abs(position) <= 1;
      if (nearActive) loadVideo(video, position === 0 ? "auto" : "metadata");
      else video.preload = "none";

      if (index === active && sectionVisible && !document.hidden) {
        loadVideo(video, "auto");
        playWhenReady(video);
      } else {
        video.pause();
      }
    });
  };

  cards.forEach((card, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Show Reel ${index + 1}`);
    dot.addEventListener("click", () => setActive(index, true));
    dots.append(dot);
    card.addEventListener("click", () => {
      if (index !== active) setActive(index, true);
    });
  });

  const render = () => {
    cards.forEach((card, index) => {
      let position = (index - active + cards.length) % cards.length;
      if (position > cards.length / 2) position -= cards.length;
      card.dataset.position = String(position);
      card.classList.toggle("is-active", position === 0);
      card.setAttribute("aria-hidden", position === 0 ? "false" : "true");
    });
    [...dots.children].forEach((dot, index) => dot.classList.toggle("is-active", index === active));
    count.textContent = `${String(active + 1).padStart(2,"0")} / ${String(cards.length).padStart(2,"0")}`;
    syncPlayback();
  };

  const start = () => {
    window.clearInterval(timer);
    if (!reducedMotion && sectionVisible) timer = window.setInterval(() => setActive(active + 1), 4300);
  };
  const setActive = (index, restart = false) => {
    active = (index + cards.length) % cards.length;
    render();
    if (restart) start();
  };

  root.querySelector(".coverflow__arrow--prev").addEventListener("click", () => setActive(active - 1, true));
  root.querySelector(".coverflow__arrow--next").addEventListener("click", () => setActive(active + 1, true));
  root.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") setActive(active - 1, true);
    if (event.key === "ArrowRight") setActive(active + 1, true);
  });
  root.addEventListener("pointerenter", () => window.clearInterval(timer));
  root.addEventListener("pointerleave", start);
  root.addEventListener("focusin", () => window.clearInterval(timer));
  root.addEventListener("focusout", start);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    sectionVisible = entry.isIntersecting;
    if (sectionVisible) start();
    else window.clearInterval(timer);
    syncPlayback();
  }, { threshold:.04, rootMargin:"220px 0px" });
  visibilityObserver.observe(root);
  document.addEventListener("visibilitychange", syncPlayback);
  render();
};

initCoverflow();

const updateOffers = () => {
  if (!offersSection || !newsRailTrack || !isMotionActive(offersSection)) return;
  if (staticMotionLayout()) {
    newsRailTrack.style.removeProperty("--news-x");
    return;
  }

  const progress = sectionProgress(offersSection);
  const maxTravel = Math.max(0, newsRailTrack.scrollWidth - window.innerWidth);
  newsRailTrack.style.setProperty("--news-x", `${-progress * maxTravel}px`);
  offersSection.style.setProperty("--news-flower-y", `${(1 - progress) * 34}px`);
  offersSection.style.setProperty("--news-stamp-turn", `${-20 + progress * 48}deg`);

  newsRailScenes.forEach((scene, index) => {
    const position = index - progress * Math.max(1, newsRailScenes.length - 1);
    const focus = clamp(1 - Math.abs(position));
    scene.style.setProperty("--era-news-focus", String(focus));
    scene.style.setProperty("--era-news-copy-x", `${position * 110}px`);
    scene.style.setProperty("--era-news-image-scale", String(1.14 - focus * .14));
    scene.style.setProperty("--era-news-image-y", `${position * -42}px`);
    scene.style.removeProperty("--news-scene-opacity");
    scene.style.removeProperty("--news-scene-layer");
    scene.style.removeProperty("pointer-events");
  });

  const active = Math.min(newsRailScenes.length - 1, Math.floor(progress * newsRailScenes.length));
  if (newsRailProgress) newsRailProgress.style.transform = `scaleX(${Math.max(.06, progress)})`;
  if (newsRailCount) newsRailCount.textContent = `${String(active + 1).padStart(2, "0")} / ${String(newsRailScenes.length).padStart(2, "0")}`;
};

const updateApp = () => {
  if (staticMotionLayout() || !isMotionActive(appSection)) return;
  const progress = entryProgress(appSection, .96, .08);
  appSection.style.setProperty("--app-pattern-scale", String(2.15 + progress * 1.25));
  appSection.style.setProperty("--app-pattern-turn", `${-18 + progress * 44}deg`);
  appSection.style.setProperty("--app-copy-y", `${(1 - progress) * 82}px`);
  appSection.style.setProperty("--phone-turn", `${-14 + progress * 14}deg`);
  appSection.style.setProperty("--phone-scale", String(.23 + progress * .09));
  appSection.style.setProperty("--era-app-copy-x", `${(1 - progress) * -110}px`);
  appSection.style.setProperty("--era-app-copy-opacity", String(.12 + progress * .88));
  appSection.style.setProperty("--era-phone-x", `${(1 - progress) * 50 - 80}px`);
};

const updateReelsScroll = () => {
  if (!expandSection?.classList.contains("reels-section") || staticMotionLayout() || !isMotionActive(expandSection)) return;
  const progress = sectionProgress(expandSection);
  const reveal = clamp(progress / .34);
  const exit = clamp((progress - .72) / .26);
  expandSection.style.setProperty("--era-reels-heading-y", `${(1 - reveal) * 24 - exit * 50}px`);
  expandSection.style.setProperty("--era-reels-heading-opacity", String(.62 + reveal * .38 - exit * .42));
  expandSection.style.setProperty("--era-reels-stage-scale", String(.94 + reveal * .06 + exit * .05));
  expandSection.style.setProperty("--era-reels-stage-y", `${(1 - reveal) * 30 - exit * 34}px`);
  if (reelHeading) reelHeading.style.setProperty("--era-reels-progress", String(progress));
  if (reelStage) reelStage.style.setProperty("--era-reels-perspective", `${1400 - reveal * 400}px`);
};

const updateNews = () => {
  if (staticMotionLayout() || !isMotionActive(socialSection)) return;
  const progress = entryProgress(socialSection, .95, .12);
  socialCards.forEach((card, index) => {
    const local = clamp((progress - index * .075) / .68);
    card.style.setProperty("--news-opacity", String(local));
    card.style.setProperty("--news-x", `${(1 - local) * (index % 2 ? -72 : 72)}px`);
    card.style.setProperty("--news-y", `${(1 - local) * 118}px`);
    card.style.setProperty("--news-clip", `${(1 - local) * 62}%`);
  });
  socialSection.style.setProperty("--news-pattern-y", `${(1 - progress) * 38}px`);
  socialSection.style.setProperty("--news-pattern-y-alt", `${(1 - progress) * -24}px`);
  socialSection.style.setProperty("--news-pattern-scale", String(.58 + progress * .2));
  socialSection.style.setProperty("--news-pattern-turn", `${-24 + progress * 42}deg`);
  socialSection.style.setProperty("--news-pattern-turn-alt", `${22 - progress * 34}deg`);
};

const updateTransitions = () => {
  if (![storySection, placesSection, offersSection, appSection, socialSection, newsletterSection, footerSection].some(isMotionActive)) return;
  if (isMotionActive(storySection)) {
    const storyEntry = entryProgress(storySection, 1.05, .45);
    storySection.style.setProperty("--story-divider-y", `${(1 - storyEntry) * 26}px`);
    storyBridge.style.setProperty("--bridge-y", `${(1 - storyEntry) * 20}px`);
    storyBridge.style.setProperty("--bridge-petal-y", `${(1 - storyEntry) * 24}px`);
    storyBridge.style.setProperty("--bridge-pattern-scale", String(.66 + storyEntry * .2));
    storyBridge.style.setProperty("--bridge-turn", `${-24 + storyEntry * 40}deg`);
  }

  if (isMotionActive(placesSection)) {
    const placesEntry = entryProgress(placesSection, 1.04, .42);
    placesSection.style.setProperty("--places-divider-y", `${(1 - placesEntry) * 34}px`);
    placesSection.style.setProperty("--places-divider-skew", `${-9 + placesEntry * 9}deg`);
    placesBridge.style.setProperty("--bridge-y", `${(1 - placesEntry) * 28}px`);
    placesBridge.style.setProperty("--bridge-fold-y", `${(1 - placesEntry) * 30}px`);
    placesBridge.style.setProperty("--bridge-pattern-scale", String(.34 + placesEntry * .12));
    placesBridge.style.setProperty("--bridge-turn", `${24 - placesEntry * 42}deg`);
    placesBridge.style.setProperty("--bridge-photo-y", `${(1 - placesEntry) * 58}px`);
    placesBridge.style.setProperty("--bridge-photo-turn", `${-13 + placesEntry * 7}deg`);
  }

  if (isMotionActive(offersSection)) {
    const offersEntry = entryProgress(offersSection, 1.05, .38);
    offersSection.style.setProperty("--offers-divider-height", `${108 + offersEntry * 52}px`);
    offersSection.style.setProperty("--offers-divider-y", `${(1 - offersEntry) * 30}px`);
    offersSection.style.setProperty("--offers-divider-skew", `${-6 + offersEntry * 6}deg`);
    offersSection.style.setProperty("--offers-divider-radius", `${42 + offersEntry * 16}% ${58 - offersEntry * 16}% 0 0 / ${60 + offersEntry * 22}% ${78 - offersEntry * 10}% 0 0`);
  }

  if (isMotionActive(appSection)) {
    const appEntry = entryProgress(appSection, 1.04, .38);
    appBridge.style.setProperty("--bridge-y", `${(1 - appEntry) * 26}px`);
    appBridge.style.setProperty("--app-shape-y", `${(1 - appEntry) * 34}px`);
    appBridge.style.setProperty("--app-shape-scale", String(.88 + appEntry * .12));
    appBridge.style.setProperty("--bridge-pattern-scale", String(.48 + appEntry * .2));
    appBridge.style.setProperty("--bridge-turn", `${-22 + appEntry * 46}deg`);
  }

  if (isMotionActive(socialSection)) {
    const socialEntry = entryProgress(socialSection, 1.04, .4);
    socialBridge.style.setProperty("--bridge-y", `${(1 - socialEntry) * 24}px`);
    socialBridge.style.setProperty("--bridge-pattern-scale", String(.58 + socialEntry * .24));
    socialBridge.style.setProperty("--bridge-turn", `${24 - socialEntry * 52}deg`);
  }

  if (isMotionActive(newsletterSection)) {
    const newsletterEntry = entryProgress(newsletterSection, 1.02, .35);
    newsletterSection.style.setProperty("--newsletter-photo-y", reducedMotion ? "0px" : `${(1 - newsletterEntry) * 22}px`);
    newsletterSection.style.setProperty("--newsletter-left-cut", `${15 - newsletterEntry * 7}%`);
    newsletterSection.style.setProperty("--newsletter-mid-cut", `${7 - newsletterEntry * 7}%`);
    newsletterSection.style.setProperty("--newsletter-right-cut", `${14 - newsletterEntry * 7}%`);
    newsletterSection.style.setProperty("--newsletter-notch-cut", `${8 - newsletterEntry * 6}%`);
    newsletterSection.style.setProperty("--newsletter-edge-cut", `${17 - newsletterEntry * 7}%`);
  }

  if (isMotionActive(footerSection)) {
    const footerEntry = entryProgress(footerSection, 1.04, .5);
    footerSection.style.setProperty("--footer-landscape-y", `${(1 - footerEntry) * 54}px`);
    footerSection.style.setProperty("--footer-landscape-front-y", `${(1 - footerEntry) * 82}px`);
    footerSection.style.setProperty("--footer-pattern-scale", String(1.05 + footerEntry * .3));
    footerSection.style.setProperty("--footer-pattern-turn", `${-28 + footerEntry * 54}deg`);
    footerSection.style.setProperty("--footer-postcard-y", `${(1 - footerEntry) * 74}px`);
    footerSection.style.setProperty("--footer-postcard-turn", `${-12 + footerEntry * 5}deg`);
    footerSection.style.setProperty("--footer-key-y", `${(1 - footerEntry) * 96}px`);
    footerSection.style.setProperty("--footer-stamp-y", `${(1 - footerEntry) * 48}px`);
    footerSection.style.setProperty("--footer-copy-y", `${(1 - footerEntry) * 72}px`);
    footerSection.style.setProperty("--footer-copy-opacity", String(.25 + footerEntry * .75));
    footerSection.style.setProperty("--footer-wordmark-y", `${(1 - footerEntry) * 150}px`);
  }
};

const updateHeaderTone = () => {
  const lightSelector = ".city-section,.fave-introduction,.places-scroll,.offers,.social-section,.newsletter";
  const layers = document.elementsFromPoint(window.innerWidth / 2, Math.min(52, window.innerHeight - 1));
  const isOnLight = layers.some((element) => !element.closest(".site-header") && element.closest(lightSelector));
  header.classList.toggle("on-light", isOnLight);
};

const updateMobileFloatingBook = () => {
  if (!mobileFloatingBook || !heroSection) return;
  const heroBottom = heroSection.getBoundingClientRect().bottom;
  const shouldShow = window.innerWidth <= 600 && heroBottom <= 90;
  mobileFloatingBook.classList.toggle("is-visible", shouldShow);
};

const activeParallaxItems = new WeakSet();
const parallaxObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) activeParallaxItems.add(entry.target);
    else activeParallaxItems.delete(entry.target);
  });
  requestScrollUpdate();
}, { rootMargin:"200px 0px", threshold:0 });
parallaxItems.forEach((element) => parallaxObserver.observe(element));

const updateParallax = () => {
  if (reducedMotion) return;
  parallaxItems.forEach((element) => {
    if (!activeParallaxItems.has(element)) return;
    const rect = element.getBoundingClientRect();
    const speed = Number(element.dataset.parallax || 0);
    const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
    element.style.translate = `0 ${offset}px`;
  });
};

const updateCinematicSections = () => {
  if (staticMotionLayout()) return;
  const viewportHeight = window.innerHeight;
  const activeScenes = cinematicScenes
    .filter(({ section }) => isMotionActive(section))
    .map((scene) => ({ ...scene, rect: scene.section.getBoundingClientRect() }));

  activeScenes.forEach(({ section, copy, media, rect }) => {
    const progress = clamp((viewportHeight - rect.top) / Math.max(1, viewportHeight + rect.height));
    const enter = clamp(progress / .2);
    const exit = clamp((progress - .78) / .2);
    const copyY = (1 - enter) * 58 - exit * 34;
    const copyOpacity = clamp(.18 + enter * .82 - exit * .22, .18, 1);
    const depthY = (progress - .5) * -52;
    const depthScale = 1.025 + (1 - Math.abs(progress - .5) * 2) * .025;

    copy.forEach((element, index) => {
      const stagger = (1 - enter) * index * 10;
      element.style.setProperty("--cinematic-copy-y", `${copyY + stagger}px`);
      element.style.setProperty("--cinematic-copy-opacity", String(copyOpacity));
    });
    media.forEach((element, index) => {
      const direction = index % 2 ? -1 : 1;
      element.style.setProperty("--cinematic-media-y", `${depthY * direction}px`);
      element.style.setProperty("--cinematic-media-scale", String(depthScale));
    });
    section.style.setProperty("--cinematic-pattern-turn", `${-18 + progress * 72}deg`);
    section.style.setProperty("--cinematic-pattern-shift", `${(progress - .5) * -36}px`);
  });
};

const reportedScrollErrors = new Set();
const runScrollUpdate = (update) => {
  try {
    update();
  } catch (error) {
    // A broken scene should never stop the rest of the page timeline.
    if (!reportedScrollErrors.has(update.name)) {
      reportedScrollErrors.add(update.name);
      console.error(`[fave scroll] ${update.name} failed`, error);
    }
  }
};

const updateScroll = () => {
  try {
    header.classList.toggle("is-scrolled", window.scrollY > 90);
    [updateHero, updateStory, updatePlaces, updateExpand, updateOffers, updateReelsScroll, updateApp, updateNews, updateTransitions, updateParallax, updateCinematicSections, updateHeaderTone, updateMobileFloatingBook].forEach(runScrollUpdate);
  } finally {
    scrollTicking = false;
  }
};

const requestScrollUpdate = () => {
  if (!scrollTicking) {
    scrollTicking = true;
    window.requestAnimationFrame(updateScroll);
  }
};

window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", requestScrollUpdate, { passive: true });
updateScroll();

if (window.matchMedia("(pointer:fine)").matches && !reducedMotion) {
  document.body.classList.add("has-pointer", "cursor-in-play");
  const cursorPattern = document.querySelector(".cursor-pattern-companion");
  let cursorX = window.innerWidth / 2;
  let cursorY = window.innerHeight / 2;
  let cursorTargetX = cursorX;
  let cursorTargetY = cursorY;
  let cursorTurn = 0;
  let cursorFrame = 0;
  const cursorTrailLength = 2;
  const cursorTrail = Array.from({ length: cursorTrailLength }, (_, index) => {
    const echo = document.createElement("div");
    echo.className = "pattern-disc pattern-disc--p2 cursor-pattern-trail";
    echo.setAttribute("aria-hidden", "true");
    echo.style.setProperty("--trail-opacity", String(.5 * Math.pow(1 - index / cursorTrailLength, 1.2)));
    echo.style.setProperty("--trail-scale", String(.28 + index * .012));
    document.body.insertBefore(echo, cursorPattern);
    return { element: echo, x: cursorX, y: cursorY };
  });
  window.addEventListener("pointermove", (event) => {
    cursorTargetX = event.clientX;
    cursorTargetY = event.clientY;
    if (!cursorFrame) cursorFrame = window.requestAnimationFrame(animateCursorPattern);
  }, { passive: true });

  const animateCursorPattern = () => {
    const dx = cursorTargetX - cursorX;
    const dy = cursorTargetY - cursorY;
    const speed = Math.hypot(dx, dy);
    cursorX += dx * .16;
    cursorY += dy * .16;
    cursorTurn += clamp(dx * .045, -2.4, 2.4);
    cursorPattern.style.setProperty("--cursor-x", `${cursorX}px`);
    cursorPattern.style.setProperty("--cursor-y", `${cursorY}px`);
    cursorPattern.style.setProperty("--cursor-turn", `${cursorTurn}deg`);
    cursorPattern.style.setProperty("--cursor-squash", String(clamp(1 - speed / 210, .82, 1)));
    let trailMotion = 0;
    cursorTrail.forEach((trail, index) => {
      const leader = index === 0 ? { x: cursorX, y: cursorY } : cursorTrail[index - 1];
      const trailDx = leader.x - trail.x;
      const trailDy = leader.y - trail.y;
      const follow = .28 - index * .009;
      trail.x += trailDx * follow;
      trail.y += trailDy * follow;
      trailMotion = Math.max(trailMotion, Math.abs(trailDx), Math.abs(trailDy));
      trail.element.style.setProperty("--cursor-x", `${trail.x}px`);
      trail.element.style.setProperty("--cursor-y", `${trail.y}px`);
      trail.element.style.setProperty("--cursor-turn", `${cursorTurn - (index + 1) * 3.2}deg`);
    });
    if (Math.abs(dx) > .2 || Math.abs(dy) > .2 || trailMotion > .2) cursorFrame = window.requestAnimationFrame(animateCursorPattern);
    else cursorFrame = 0;
  };

  document.querySelectorAll("a,button,.tilt-card").forEach((element) => {
    element.addEventListener("pointerenter", () => document.body.classList.add("cursor-hover"));
    element.addEventListener("pointerleave", () => document.body.classList.remove("cursor-hover"));
  });

  document.querySelectorAll(".tilt-card:not(.offer-card):not(.social-card)").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.setProperty("--tilt-x", `${-y * 5}deg`);
      card.style.setProperty("--tilt-y", `${x * 6}deg`);
      card.style.setProperty("--lift", "-5px");
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
      card.style.setProperty("--lift", "0px");
    });
  });
}

document.querySelector("#year").textContent = new Date().getFullYear();
