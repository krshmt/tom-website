import { SCENE } from '../../config/sceneConfig'

const DEG = Math.PI / 180

/** Pseudo-aléatoire déterministe : même slot → toujours la même valeur (-1 → 1). */
function noise(slot, salt) {
  const value = Math.sin((slot + 1) * 127.1 + salt * 311.7) * 43758.5453
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
 * Projet occupant un slot donné. C'est ici que se joue la boucle infinie :
 * les slots avancent sans fin, les projets se répètent en boucle.
 * Fonctionne aussi pour les slots négatifs (scroll vers le haut).
 */
export function getProjectIndex(slot, count) {
  return ((slot % count) + count) % count
}

/**
 * Premier et dernier slot potentiellement visibles pour une progression donnée.
 * La fenêtre se décale avec le scroll : la scène n'a donc jamais de fin.
 */
export function getSlotRange(progress, config = SCENE) {
  const base = progress - config.cameraSetback
  return {
    first: Math.ceil(base + config.fade.outEnd),
    last: Math.floor(base + config.fade.inStart),
  }
}

/** Liste des slots visibles pour une progression donnée. */
export function getVisibleSlots(progress, config = SCENE) {
  const { first, last } = getSlotRange(progress, config)
  const slots = []
  for (let slot = first; slot <= last; slot += 1) slots.push(slot)
  return slots
}

/**
 * Position, échelle et opacité d'un slot pour une progression donnée.
 * Fonction pure : c'est le cœur de la spirale.
 *
 * @param {number} slot     emplacement sur la spirale (peut être négatif)
 * @param {number} progress progression de la caméra (en nombre de projets)
 * @param {number} fit      facteur de réduction responsive
 * @param {object} config   réglages de la scène
 */
export function computePlane(slot, progress, fit = 1, config = SCENE) {
  const { rotation, variation, fade } = config

  // Profondeur : distance du slot à la caméra, en nombre de projets.
  // `cameraSetback` recule le point de vue pour toute la scène d'un coup.
  const depth = slot - progress + config.cameraSetback

  // Position angulaire sur l'hélice.
  const angle =
    (config.startAngle + slot * config.angleStep + progress * config.angleScroll) * DEG
  const sin = Math.sin(angle)
  const cos = Math.cos(angle)

  // Cercle (x, y) + descente progressive liée à la profondeur → hélice.
  const radiusFactor = 1 + noise(slot, 1) * variation.radius
  const x = cos * config.radiusX * radiusFactor * fit
  const y = (sin * config.radiusY * radiusFactor - depth * config.descent) * fit
  const z = -depth * config.spacing

  // Orientation des plans (à 0 par défaut : images droites).
  const rotateX = rotation.x + sin * rotation.swing + noise(slot, 3) * 8 * variation.rotation
  const rotateY = rotation.y + cos * rotation.swing + noise(slot, 4) * 8 * variation.rotation
  const rotateZ = rotation.z + sin * rotation.roll + noise(slot, 5) * 6 * variation.rotation

  const scale = config.scale * fit * (1 + noise(slot, 2) * variation.scale)

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
