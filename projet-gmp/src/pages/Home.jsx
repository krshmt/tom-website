import { useCallback, useEffect, useRef, useState } from 'react'
import ProjectPopup from '../components/ProjectPopup/ProjectPopup'
import Scene3D from '../components/Scene3D/Scene3D'
import VideoPlayer from '../components/AboutVideo/VideoPlayer'
import VideoTrigger from '../components/AboutVideo/VideoTrigger'
import { projets } from '../data/projets'
import { useVideoThumbnails } from '../hooks/useVideoThumbnails'
import './Home.css'

/**
 * Délai avant de masquer le popup. Évite un clignotement quand le curseur
 * passe directement d'une image à une autre : le navigateur envoie alors la
 * sortie de la première avant l'entrée sur la seconde.
 */
const DELAI_MASQUAGE = 40

/** Vidéo de présentation et vignette qui l'ouvre. */
const VIDEO = '/video/uneminute.mp4'
const VIGNETTE_VIDEO = projets[0].image
/** Nombre d'images de la pellicule du lecteur. */
const VIGNETTES = 6

/** Doit rester aligné sur la durée du fondu dans Home.css. */
const DUREE_FONDU = 500

/**
 * Page d'accueil : la scène 3D occupe tout l'écran.
 *
 * La page elle-même ne défile pas : la scène est infinie, elle consomme
 * directement les deltas normalisés par Lenis (voir src/scroll/lenis.js).
 * Le défilement natif est donc neutralisé ici, et rétabli sur les autres
 * pages du portfolio.
 *
 * L'ouverture de la vidéo efface toute la page en opacité. La pellicule du
 * lecteur est extraite pendant ce fondu : le lecteur n'apparaît qu'une fois
 * prête, pour qu'aucune vignette ne se remplisse sous les yeux du visiteur.
 */
export default function Home() {
  const [visible, setVisible] = useState(false)
  // Dernier projet survolé : conservé le temps de l'animation de sortie.
  const [projetAffiche, setProjetAffiche] = useState(null)
  const timerRef = useRef(null)

  // `extraction` amorce la pellicule dès le survol du déclencheur ;
  // `preparation` lance le fondu au clic ; `lecteurOuvert` monte le lecteur
  // une fois le fondu terminé ET la pellicule complète.
  const [extraction, setExtraction] = useState(false)
  const [preparation, setPreparation] = useState(false)
  const [lecteurOuvert, setLecteurOuvert] = useState(false)
  const debutRef = useRef(0)

  const { vignettes, pret } = useVideoThumbnails(extraction ? VIDEO : null, VIGNETTES)

  const handleHover = useCallback((projet) => {
    clearTimeout(timerRef.current)

    if (projet) {
      setProjetAffiche(projet)
      setVisible(true)
      return
    }

    timerRef.current = setTimeout(() => setVisible(false), DELAI_MASQUAGE)
  }, [])

  const ouvrirVideo = () => {
    setVisible(false)
    debutRef.current = performance.now()
    setExtraction(true)
    setPreparation(true)
  }

  const fermerVideo = () => {
    setLecteurOuvert(false)
    setPreparation(false)
  }

  // Le lecteur attend le fondu ET la pellicule, en prenant le plus long des deux.
  useEffect(() => {
    if (!preparation || !pret) return undefined

    const restant = Math.max(0, DUREE_FONDU - (performance.now() - debutRef.current))
    const minuteur = setTimeout(() => setLecteurOuvert(true), restant)
    return () => clearTimeout(minuteur)
  }, [preparation, pret])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // Les autres pages du portfolio gardent leur défilement normal.
  useEffect(() => {
    document.body.classList.add('is-scene')
    return () => document.body.classList.remove('is-scene')
  }, [])

  return (
    <main className="home">
      <div className={`home__contenu${preparation ? ' home__contenu--efface' : ''}`}>
        <Scene3D projets={projets} onHover={handleHover} />
        <ProjectPopup projet={projetAffiche} visible={visible} />
        <VideoTrigger
          image={VIGNETTE_VIDEO}
          onOpen={ouvrirVideo}
          onPrepare={() => setExtraction(true)}
        />
      </div>

      {lecteurOuvert && (
        <VideoPlayer src={VIDEO} vignettes={vignettes} onClose={fermerVideo} />
      )}
    </main>
  )
}
