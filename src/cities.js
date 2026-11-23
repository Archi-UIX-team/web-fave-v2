import './cities.css';
import arrivalImage from '../assets/images/cities/favehotel-jakarta.png';
import poolImage from '../assets/images/cities/favehotel-bali.png';
import roomImage from '../assets/images/cities/favehotel-malang.png';
import breakfastImage from '../assets/images/cities/favehotel-yogyakarta.png';
import roomPreviewImage from '../assets/images/hero-room.png';

const section = document.querySelector('.city-section');
const stack = section?.querySelector('.city-stack');

if (section && stack) {
  const cities = [
    { hotelName:'favehotel Puri Indah Jakarta', city:'Jakarta', value:'jakarta', image:arrivalImage, price:'350.000' },
    { hotelName:'favehotel Kuta Kartika Plaza', city:'Bali', value:'bali', image:poolImage, price:'400.000' },
    { hotelName:'favehotel Malang', city:'Malang', value:'malang', image:roomImage, price:'300.000' },
    { hotelName:'favehotel Malioboro Yogyakarta', city:'Yogyakarta', value:'yogyakarta', image:breakfastImage, price:'325.000' },
  ];

  const locationIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></svg>';
  stack.innerHTML = cities.map((city, index) => `
    <article class="city-card ${index === 0 ? 'is-active' : ''}" data-city-card data-index="${index}" tabindex="0">
      <img class="city-card__image" src="${city.image}" alt="${city.hotelName} building" loading="lazy" decoding="async" />
      <div class="city-card__wash"></div>
      <div class="city-card__topline"><span>${String(index + 1).padStart(2,'0')}</span><span class="city-country">${locationIcon} ${city.city}</span></div>
      <button class="city-card__toggle" aria-expanded="${index === 0}" aria-controls="city-details-${index}" type="button">
        <span class="city-card__name">${city.hotelName}</span>
      </button>
      <div class="city-card__details" id="city-details-${index}" ${index ? 'inert' : ''}>
        <button class="city-room" data-city-book="${city.value}" type="button" aria-label="Explore ${city.hotelName} room options, sample starting rate IDR ${city.price}">
          <img src="${roomPreviewImage}" alt="" loading="lazy" decoding="async" />
          <span class="city-room__copy"><small>Rooms from</small><strong>IDR ${city.price}</strong><span>Sample / night</span></span><b aria-hidden="true">↗</b>
        </button>
      </div>
    </article>`).join('');

  const cards = [...stack.querySelectorAll('[data-city-card]')];
  let activeIndex = 0;

  const setActive = (index) => {
    activeIndex = index;
    cards.forEach((card, cardIndex) => {
      const active = cardIndex === index;
      card.classList.toggle('is-active', active);
      card.querySelector('.city-card__toggle').setAttribute('aria-expanded', String(active));
      card.querySelector('.city-card__details').inert = !active;
    });
  };

  cards.forEach((card, index) => {
    card.addEventListener('pointerenter', () => {
      if (matchMedia('(hover:hover)').matches) setActive(index);
    }, { passive:true });
    card.addEventListener('focusin', () => setActive(index));
    card.querySelector('.city-card__toggle').addEventListener('click', () => setActive(index));
  });

  stack.addEventListener('keydown', (event) => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const next = (activeIndex + (event.key === 'ArrowRight' ? 1 : -1) + cards.length) % cards.length;
    setActive(next);
    cards[next].focus();
  });

  new IntersectionObserver(([entry]) => {
    section.classList.toggle('is-in-view', entry.isIntersecting);
  }, { threshold:.18 }).observe(section);
}
