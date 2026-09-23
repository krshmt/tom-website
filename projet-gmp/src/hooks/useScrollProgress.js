import { useCallback, useEffect, useRef } from 'react'
import { SCENE } from '../config/sceneConfig'
import { captureScroll } from '../scroll/lenis'

const FRAME = 1000 / 60
const KEYS_DOWN = ['ArrowDown', 'PageDown', ' ', 'Spacebar']
const KEYS_UP = ['ArrowUp', 'PageUp']
/** En deçà, le geste est du bruit : le sens de la dérive ne change pas. */
const SEUIL_DIRECTION = 1

/**
 * Pilote le déplacement de la scène.
 *
 * Deux sources s'additionnent :
 *   - les gestes du visiteur, captés sur Lenis (molette et tactile déjà
 *     normalisés par lui) ainsi que le clavier ;
 *   - une dérive automatique continue, qui fait avancer la scène même à
 *     l'arrêt. Son sens suit le dernier sens de défilement : vers le haut,
 *     les projets s'éloignent au lieu de se rapprocher.
 *
 * La position est accumulée sans borne : la scène est donc réellement
 * infinie dans les deux sens, ce qu'une hauteur de page finie ne permettrait
 * pas. Le lissage reproduit celui de Lenis, avec le même réglage.
 *
 * `onFrame` reçoit :
 *   - `progress` : position de la caméra, en nombre de projets ;
 *   - `velocity` : variation de `progress` par frame (signée), lissée.
 *
 * Renvoie une fonction qui réveille la boucle depuis l'extérieur (survol,
 * image fraîchement chargée, redimensionnement…).
 */
export function useScrollProgress(onFrame) {
  const callback = useRef(onFrame)
  const startRef = useRef(() => {})

  useEffect(() => {
    callback.current = onFrame
  }, [onFrame])

  useEffect(() => {
    // Positions en pixels de défilement, jamais bornées.
    let cible = 0
    let courante = 0
    let precedente = 0
    let sens = 1
    let lastTime = 0
    let rafId = null

    const avancer = (pixels) => {
      cible += pixels
      if (SCENE.autoScroll.followDirection && Math.abs(pixels) > SEUIL_DIRECTION) {
        sens = Math.sign(pixels)
      }
    }

    const tick = (time) => {
      const delta = lastTime ? Math.min(time - lastTime, 64) : FRAME
      lastTime = time

      // 1. Dérive automatique : elle pousse la cible en continu.
      cible += sens * SCENE.autoScroll.speed * (delta / 1000)

      // 2. Lissage exponentiel, compensé par le delta de temps : le rendu est
      //    identique en 60 Hz et en 120 Hz.
      const facteur = 1 - Math.pow(1 - SCENE.smoothing, delta / FRAME)
      courante += (cible - courante) * facteur

      const progress = courante / SCENE.scrollPerProject
      const velocity = ((progress - precedente) * FRAME) / delta
      precedente = progress

      callback.current({ progress, velocity })
      rafId = requestAnimationFrame(tick)
    }

    const start = () => {
      if (rafId === null) {
        lastTime = 0
        rafId = requestAnimationFrame(tick)
      }
    }
    startRef.current = start

    const handleKeyDown = (event) => {
      if (KEYS_DOWN.includes(event.key)) avancer(SCENE.keyboardStep)
      else if (KEYS_UP.includes(event.key)) avancer(-SCENE.keyboardStep)
      else return
      event.preventDefault()
    }

    // Molette et tactile arrivent normalisés par Lenis ; le document, lui,
    // ne défile pas tant que la scène est montée.
    const libererScroll = captureScroll(avancer)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', start)

    // Première position appliquée immédiatement, puis la boucle tourne en
    // continu : la dérive automatique ne s'arrête jamais.
    callback.current({ progress: 0, velocity: 0 })
    start()

    return () => {
      startRef.current = () => {}
      libererScroll()
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', start)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return useCallback(() => startRef.current(), [])
}
