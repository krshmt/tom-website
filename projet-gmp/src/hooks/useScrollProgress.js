import { useEffect, useRef } from 'react'
import { SCENE } from '../config/sceneConfig'
import { getProgressFromScroll } from '../components/Scene3D/spiralLayout'

const FRAME = 1000 / 60
const EPSILON = 0.0004

/**
 * Traduit le scroll de la page en progression lissée, puis appelle `onFrame`
 * à chaque image tant que le mouvement n'est pas terminé.
 *
 * Le lissage est une interpolation exponentielle compensée par le delta de
 * temps : le rendu est identique en 60 Hz et en 120 Hz.
 *
 * `onFrame` reçoit la progression en nombre de projets. La boucle s'arrête
 * d'elle-même une fois la cible atteinte et repart au prochain scroll.
 */
export function useScrollProgress(onFrame) {
  const callback = useRef(onFrame)

  useEffect(() => {
    callback.current = onFrame
  }, [onFrame])

  useEffect(() => {
    let target = getProgressFromScroll(window.scrollY)
    let current = target
    let lastTime = 0
    let rafId = null

    const tick = (time) => {
      const delta = lastTime ? Math.min(time - lastTime, 64) : FRAME
      lastTime = time

      // Lissage exponentiel indépendant du taux de rafraîchissement.
      const factor = 1 - Math.pow(1 - SCENE.smoothing, delta / FRAME)
      current += (target - current) * factor

      if (Math.abs(target - current) < EPSILON) {
        current = target
        rafId = null
        lastTime = 0
        callback.current(current)
        return
      }

      callback.current(current)
      rafId = requestAnimationFrame(tick)
    }

    const start = () => {
      if (rafId === null) {
        lastTime = 0
        rafId = requestAnimationFrame(tick)
      }
    }

    const handleScroll = () => {
      target = getProgressFromScroll(window.scrollY)
      start()
    }

    // Première position appliquée immédiatement, sans animation.
    callback.current(current)

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])
}
