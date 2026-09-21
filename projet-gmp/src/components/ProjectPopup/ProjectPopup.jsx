import { useLayoutEffect, useRef } from 'react'
import './ProjectPopup.css'

/**
 * ============================================================================
 *  ANIMATION DU POPUP — tout se règle ici.
 * ============================================================================
 *  Apparition : opacité 0 → 1, position y -20px → 0px (par rapport à sa
 *  position de repos en bas d'écran).
 *  Disparition : opacité 1 → 0, position y 0px → +20px.
 */
const POPUP_ANIMATION = {
  enter: {
    keyframes: [
      { opacity: 0, transform: 'translateY(20px)' },
      { opacity: 1, transform: 'translateY(0px)' },
    ],
    options: { duration: 200, easing: 'cubic-bezier(0.33, 0, 0.2, 1)', fill: 'forwards' },
  },
  leave: {
    keyframes: [
      { opacity: 1, transform: 'translateY(0px)' },
      { opacity: 0, transform: 'translateY(-20px)' },
    ],
    options: { duration: 200, easing: 'cubic-bezier(0.33, 0, 0.2, 1)', fill: 'forwards' },
  },
}

/**
 * Carte affichée en bas de l'écran pendant le survol d'un projet de la scène.
 *
 * Le contenu (`projet`) et la visibilité sont pilotés séparément : la carte
 * garde le dernier projet survolé le temps de jouer son animation de sortie.
 */
export default function ProjectPopup({ projet, visible }) {
  const containerRef = useRef(null)
  const animationRef = useRef(null)
  const isShown = useRef(false)

  useLayoutEffect(() => {
    if (visible === isShown.current) return
    isShown.current = visible

    const element = containerRef.current
    if (!element) return

    const step = visible ? POPUP_ANIMATION.enter : POPUP_ANIMATION.leave

    animationRef.current?.cancel()
    animationRef.current = element.animate(step.keyframes, step.options)
  }, [visible])

  if (!projet) return null

  return (
    // Doublon du lien de la scène pour un lecteur d'écran : on le masque.
    <div className="popup" ref={containerRef} aria-hidden="true">
      <div className="popup__card">
        <img className="popup__image" src={projet.image} alt="" />
        <span className="popup__name">{projet.nom}</span>
      </div>
    </div>
  )
}
