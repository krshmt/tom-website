import { useCallback, useEffect, useRef } from 'react'
import { SCENE } from '../config/sceneConfig'

const FRAME = 1000 / 60
const EPSILON = 0.0004
const LINE_HEIGHT = 16
const KEYS_DOWN = ['ArrowDown', 'PageDown', ' ', 'Spacebar']
const KEYS_UP = ['ArrowUp', 'PageUp']

/** Ramène un delta de molette en pixels, quel que soit le mode de l'évènement. */
function toPixels(event) {
  if (event.deltaMode === 1) return event.deltaY * LINE_HEIGHT
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight
  return event.deltaY
}

/**
 * Pilote le déplacement de la scène à partir des entrées de l'utilisateur.
 *
 * Le scroll est volontairement virtuel : la page n'a aucune hauteur et la
 * progression n'est jamais bornée, ce qui rend la spirale infinie dans les
 * deux sens. Molette, tactile et clavier alimentent la même valeur cible.
 *
 * `onFrame` reçoit :
 *   - `progress` : position de la caméra, en nombre de projets ;
 *   - `velocity` : variation de `progress` par frame (signée), déjà lissée.
 * S'il renvoie `true`, la boucle continue même une fois le scroll au repos
 * (utile tant qu'une autre animation tourne : survol, déformation…).
 *
 * Renvoie une fonction permettant de réveiller la boucle depuis l'extérieur
 * (survol, image fraîchement chargée, redimensionnement…).
 */
export function useScrollProgress(onFrame) {
  const callback = useRef(onFrame)
  const startRef = useRef(() => {})

  useEffect(() => {
    callback.current = onFrame
  }, [onFrame])

  useEffect(() => {
    let target = 0
    let current = 0
    let velocity = 0
    let lastTime = 0
    let rafId = null
    let touchY = null

    const tick = (time) => {
      const delta = lastTime ? Math.min(time - lastTime, 64) : FRAME
      lastTime = time

      // Lissage exponentiel indépendant du taux de rafraîchissement.
      const factor = 1 - Math.pow(1 - SCENE.smoothing, delta / FRAME)
      const previous = current
      current += (target - current) * factor

      // Vitesse ramenée à une frame de référence : alimente la déformation.
      velocity = ((current - previous) * FRAME) / delta

      const settled = Math.abs(target - current) < EPSILON
      if (settled) {
        current = target
        velocity = 0
      }

      const stillAnimating = callback.current({ progress: current, velocity })

      if (settled && !stillAnimating) {
        rafId = null
        lastTime = 0
        return
      }

      rafId = requestAnimationFrame(tick)
    }

    const start = () => {
      if (rafId === null) {
        lastTime = 0
        rafId = requestAnimationFrame(tick)
      }
    }
    startRef.current = start

    const advance = (pixels) => {
      target += (pixels * SCENE.scrollSpeed) / SCENE.scrollPerProject
      start()
    }

    const handleWheel = (event) => {
      event.preventDefault()
      advance(toPixels(event))
    }

    const handleTouchStart = (event) => {
      touchY = event.touches[0]?.clientY ?? null
    }

    const handleTouchMove = (event) => {
      if (touchY === null) return
      const y = event.touches[0]?.clientY ?? touchY
      advance(touchY - y)
      touchY = y
    }

    const handleTouchEnd = () => {
      touchY = null
    }

    const handleKeyDown = (event) => {
      if (KEYS_DOWN.includes(event.key)) advance(SCENE.keyboardStep)
      else if (KEYS_UP.includes(event.key)) advance(-SCENE.keyboardStep)
      else return
      event.preventDefault()
    }

    // Première position appliquée immédiatement ; la boucle ne démarre que si
    // ce premier rendu demande d'autres frames.
    if (callback.current({ progress: current, velocity: 0 })) start()

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', start)

    return () => {
      startRef.current = () => {}
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', start)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return useCallback(() => startRef.current(), [])
}
