const newsEditorial = document.querySelector('.news-editorial');
if (newsEditorial) {
  // Begin the entrance while the previous section is still on screen.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  const cards = [...newsEditorial.querySelectorAll('.news-mini')];
  const previous = newsEditorial.previousElementSibling;
  const ease = value => 1 - Math.pow(1 - Math.max(0, Math.min(1, value)), 3);
  const render = () => {
    frame = 0;
    const boundary = previous ? previous.getBoundingClientRect().bottom : newsEditorial.getBoundingClientRect().top;
    // Scrub through the previous section's exit; complete when News settles below the nav.
    const progress = Math.max(0, Math.min(1, (innerHeight - boundary) / Math.max(1, innerHeight - 110)));
    newsEditorial.style.setProperty('--news-entry', reduced.matches ? 1 : 1 - Math.pow(1 - progress, 3));
    newsEditorial.style.setProperty('--news-glass', reduced.matches ? 1 : ease((progress - .15) / .75));
    cards.forEach((card, index) => card.style.setProperty('--card-entry', reduced.matches ? 1 : ease((progress - .08 - index * .08) / .68)));
  };
  const queue = () => { if (!frame) frame = requestAnimationFrame(render); };
  addEventListener('scroll', queue, { passive:true });
  addEventListener('resize', queue);
  reduced.addEventListener('change', queue);
  newsEditorial.querySelectorAll('.news-arrow,.news-mini > a > b,.news-editorial__heading a b').forEach(arrow => {
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden', 'true');
  });
  render();
}
