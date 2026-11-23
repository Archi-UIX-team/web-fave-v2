const entrance = document.querySelector('.entrance');
const stage = entrance.querySelector('.entrance__stage');
const hero = document.querySelector('.hero');
const nav = document.querySelector('.site-header');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const welcomeStart = location.hash === '#welcome';
if (welcomeStart) {
  history.scrollRestoration = 'manual';
  window.scrollTo({ top:0, behavior:'instant' });
}
const limit = value => Math.max(0, Math.min(1, value));
const ease = value => { const p = limit(value); return p * p * (3 - 2 * p); };
const naturalEase = value => -(Math.cos(Math.PI * limit(value)) - 1) / 2;
const between = (p, from, to) => ease((p - from) / (to - from));
const mix = (a,b,p) => a + (b-a)*p;
let tick = 0;
let heroShift = 0;

function renderEntrance() {
  tick = 0;
  const rect = entrance.getBoundingClientRect();
  const viewport = window.innerHeight;
  // Measure the layout position, excluding our visual handoff translation.
  const heroTop = hero.getBoundingClientRect().top - heroShift;
  const active = heroTop > 80;
  if (active && entrance.dataset.autoplay === 'done') setPlaybackState('paused');
  document.body.classList.toggle('entrance-running', active);
  nav.inert = active;
  entrance.inert = rect.bottom <= 0;
  if (motion.matches) {
    heroShift = 0;
    hero.style.setProperty('--entry-hero-shift','0px');
    hero.style.setProperty('--entry-hero-opacity','1');
    hero.style.setProperty('--entry-hero-title','1');
    hero.style.setProperty('--entry-hero-booking','1');
    hero.style.setProperty('--entry-hero-gallery','1');
    hero.inert = false;
    return;
  }
  // Complete the doorway before the hero overlaps the last sticky viewport.
  const p = limit(-rect.top / Math.max(1,rect.height - viewport));
  const handoff = between(1 - heroTop / viewport,0,1);
  const doorway = between(p,.08,.34);
  const expansion = between(p,.36,.7);
  const arrivalReveal = between(p,.44,.58);
  const arrival = (p > .44 ? 1 : 0) * (1-between(handoff,0,.15));
  // A distinct circular foreground rises over the photograph first;
  // the flat hero is revealed only after that circle fills the viewport.
  heroShift = heroTop > 0 && heroTop <= viewport ? -heroTop : 0;
  hero.style.setProperty('--entry-hero-shift', `${heroShift}px`);
  hero.style.setProperty('--entry-hero-opacity', String(between(handoff,.62,.96)));
  hero.style.setProperty('--entry-hero-title',String(between(handoff,.66,.8)));
  hero.style.setProperty('--entry-hero-booking',String(between(handoff,.72,.88)));
  hero.style.setProperty('--entry-hero-gallery',String(between(handoff,.79,.96)));
  hero.inert = active;
  stage.style.setProperty('--entry-controls', 1-between(handoff,.05,.35));
  const width = window.innerWidth;
  const baseWidth = Math.min(width * (width <= 800 ? .68 : .38),650);
  const baseHeight = viewport * .76;
  // One arched silhouette grows continuously with the scroll position.
  const finalScale = Math.max(width / baseWidth * 1.55, viewport / baseHeight * 1.8);
  const portalScale = mix(.2,1,doorway) * mix(1,finalScale,expansion);
  stage.style.setProperty('--entry-logo',1-between(p,.07,.22));
  stage.style.setProperty('--entry-logo-y',`${-45*between(p,.04,.22)}px`);
  stage.style.setProperty('--entry-portal',between(p,.09,.16));
  // Apply that single scale to the vector geometry, not the bitmap layer;
  // otherwise browsers can magnify a small cached image and soften the photo.
  stage.style.setProperty('--entry-width',`${baseWidth*portalScale}px`);
  stage.style.setProperty('--entry-height',`${baseHeight*portalScale}px`);
  stage.style.setProperty('--entry-portal-scale',portalScale);
  stage.style.setProperty('--entry-portal-top','58%');
  stage.style.setProperty('--entry-radius',`${baseWidth*portalScale/2}px ${baseWidth*portalScale/2}px 0 0`);
  stage.style.setProperty('--entry-photo-width',`${width+20}px`);
  stage.style.setProperty('--entry-photo-height',`${viewport+160}px`);
  stage.style.setProperty('--entry-image-cut',`${100*(1-between(p,.18,.38))}%`);
  stage.style.setProperty('--entry-image-scale',mix(1.12,1,between(p,.24,.7)));
  stage.style.setProperty('--entry-photo-y',`${mix(28,-8,between(p,.2,.72))}px`);
  stage.style.setProperty('--entry-portal-turn',`${mix(-1.2,0,between(p,.1,.58))}deg`);
  stage.style.setProperty('--entry-portal-light',between(p,.34,.72));
  stage.style.setProperty('--entry-atmosphere',1-between(p,.64,.86));
  stage.style.setProperty('--entry-cloud-x',`${mix(-18,22,p)}px`);
  stage.style.setProperty('--entry-cloud-y',`${mix(16,-14,p)}px`);
  stage.style.setProperty('--entry-cloud-turn',`${mix(-4,8,p)}deg`);
  stage.style.setProperty('--entry-cloud-x-alt',`${mix(20,-18,p)}px`);
  stage.style.setProperty('--entry-cloud-y-alt',`${mix(-10,12,p)}px`);
  stage.style.setProperty('--entry-cloud-turn-alt',`${mix(3,-6,p)}deg`);
  stage.style.setProperty('--entry-grain-x',`${(p*17)%5}px`);
  stage.style.setProperty('--entry-grain-y',`${(p*23)%5}px`);
  stage.style.setProperty('--entry-frame',1-between(p,.53,.68));
  stage.style.setProperty('--entry-mobile-sides',1-between(p,.08,.24));
  stage.style.setProperty('--entry-turn',`${p*32}deg`);
  stage.style.setProperty('--entry-arrival',arrival);
  stage.style.setProperty('--entry-arrival-y',`${-20*handoff}px`);
  stage.style.setProperty('--entry-line-one',`${105*(1-arrivalReveal)}%`);
  stage.style.setProperty('--entry-line-two',`${105*(1-between(p,.48,.62))}%`);
  stage.style.setProperty('--entry-detail',between(p,.56,.66));
  const circleProgress = between(handoff,0,.74);
  const circleSize = mix(Math.max(width*1.08,viewport*1.16), Math.hypot(width,viewport)*2.15,circleProgress);
  stage.style.setProperty('--entry-circle-size',`${circleSize}px`);
  stage.style.setProperty('--entry-circle-top',`${mix(viewport*1.045,viewport*.5-circleSize*.5,circleProgress)}px`);
  stage.style.setProperty('--entry-circle-copy',1-between(handoff,.42,.7));
  stage.style.setProperty('--entry-circle-turn',`${mix(-11,18,circleProgress)}deg`);
  stage.style.setProperty('--entry-circle-type-turn',`${mix(-3,4,circleProgress)}deg`);
  stage.style.setProperty('--entry-circle-mark-y',`${mix(18,-18,circleProgress)}px`);
}
function requestRender() { if (!tick) tick=requestAnimationFrame(renderEntrance); }
window.addEventListener('scroll', requestRender, { passive:true });
window.addEventListener('resize', requestRender, { passive:true });
motion.addEventListener('change', requestRender);
entrance.querySelector('.entrance__skip').addEventListener('click', event => {
  event.preventDefault();
  pauseAutomatic();
  window.scrollTo({ top:window.scrollY + hero.getBoundingClientRect().top - heroShift, behavior:'instant' });
  hero.querySelector('h1').setAttribute('tabindex','-1');
  hero.querySelector('h1').focus({preventScroll:true});
  requestRender();
});
renderEntrance();

// Autoplay uses the same real scroll progression as manual input. It yields
// immediately to the visitor, pauses in background tabs, and ends at the hero.
const playback = entrance.querySelector('.entrance__playback');
let autoFrame = 0;
let launchTimer = 0;
let autoTime = 0;
let previousAutoTime = 0;
let autoStart = 0;
let autoDuration = 1500;
let running = false;
let userIntervened = false;

function setPlaybackState(state) {
  entrance.dataset.autoplay = state;
  playback.hidden = state === 'done' || motion.matches;
  playback.setAttribute('aria-pressed', String(state === 'paused'));
  playback.setAttribute('aria-label', state === 'paused' ? 'Resume automatic intro' : 'Pause automatic intro');
  playback.innerHTML = state === 'paused' ? 'resume intro <span aria-hidden="true">▷</span>' : 'pause intro <span aria-hidden="true">Ⅱ</span>';
  requestRender();
}

function pauseAutomatic() {
  userIntervened = true;
  clearTimeout(launchTimer);
  launchTimer = 0;
  cancelAnimationFrame(autoFrame);
  autoFrame = 0;
  running = false;
  previousAutoTime = 0;
  setPlaybackState(hero.getBoundingClientRect().top - heroShift <= 1 ? 'done' : 'paused');
}

function advanceAutomatic(time) {
  autoFrame = 0;
  if (!running || motion.matches || document.hidden) { previousAutoTime = 0; return; }
  autoTime += previousAutoTime ? Math.min(time - previousAutoTime, 48) : 0;
  previousAutoTime = time;
  const target = window.scrollY + hero.getBoundingClientRect().top - heroShift;
  const progress = limit(autoTime / autoDuration);
  const position = autoStart + (target - autoStart) * naturalEase(progress);
  window.scrollTo({ top:position, behavior:'instant' });
  if (progress >= 1) {
    running = false;
    setPlaybackState('done');
  } else autoFrame = requestAnimationFrame(advanceAutomatic);
}

function startAutomatic() {
  if (motion.matches || hero.getBoundingClientRect().top - heroShift <= 1) { setPlaybackState('done'); return; }
  autoStart = window.scrollY;
  const remaining = hero.getBoundingClientRect().top - heroShift;
  autoDuration = Math.max(1400,1500 * remaining / (remaining + autoStart));
  autoTime = 0;
  previousAutoTime = 0;
  running = true;
  setPlaybackState('running');
  if (!document.hidden) autoFrame = requestAnimationFrame(advanceAutomatic);
}

playback.addEventListener('click', () => {
  if (running || launchTimer) { pauseAutomatic(); launchTimer = 0; }
  else startAutomatic();
});
window.addEventListener('wheel', pauseAutomatic, { passive:true });
window.addEventListener('touchstart', event => {
  if (!event.target.closest('.entrance__playback')) pauseAutomatic();
}, { passive:true });
window.addEventListener('pointerdown', event => {
  if (!event.target.closest('.entrance__playback')) pauseAutomatic();
}, { passive:true });
window.addEventListener('keydown', event => {
  if (event.target.closest('.entrance__playback') && event.key !== 'Escape') return;
  if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' ','Tab','Escape'].includes(event.key)) pauseAutomatic();
});
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(autoFrame);
  autoFrame = 0;
  previousAutoTime = 0;
  if (!document.hidden && running) autoFrame = requestAnimationFrame(advanceAutomatic);
});
motion.addEventListener('change', pauseAutomatic);

function scheduleAutomatic() {
  const hasDeepLink = location.hash && !['#top','#welcome'].includes(location.hash);
  if (welcomeStart) window.scrollTo({ top:0, behavior:'instant' });
  if (userIntervened || (!welcomeStart && window.scrollY > 5) || hasDeepLink || motion.matches) { setPlaybackState('paused'); return; }
  // Keep the branded splash moment brief, then hand off to the hero in under two seconds.
  launchTimer = window.setTimeout(() => { launchTimer = 0; startAutomatic(); },100);
}
if (document.readyState === 'complete') scheduleAutomatic();
else window.addEventListener('load',scheduleAutomatic,{once:true});
