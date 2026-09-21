import { createContext, useContext } from 'react'

/**
 * Expose la location « affichée », qui est en retard sur la location réelle
 * du routeur pendant toute la durée de la transition.
 */
export const TransitionContext = createContext(null)

/**
 * Location à rendre dans les <Routes>. À utiliser à la place de useLocation()
 * pour que l'ancienne page reste montée le temps de l'animation de sortie.
 */
export function useDisplayedLocation() {
  const context = useContext(TransitionContext)

  if (!context) {
    throw new Error('useDisplayedLocation doit être utilisé dans <PageTransition>')
  }

  return context.location
}
