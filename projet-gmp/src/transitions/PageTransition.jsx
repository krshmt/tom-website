import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { TransitionContext } from './transitionContext'
import { pageTransition } from './transitionConfig'

/**
 * Orchestre la transition entre deux pages.
 *
 * Le composant retient la location « affichée » et ne la remplace qu'une fois
 * l'animation de sortie terminée. Les pages n'ont donc rien à savoir de la
 * transition : un <Link> ordinaire suffit.
 *
 * L'animation elle-même est entièrement décrite dans `transitionConfig.js`.
 */
export default function PageTransition({ children }) {
  const location = useLocation()
  const [displayed, setDisplayed] = useState(location)

  const containerRef = useRef(null)
  const animationRef = useRef(null)
  // Dernière page déjà animée à l'entrée. Initialisée sur la page de départ :
  // un chargement direct ne doit pas jouer d'animation.
  const enteredKey = useRef(location.key)

  // Une navigation est en cours tant que la location affichée est en retard.
  const isExiting = location.key !== displayed.key

  /** Joue une étape de la transition, en remplaçant celle éventuellement en cours. */
  const play = (step) => {
    const element = containerRef.current
    if (!element) return null

    animationRef.current?.cancel()
    const animation = element.animate(step.keyframes, step.options)
    animationRef.current = animation
    return animation
  }

  // 1. Sortie : on efface la page courante, puis on bascule sur la nouvelle.
  useEffect(() => {
    if (!isExiting) return

    const element = containerRef.current
    if (!element) return

    // La page sortante ne doit plus être cliquable pendant l'animation.
    element.style.pointerEvents = 'none'

    const animation = play(pageTransition.exit)
    if (!animation) return

    let cancelled = false
    animation.finished.then(
      () => {
        if (!cancelled) setDisplayed(location)
      },
      () => {}, // animation annulée : une autre navigation a pris le relais
    )

    return () => {
      cancelled = true
    }
  }, [isExiting, location])

  // 2. Entrée : dès que la page affichée change, on la fait apparaître.
  //    La garde est idempotente : le double appel des effets en StrictMode ne
  //    déclenche pas d'animation parasite au montage.
  useLayoutEffect(() => {
    if (enteredKey.current === displayed.key) return
    enteredKey.current = displayed.key

    const element = containerRef.current
    if (!element) return

    // La nouvelle page démarre en haut.
    window.scrollTo(0, 0)

    const animation = play(pageTransition.enter)
    animation?.finished.then(
      () => {
        element.style.pointerEvents = ''
      },
      () => {},
    )
  }, [displayed])

  const value = useMemo(() => ({ location: displayed }), [displayed])

  return (
    <TransitionContext.Provider value={value}>
      <div className="page-transition" ref={containerRef}>
        {children}
      </div>
    </TransitionContext.Provider>
  )
}
