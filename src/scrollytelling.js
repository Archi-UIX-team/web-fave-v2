import './scrollytelling.css'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
const scenes = [...document.querySelectorAll('.hero, .city-section, .fave-introduction, .story-scroll, .places-scroll, .offers, .expand-story, .app-section, .social-section, .newsletter, .footer')]
const rail = document.createElement('aside')
rail.className = 'scroll-spine'
rail.setAttribute('aria-hidden', 'true')
rail.innerHTML = '<span class="scroll-spine__label">FAVE / 01</span><i><b></b></i><span class="scroll-spine__count">01</span>'
document.body.append(rail)

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))
let scheduled = false
let lastY = window.scrollY
let velocity = 0

function update() {
  scheduled = false
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight)
  const progress = window.scrollY / max
  document.documentElement.style.setProperty('--site-progress', progress.toFixed(4))
  rail.querySelector('b').style.scale = `1 ${progress}`

  const activeIndex = scenes.findIndex((scene) => {
    const rect = scene.getBoundingClientRect()
    return rect.top <= innerHeight * .45 && rect.bottom >= innerHeight * .45
  })
  const index = Math.max(0, activeIndex)
  rail.querySelector('.scroll-spine__label').textContent = `FAVE / ${String(index + 1).padStart(2, '0')}`
  rail.querySelector('.scroll-spine__count').textContent = String(index + 1).padStart(2, '0')

  scenes.forEach((scene) => {
    const rect = scene.getBoundingClientRect()
    const progressInView = clamp((innerHeight - rect.top) / (innerHeight + rect.height))
    scene.style.setProperty('--scene-progress', progressInView.toFixed(4))
  })

  const introduction = document.querySelector('.fave-introduction')
  if (introduction && innerWidth > 600 && !reduced.matches) {
    const rect = introduction.getBoundingClientRect()
    const travel = Math.max(1, introduction.offsetHeight - innerHeight)
    const reveal = clamp(-rect.top / travel)
    introduction.style.setProperty('--about-circle', `${22 + reveal * 102}vmax`)
    introduction.style.setProperty('--about-copy-y', `${(1 - reveal) * 42}px`)
    introduction.style.setProperty('--about-copy-opacity', clamp((reveal - .12) / .5).toFixed(3))
  }

  const moodScene = document.querySelector('.places-scroll')
  if (moodScene && innerWidth > 600 && !reduced.matches) {
    const rect = moodScene.getBoundingClientRect()
    const track = Math.max(1, moodScene.offsetHeight - innerHeight)
    const p = clamp(-rect.top / track)
    const intensity = Math.sin(p * Math.PI)
    moodScene.style.setProperty('--mood-energy', intensity.toFixed(3))
    document.querySelectorAll('.place-card').forEach((card, index) => {
      const direction = index % 2 ? -1 : 1
      const drift = (1 - intensity) * direction * (8 + (index % 3) * 6) + velocity * direction * 12
      card.style.setProperty('--node-drift-y', `${drift}px`)
      card.style.setProperty('--node-turn', `${(1 - intensity) * direction * (index % 3 + 1.5)}deg`)
    })
    const finalCard = document.querySelector('.place-card--end')
    if (finalCard) {
      const handoff = clamp((p - .78) / .22)
      finalCard.style.setProperty('--ending-lift', `${-handoff * 58}px`)
      finalCard.style.setProperty('--ending-scale', String(1 + handoff * .08))
    }
  }
}

function request() {
  const delta = window.scrollY - lastY
  velocity += (delta - velocity) * .18
  lastY = window.scrollY
  if (!scheduled) { scheduled = true; requestAnimationFrame(update) }
}

window.addEventListener('scroll', request, { passive: true })
window.addEventListener('resize', request, { passive: true })
reduced.addEventListener('change', request)
request()
