import data from './projets.json'

/**
 * Point d'accès unique aux données des projets.
 * Les composants ne lisent jamais le JSON directement : ils passent par ici.
 */
export const projets = data.projets

/** Libellés affichables pour le champ `type` du JSON. */
export const TYPE_LABELS = {
  academique: 'Académique',
  entreprise: 'Entreprise',
}

/** Retourne le projet correspondant à un `id`, ou `null` s'il n'existe pas. */
export function getProjetById(id) {
  return projets.find((projet) => projet.id === id) ?? null
}

/** Libellé lisible d'un type de projet. */
export function getTypeLabel(type) {
  return TYPE_LABELS[type] ?? type
}
