import './introduction.css';
const introduction = document.querySelector('.fave-introduction');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
if (!introduction) {
  // The optional introduction scene is not present on every composition.
  // Keeping this module safe lets the rest of the motion system run normally.
} else {
let visible = false;
let frame = 0;
const update = () => {
  frame = 0;
  if (!visible || reducedMotion.matches) return;
  const rect = introduction.getBoundingClientRect();
  const progress = Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight+rect.height)));
  introduction.style.setProperty('--flower-drift',`${(progress-.5)*40}px`);
};
const queue = () => { if (visible && !frame) frame = requestAnimationFrame(update); };
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  introduction.classList.toggle('is-in-view',visible);
  queue();
}).observe(introduction);
window.addEventListener('scroll',queue,{passive:true});
window.addEventListener('resize',queue);
reducedMotion.addEventListener('change',() => {
  introduction.style.setProperty('--flower-drift','0px');
  queue();
});
}
