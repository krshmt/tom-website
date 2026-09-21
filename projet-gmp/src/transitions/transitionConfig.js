/**
 * ============================================================================
 *  TRANSITION ENTRE LES PAGES — v1 : simple fondu d'opacité.
 * ============================================================================
 *
 *  C'est le SEUL fichier à modifier pour changer la transition.
 *  Ni la homepage, ni la scène 3D, ni la page projet n'en dépendent :
 *  elles utilisent des <Link> ordinaires, `PageTransition` fait le reste.
 *
 *  Déroulé d'une navigation :
 *    1. `exit`  est joué sur la page sortante ;
 *    2. la page entrante est montée une fois `exit` terminé ;
 *    3. `enter` est joué sur la page entrante.
 *
 *  Chaque étape est décrite par des keyframes de la Web Animations API
 *  (element.animate). Pour une transition plus avancée plus tard, il suffit
 *  d'enrichir ces keyframes (transform, filter, clip-path…) ou d'allonger les
 *  durées : aucune autre partie du code n'a besoin de changer.
 */

const EASING = 'cubic-bezier(0.33, 0, 0.2, 1)'

export const pageTransition = {
  /** Page sortante. `fill: forwards` la maintient invisible jusqu'à la bascule. */
  exit: {
    keyframes: [{ opacity: 1 }, { opacity: 0 }],
    options: { duration: 420, easing: EASING, fill: 'forwards' },
  },

  /** Page entrante. `fill: backwards` évite tout flash avant le premier rendu. */
  enter: {
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    options: { duration: 520, easing: EASING, fill: 'backwards' },
  },
}
