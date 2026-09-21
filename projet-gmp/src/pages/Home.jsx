import { useCallback, useEffect, useRef, useState } from 'react'
import ProjectPopup from '../components/ProjectPopup/ProjectPopup'
import Scene3D from '../components/Scene3D/Scene3D'
import { projets } from '../data/projets'
import './Home.css'

/**
 * Délai avant de masquer le popup. Évite un clignotement quand le curseur
 * passe directement d'une image à une autre : le navigateur envoie alors la
 * sortie de la première avant l'entrée sur la seconde.
 */
const DELAI_MASQUAGE = 40

/**
 * Page d'accueil : la scène 3D occupe tout l'écran.
 *
 * La page elle-même ne défile pas — la scène est infinie, elle est pilotée
 * par un scroll virtuel (molette / tactile / clavier) géré dans
 * `useScrollProgress`. Le défilement natif est donc neutralisé ici.
 */
export default function Home() {
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

  // Les autres pages du portfolio gardent leur défilement normal.
  useEffect(() => {
    document.body.classList.add('is-locked')
    return () => document.body.classList.remove('is-locked')
  }, [])

  return (
    <main className="home">
      <Scene3D projets={projets} onHover={handleHover} />
      <ProjectPopup projet={projetAffiche} visible={visible} />
    </main>
  )
}
