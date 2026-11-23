// An open elliptical orbit preserves a quiet, readable center for the signup.
const scene = document.querySelector('.newsletter__scene');
const gallery = scene.querySelector('.newsletter__photos');
const photos = [...gallery.querySelectorAll('.newsletter__photo')];
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let visible = false;
let frame = 0;
let previousTime = 0;
let phase = 0;
let geometry;
const clamp01 = value => Math.min(1, Math.max(0, value));
const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };

function measure() {
  const mobile = window.innerWidth <= 600;
  geometry = {
    width: scene.clientWidth,
    height: scene.clientHeight,
    centerY: mobile ? .29 : .76,
    radiusY: mobile ? .22 : .65,
    radiusX: mobile ? .47 : .43,
    photos: photos.filter(photo => getComputedStyle(photo).display !== 'none')
      .map(photo => ({ element: photo, width: photo.offsetWidth, height: photo.offsetHeight }))
  };
}

function stop() {
  cancelAnimationFrame(frame);
  frame = 0;
  previousTime = 0;
}

function animate(time) {
  frame = 0;
  if (!visible || document.hidden || motionPreference.matches) return;
  phase = (phase + (previousTime ? Math.min(time - previousTime, 48) : 0) / 90000) % 1;
  previousTime = time;
  const top = scene.getBoundingClientRect().top;
  const viewportHeight = window.innerHeight;
  const { width, height, centerY, radiusX, radiusY } = geometry;
  geometry.photos.forEach(({ element, width: cardWidth, height: cardHeight }, index, list) => {
    const progress = (index / list.length + .04 + phase) % 1;
    const degrees = -195 + progress * 210;
    const radians = degrees * Math.PI / 180;
    const x = width * (.5 + radiusX * Math.cos(radians));
    const y = height * (centerY + radiusY * Math.sin(radians));
    const tilt = Math.max(-38, Math.min(38, degrees + 90));
    const edgeFade = smooth(progress / .09) * smooth((1 - progress) / .09);
    const viewportFade = 1 - smooth((top + y - viewportHeight * .72) / (viewportHeight * .32));
    element.style.transform = `translate3d(${x - cardWidth / 2}px,${y - cardHeight / 2}px,0) rotate(${tilt}deg)`;
    element.style.opacity = String(edgeFade * viewportFade);
  });
  frame = requestAnimationFrame(animate);
}

function start() {
  if (!visible || document.hidden || motionPreference.matches || frame) return;
  gallery.classList.add('is-orbiting');
  measure();
  frame = requestAnimationFrame(animate);
}

new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  visible ? start() : stop();
}, { threshold: 0 }).observe(scene);
window.addEventListener('resize', measure, { passive: true });
document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
motionPreference.addEventListener('change', () => {
  stop();
  if (motionPreference.matches) {
    gallery.classList.remove('is-orbiting');
    photos.forEach(photo => { photo.style.transform = ''; photo.style.opacity = ''; });
  } else start();
});
