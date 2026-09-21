import { SCENE } from '../../config/sceneConfig'

const DEG = Math.PI / 180

/** Pseudo-aléatoire déterministe : même index → toujours la même valeur (-1 → 1). */
function noise(index, salt) {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453
  return (value - Math.floor(value)) * 2 - 1
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/** Interpolation linéaire inverse bornée : renvoie 0 → 1 entre `from` et `to`. */
function ramp(value, from, to) {
  if (from === to) return value >= to ? 1 : 0
  return clamp((value - from) / (to - from), 0, 1)
}

/**
 * Facteur de réduction global de la composition selon la largeur de fenêtre.
 * Permet de garder la spirale dans l'écran sur mobile sans toucher aux réglages.
 */
export function getViewportFit(width, config = SCENE) {
  const { referenceWidth, min, max } = config.responsive
  return clamp(width / referenceWidth, min, max)
}

/**
 * Convertit la position de scroll (px) en progression continue de la caméra,
 * exprimée en nombre de projets parcourus.
 */
export function getProgressFromScroll(scrollY, config = SCENE) {
  return scrollY / config.scrollPerProject - config.leadIn
}

/**
 * Hauteur de scroll nécessaire (px, hors hauteur de fenêtre) pour traverser
 * toute la spirale, du premier au dernier projet.
 */
export function getScrollLength(count, config = SCENE) {
  const span = Math.max(count - 1, 0) + config.leadIn + config.leadOut
  return span * config.scrollPerProject
}

/**
 * Position, rotation, échelle et opacité d'un projet pour une progression donnée.
 * Fonction pure : c'est le cœur de la spirale.
 *
 * @param {number} index    index du projet dans la liste
 * @param {number} progress progression de la caméra (en nombre de projets)
 * @param {number} fit      facteur de réduction responsive
 * @param {object} config   réglages de la scène
 */
export function computePlane(index, progress, fit = 1, config = SCENE) {
  const { rotation, variation, fade } = config

  // Profondeur : distance du projet à la caméra, en nombre de projets.
  const depth = index - progress

  // Position angulaire sur l'hélice.
  const angle =
    (config.startAngle + index * config.angleStep + progress * config.angleScroll) * DEG
  const sin = Math.sin(angle)
  const cos = Math.cos(angle)

  // Cercle (x, y) + descente progressive liée à la profondeur → hélice.
  const radiusFactor = 1 + noise(index, 1) * variation.radius
  const x = cos * config.radiusX * radiusFactor * fit
  const y = (sin * config.radiusY * radiusFactor - depth * config.descent) * fit
  const z = -depth * config.spacing

  // Chaque plan est orienté différemment selon sa place sur la spirale.
  const rotateX = rotation.x + sin * rotation.swing + noise(index, 3) * 8 * variation.rotation
  const rotateY = rotation.y + cos * rotation.swing + noise(index, 4) * 8 * variation.rotation
  const rotateZ = rotation.z + sin * rotation.roll + noise(index, 5) * 6 * variation.rotation

  const scale = config.scale * fit * (1 + noise(index, 2) * variation.scale)

  // Fondu au loin et fondu au passage de la caméra.
  const opacity =
    ramp(depth, fade.inStart, fade.inEnd) * ramp(depth, fade.outEnd, fade.outStart)

  return {
    depth,
    x,
    y,
    z,
    rotateX,
    rotateY,
    rotateZ,
    scale,
    opacity,
    visible: opacity > 0.005,
  }
}

/** Sérialise l'état d'un plan en valeur CSS `transform`. */
export function formatTransform(plane) {
  return (
    `translate3d(${plane.x.toFixed(2)}px, ${plane.y.toFixed(2)}px, ${plane.z.toFixed(2)}px) ` +
    `rotateX(${plane.rotateX.toFixed(2)}deg) ` +
    `rotateY(${plane.rotateY.toFixed(2)}deg) ` +
    `rotateZ(${plane.rotateZ.toFixed(2)}deg) ` +
    `scale(${plane.scale.toFixed(3)})`
  )
}
