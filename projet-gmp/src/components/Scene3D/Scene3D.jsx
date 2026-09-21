import { useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { SCENE } from '../../config/sceneConfig'
import { useScrollProgress } from '../../hooks/useScrollProgress'
import { computePlane, formatTransform, getViewportFit } from './spiralLayout'
import './Scene3D.css'

/**
 * Scène 3D : les projets sont disposés sur une hélice et repositionnés à
 * chaque image en fonction de la progression du scroll.
 *
 * Les transforms sont écrites directement dans le DOM (pas de state React) :
 * la scène est animée à 60 fps sans provoquer le moindre re-render. Les plans
 * n'ont donc aucun `style` géré par React, qui pourrait écraser ces écritures.
 *
 * Tous les réglages visuels vivent dans `src/config/sceneConfig.js`,
 * toute la géométrie dans `spiralLayout.js`.
 *
 * `onHover` reçoit le projet survolé, ou `null` quand le survol s'arrête.
 */
export default function Scene3D({ projets, onHover }) {
  const planeRefs = useRef([])
  const fitRef = useRef(getViewportFit(window.innerWidth))

  // Déclaré avant `useScrollProgress` pour que le facteur responsive soit à
  // jour avant que la boucle d'animation ne réagisse au redimensionnement.
  useEffect(() => {
    const handleResize = () => {
      fitRef.current = getViewportFit(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const applyProgress = useCallback((progress) => {
    const fit = fitRef.current

    for (let index = 0; index < planeRefs.current.length; index += 1) {
      const element = planeRefs.current[index]
      if (!element) continue

      const plane = computePlane(index, progress, fit)

      if (!plane.visible) {
        element.style.visibility = 'hidden'
        element.style.pointerEvents = 'none'
        continue
      }

      element.style.visibility = 'visible'
      element.style.opacity = plane.opacity
      element.style.transform = formatTransform(plane)
      // Un projet trop effacé ne doit plus intercepter les clics.
      element.style.pointerEvents = plane.opacity > 0.35 ? 'auto' : 'none'
    }
  }, [])

  useScrollProgress(applyProgress)

  return (
    <div
      className="scene"
      style={{
        '--scene-perspective': `${SCENE.perspective}px`,
        '--scene-origin-x': SCENE.perspectiveOrigin.x,
        '--scene-origin-y': SCENE.perspectiveOrigin.y,
        '--plane-width': `${SCENE.imageWidth}px`,
        '--plane-height': `${Math.round(SCENE.imageWidth * SCENE.imageRatio)}px`,
      }}
    >
      <div className="scene__stage">
        {projets.map((projet, index) => (
          <Link
            key={projet.id}
            to={`/projet/${projet.id}`}
            className="plane"
            aria-label={`${projet.nom}, ${projet.annee}`}
            ref={(element) => {
              planeRefs.current[index] = element
            }}
            onMouseEnter={() => onHover?.(projet)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(projet)}
            onBlur={() => onHover?.(null)}
          >
            <img
              className="plane__image"
              src={projet.image}
              alt={projet.nom}
              draggable={false}
              decoding="async"
            />
          </Link>
        ))}
      </div>
      <div className="scene__vignette" aria-hidden="true" />
    </div>
  )
}
