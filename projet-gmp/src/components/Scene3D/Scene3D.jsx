import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SCENE } from '../../config/sceneConfig'
import { useScrollProgress } from '../../hooks/useScrollProgress'
import { createGLScene } from './glScene'
import {
  computePlane,
  formatTransform,
  getProjectIndex,
  getViewportFit,
  getVisibleSlots,
} from './spiralLayout'
import './Scene3D.css'

const MAX_DPR = 2
/** Épaisseur du liseré des images, en fraction de la largeur d'un plan. */
const BORDER = 0.004

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function sameSlots(a, b) {
  return a.length === b.length && a[0] === b[0]
}

/**
 * Scène 3D des projets.
 *
 * Deux couches superposées :
 *   - un canvas WebGL qui dessine les images et déforme leur surface ;
 *   - une couche DOM invisible, placée avec la même transform CSS, qui garde
 *     de vrais liens (clic, survol, clavier, clic milieu) sur chaque projet.
 *
 * Aucune des deux ne stocke d'état de rendu dans React : tout est écrit
 * directement à chaque frame, donc sans re-render. Seul le passage d'un slot
 * à un autre (environ tous les projets scrollés) met à jour la liste de liens.
 *
 * Géométrie dans spiralLayout.js, rendu dans glScene.js,
 * réglages dans src/config/sceneConfig.js.
 */
export default function Scene3D({ projets, onHover }) {
  const canvasRef = useRef(null)
  const glRef = useRef(null)
  const hitRefs = useRef(new Map())

  const fitRef = useRef(1)
  const deformRef = useRef(0)
  const hoveredSlotRef = useRef(null)
  const hoverValuesRef = useRef(new Map())
  const slotsRef = useRef(getVisibleSlots(0))

  const [slots, setSlots] = useState(() => getVisibleSlots(0))

  const planeWidth = SCENE.imageWidth
  const planeHeight = Math.round(SCENE.imageWidth * SCENE.imageRatio)

  const applyFrame = useCallback(
    ({ progress, velocity }) => {
      const fit = fitRef.current
      const { deformation, hover, perspectiveOrigin } = SCENE

      // 1. Déformation : cible proportionnelle à la vitesse de scroll, puis
      //    retour progressif vers zéro dès que le mouvement ralentit.
      const deformTarget = clamp(velocity * deformation.scrollSensitivity, -1, 1)
      deformRef.current += (deformTarget - deformRef.current) * deformation.returnSpeed
      if (Math.abs(deformRef.current) < 0.0008) deformRef.current = 0

      // 2. Fenêtre de slots visibles : elle glisse avec le scroll, sans fin.
      const visible = getVisibleSlots(progress)
      if (!sameSlots(visible, slotsRef.current)) {
        slotsRef.current = visible
        setSlots(visible)
      }

      // 3. Position de chaque slot + animation de survol.
      const hoverValues = hoverValuesRef.current
      const planes = []
      let animating = false

      for (const slot of slotsRef.current) {
        const plane = computePlane(slot, progress, fit)
        const element = hitRefs.current.get(slot)

        if (!plane.visible) {
          hoverValues.delete(slot)
          if (element) {
            element.style.visibility = 'hidden'
            element.style.pointerEvents = 'none'
          }
          continue
        }

        const target = hoveredSlotRef.current === slot ? 1 : 0
        const previous = hoverValues.get(slot) ?? 0
        let value = previous + (target - previous) * hover.speed
        if (Math.abs(target - value) < 0.002) value = target
        else animating = true
        hoverValues.set(slot, value)

        // La couche de clic garde sa taille pleine : le survol ne doit pas
        // rétrécir la zone sensible, sinon le curseur en sortirait tout seul.
        if (element) {
          element.style.visibility = 'visible'
          element.style.transform = formatTransform(plane)
          element.style.pointerEvents = plane.opacity > 0.35 ? 'auto' : 'none'
        }

        planes.push({
          image: getProjectIndex(slot, projets.length),
          x: plane.x,
          y: plane.y,
          z: plane.z,
          width: planeWidth,
          height: planeHeight,
          scale: plane.scale * (1 + (hover.scale - 1) * value),
          opacity: plane.opacity,
          brightness: 1 + (hover.darken - 1) * value,
        })
      }

      // Les slots sortis de la fenêtre ne gardent pas d'état de survol.
      for (const slot of [...hoverValues.keys()]) {
        if (!slotsRef.current.includes(slot)) hoverValues.delete(slot)
      }

      // 4. Rendu WebGL.
      const gl = glRef.current
      if (gl) {
        const width = window.innerWidth
        const height = window.innerHeight
        gl.render({
          viewport: [width, height],
          origin: [
            (width * parseFloat(perspectiveOrigin.x)) / 100,
            (height * parseFloat(perspectiveOrigin.y)) / 100,
          ],
          perspective: SCENE.perspective,
          deform: deformRef.current,
          deformStrength: deformation.strength,
          border: BORDER,
          planes,
        })
      }

      // On redemande une frame tant qu'une animation est en cours.
      return animating || deformRef.current !== 0
    },
    [projets.length, planeWidth, planeHeight],
  )

  const requestFrame = useScrollProgress(applyFrame)

  // Création du contexte WebGL et chargement des textures.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let scene = null
    try {
      scene = createGLScene(canvas, {
        segments: SCENE.deformation.segments,
        onReady: () => requestFrame(),
      })
    } catch (error) {
      console.error('Scène WebGL indisponible :', error)
    }

    if (!scene) return undefined

    glRef.current = scene
    scene.loadImages(projets.map((projet) => projet.image))
    requestFrame()

    return () => {
      glRef.current = null
      scene.dispose()
    }
  }, [projets, requestFrame])

  // Dimensionnement du canvas et facteur responsive.
  useEffect(() => {
    const handleResize = () => {
      fitRef.current = getViewportFit(window.innerWidth)
      const scene = glRef.current
      if (scene) {
        scene.resize(
          window.innerWidth,
          window.innerHeight,
          Math.min(window.devicePixelRatio || 1, MAX_DPR),
        )
      }
      requestFrame()
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [requestFrame])

  const setHovered = (slot, projet) => {
    hoveredSlotRef.current = slot
    onHover?.(projet)
    requestFrame()
  }

  return (
    <div
      className="scene"
      style={{
        '--scene-perspective': `${SCENE.perspective}px`,
        '--scene-origin-x': SCENE.perspectiveOrigin.x,
        '--scene-origin-y': SCENE.perspectiveOrigin.y,
        '--plane-width': `${planeWidth}px`,
        '--plane-height': `${planeHeight}px`,
      }}
    >
      <canvas className="scene__canvas" ref={canvasRef} />
      <div className="scene__vignette" aria-hidden="true" />

      {/* Couche invisible : ce sont ces liens qui reçoivent clics et survols. */}
      <div className="scene__stage">
        {slots.map((slot) => {
          const projet = projets[getProjectIndex(slot, projets.length)]
          return (
            <Link
              key={slot}
              to={`/projet/${projet.id}`}
              className="plane"
              aria-label={`${projet.nom}, ${projet.annee}`}
              ref={(element) => {
                if (element) hitRefs.current.set(slot, element)
                else hitRefs.current.delete(slot)
              }}
              onMouseEnter={() => setHovered(slot, projet)}
              onMouseLeave={() => setHovered(null, null)}
              onFocus={() => setHovered(slot, projet)}
              onBlur={() => setHovered(null, null)}
            />
          )
        })}
      </div>
    </div>
  )
}
