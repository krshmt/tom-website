import './VideoTrigger.css'

/** Géométrie du bloc, en unités du viewBox SVG. */
const BOITE = { largeur: 320, hauteur: 232 }
/** Marge entre le bord du viewBox et le trajet du texte. */
const MARGE = 11
/** Rayon des coins du trajet rectangulaire. */
const RAYON = 26

const LIBELLE = 'Qui suis-je ?'
/** Durée d'un tour complet du texte autour du cadre. */
const DUREE = '11s'

const TRAJET_L = BOITE.largeur - MARGE * 2
const TRAJET_H = BOITE.hauteur - MARGE * 2

/** Trajet : rectangle à coins arrondis, parcouru dans le sens horaire. */
const TRAJET = [
  `M ${MARGE + RAYON},${MARGE}`,
  `H ${MARGE + TRAJET_L - RAYON}`,
  `A ${RAYON},${RAYON} 0 0 1 ${MARGE + TRAJET_L},${MARGE + RAYON}`,
  `V ${MARGE + TRAJET_H - RAYON}`,
  `A ${RAYON},${RAYON} 0 0 1 ${MARGE + TRAJET_L - RAYON},${MARGE + TRAJET_H}`,
  `H ${MARGE + RAYON}`,
  `A ${RAYON},${RAYON} 0 0 1 ${MARGE},${MARGE + TRAJET_H - RAYON}`,
  `V ${MARGE + RAYON}`,
  `A ${RAYON},${RAYON} 0 0 1 ${MARGE + RAYON},${MARGE}`,
  'Z',
].join(' ')

/** Périmètre du trajet : deux segments droits par axe + les quatre quarts de cercle. */
const PERIMETRE =
  2 * (TRAJET_L - 2 * RAYON) + 2 * (TRAJET_H - 2 * RAYON) + 2 * Math.PI * RAYON

/**
 * Nombre de répétitions couvrant le périmètre. Le texte en compte une de
 * plus : c'est cette répétition supplémentaire qui entre par un bout pendant
 * que la première sort par l'autre, et qui rend la boucle invisible.
 */
const REPETITIONS = 7
const LONGUEUR_MOTIF = PERIMETRE / REPETITIONS

/**
 * Vignette d'ouverture de la vidéo de présentation, calée à moitié dans le
 * coin bas-gauche de la page d'accueil.
 *
 * Le texte tourne autour du cadre en suivant un trajet rectangulaire : on
 * décale son point de départ d'exactement un motif, si bien que la boucle ne
 * se voit pas.
 */
export default function VideoTrigger({ image, onOpen, onPrepare }) {
  const texte = Array.from({ length: REPETITIONS + 1 }, () => `${LIBELLE} • `).join('')

  return (
    // Le survol amorce l'extraction de la pellicule : au clic, elle est
    // déjà prête et le lecteur s'ouvre sans attente.
    <button
      type="button"
      className="video-trigger"
      onClick={onOpen}
      onMouseEnter={onPrepare}
      onFocus={onPrepare}
    >
      <span className="video-trigger__cadre">
        <img src={image} alt="" draggable={false} />
      </span>

      <svg
        className="video-trigger__marquee"
        viewBox={`0 0 ${BOITE.largeur} ${BOITE.hauteur}`}
        aria-hidden="true"
      >
        <defs>
          <path id="video-trigger-trajet" fill="none" d={TRAJET} />
        </defs>
        <text>
          <textPath
            href="#video-trigger-trajet"
            textLength={PERIMETRE + LONGUEUR_MOTIF}
            lengthAdjust="spacing"
            startOffset="0"
          >
            {texte}
            <animate
              attributeName="startOffset"
              from="0"
              to={-LONGUEUR_MOTIF}
              dur={DUREE}
              repeatCount="indefinite"
            />
          </textPath>
        </text>
      </svg>

      <span className="sr-only">Ouvrir la vidéo de présentation</span>
    </button>
  )
}
