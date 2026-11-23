import './experience-motion.css'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
const canHover = window.matchMedia('(pointer: fine)').matches

// A small, Webflow-style editorial reveal layer. The existing scroll scenes
// remain in charge of their own timelines; these only choreograph their entry.
const revealGroups = [
  ['.city-heading', 'motion-rise'],
  ['.fave-introduction__copy', 'motion-soft'],
  ['.offers-heading', 'motion-rise'],
  ['.offer-handnote', 'motion-swipe'],
  ['.social-heading', 'motion-rise'],
  ['.newsletter__inner', 'motion-soft'],
  ['.footer__main', 'motion-rise'],
  ['.footer__legal', 'motion-swipe'],
]

if (!reduced.matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) target.classList.add('is-motion-visible')
    })
  }, { threshold: .16, rootMargin: '0px 0px -7%' })

  revealGroups.forEach(([selector, className]) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.classList.add('motion-enter', className)
      observer.observe(element)
    })
  })
}

// Deliberately reserved for the editorial cards—not City—so each content type
// feels distinct and city card imagery remains calm while its arrow reacts.
if (canHover && !reduced.matches) {
  document.querySelectorAll('.offer-card.tilt-card, .social-card.tilt-card').forEach((card) => {
    let frame = 0
    let point = null

    const paint = () => {
      frame = 0
      if (!point) return
      const rect = card.getBoundingClientRect()
      const x = (point.clientX - rect.left) / rect.width - .5
      const y = (point.clientY - rect.top) / rect.height - .5
      card.style.setProperty('--tilt-x', `${-y * 3.4}deg`)
      card.style.setProperty('--tilt-y', `${x * 4.2}deg`)
      card.style.setProperty('--lift', '-7px')
      card.style.setProperty('--interactive-glow-x', `${(x + .5) * 100}%`)
      card.style.setProperty('--interactive-glow-y', `${(y + .5) * 100}%`)
    }

    card.addEventListener('pointermove', (event) => {
      point = event
      if (!frame) frame = requestAnimationFrame(paint)
    })
    card.addEventListener('pointerleave', () => {
      point = null
      card.style.setProperty('--tilt-x', '0deg')
      card.style.setProperty('--tilt-y', '0deg')
      card.style.setProperty('--lift', '0px')
    })
  })
}
