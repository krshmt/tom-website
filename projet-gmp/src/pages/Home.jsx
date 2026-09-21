import { useCallback, useEffect, useRef, useState } from 'react'
import ProjectPopup from '../components/ProjectPopup/ProjectPopup'
import Scene3D from '../components/Scene3D/Scene3D'
import { getScrollLength } from '../components/Scene3D/spiralLayout'
import { projets } from '../data/projets'
import './Home.css'

/**
 * Délai avant de masquer le popup. Évite un clignotement quand le curseur
 * passe directement d'une image à une autre : le navigateur envoie alors la
 * sortie de la première avant l'entrée sur la seconde.
 */
const DELAI_MASQUAGE = 40

/**
 * Page d'accueil : la scène 3D occupe tout l'écran, un bloc vide donne au
 * document la hauteur de scroll nécessaire pour traverser la spirale.
 */
export default function Home() {
  const scrollLength = getScrollLength(projets.length)

  const [visible, setVisible] = useState(false)
  // Dernier projet survolé : conservé le temps de l'animation de sortie.
  const [projetAffiche, setProjetAffiche] = useState(null)
  const timerRef = useRef(null)

  const handleHover = useCallback((projet) => {
    clearTimeout(timerRef.current)

    if (projet) {
      setProjetAffiche(projet)
      setVisible(true)
      return
    }

    timerRef.current = setTimeout(() => setVisible(false), DELAI_MASQUAGE)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <main className="home">
      <Scene3D projets={projets} onHover={handleHover} />

      <ProjectPopup projet={projetAffiche} visible={visible} />

      {/* Réserve la hauteur de scroll : c'est elle qui pilote la scène. */}
      <div
        className="home__scroll-space"
        style={{ height: `calc(${scrollLength}px + 100vh)` }}
        aria-hidden="true"
      />
    </main>
  )
}
