import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Projet from './pages/Projet'
import { useDisplayedLocation } from './transitions/transitionContext'

/**
 * Les routes sont rendues pour la location « affichée » et non pour la
 * location réelle : c'est ce décalage qui laisse le temps à la transition
 * de jouer le fondu de sortie.
 */
export default function App() {
  const location = useDisplayedLocation()

  return (
    <Routes location={location}>
      <Route path="/" element={<Home />} />
      <Route path="/projet/:id" element={<Projet />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
