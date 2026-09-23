import Lenis from 'lenis'
import { SCENE } from '../config/sceneConfig'

/**
 * Défilement lissé Lenis, pour tout le site.
 *
 * Instance unique, créée au démarrage, volontairement hors de React : il n'y
 * en a qu'une pour toute la durée de vie de l'application et elle doit
 * exister avant le premier rendu.
 *
 * Deux usages :
 *   - pages classiques (page projet) : Lenis lisse le défilement du document,
 *     comme prévu ;
 *   - homepage : la scène 3D capte les deltas normalisés par Lenis via
 *     `captureScroll` et le document ne défile pas. La scène reste ainsi
 *     infinie dans les deux sens, ce qu'une hauteur de page finie ne
 *     permettrait pas, tout en profitant de la normalisation molette /
 *     tactile de Lenis.
 *
 * Réglages dans `src/config/sceneConfig.js`.
 */

/** Consommateur courant des deltas, ou `null` si le document défile. */
let consommateur = null

export const lenis = new Lenis({
  // `lerp` est le lissage : 0.02 = très flottant, 1 = collé à l'entrée.
  lerp: SCENE.smoothing,
  wheelMultiplier: SCENE.scrollSpeed,
  touchMultiplier: SCENE.scrollSpeed,
  // Le tactile passe par le même lissage que la molette.
  syncTouch: true,
  // Lenis pilote sa propre boucle d'animation.
  autoRaf: true,
  // Dernier filtre avant que Lenis ne consomme l'évènement.
  virtualScroll: ({ deltaY }) => {
    if (!consommateur) return true
    consommateur(deltaY)
    // `false` : Lenis n'applique pas le delta, le document reste immobile.
    return false
  },
})

/**
 * Détourne les deltas de défilement vers `onDelta` au lieu de faire défiler
 * le document. Renvoie la fonction à appeler pour rendre la main.
 */
export function captureScroll(onDelta) {
  consommateur = onDelta
  return () => {
    if (consommateur === onDelta) consommateur = null
  }
}

/** Ramène le document en haut, sans animation, au changement de page. */
export function resetScroll() {
  lenis.resize()
  lenis.scrollTo(0, { immediate: true, force: true })
  lenis.targetScroll = 0
  lenis.animatedScroll = 0
}

// En développement, chaque rechargement à chaud de ce module créerait une
// instance supplémentaire : l'ancienne garderait sa boucle d'animation et ses
// écouteurs, et les deux se disputeraient le défilement.
if (import.meta.hot) {
  import.meta.hot.dispose(() => lenis.destroy())
}
