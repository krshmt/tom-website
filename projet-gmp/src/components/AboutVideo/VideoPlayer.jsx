import { useEffect, useRef, useState } from 'react'
import './VideoPlayer.css'

/** Lissage du curseur : 0.02 = très traînant, 1 = collé à la souris. */
const LATENCE = 0.14

function IconePause() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="5" width="3.5" height="14" rx="1" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
    </svg>
  )
}

function IconeLecture() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  )
}

function IconeSon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconeSonCoupe() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
      <path d="M15.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Lecteur plein écran de la vidéo de présentation.
 *
 * La pellicule est fournie déjà complète par l'appelant : rien ne se remplit
 * sous les yeux du visiteur pendant la lecture. Les vignettes servent aussi
 * de barre de navigation.
 *
 * Fermeture par un clic n'importe où, sauf sur la barre de contrôle. Un
 * bouton « close » suit la souris avec un peu de retard ; il se rétracte
 * dès que la souris entre sur la barre, pour ne pas gêner la visée.
 */
export default function VideoPlayer({ src, vignettes = [], onClose }) {
  const videoRef = useRef(null)
  const curseurRef = useRef(null)

  const [enLecture, setEnLecture] = useState(true)
  const [muet, setMuet] = useState(false)
  const [progression, setProgression] = useState(0)
  // Survol de la barre : la pastille « close » se retire pour laisser viser.
  const [surBarre, setSurBarre] = useState(false)

  // Lancement à l'ouverture. Le clic du visiteur autorise le son ; si le
  // navigateur refuse malgré tout, on retombe sur une lecture muette.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {
      video.muted = true
      setMuet(true)
      video.play().catch(() => setEnLecture(false))
    })
  }, [])

  // Curseur personnalisé : il rejoint la souris par interpolation, d'où le
  // léger retard. Écrit directement dans le DOM, sans re-rendu.
  useEffect(() => {
    let sourisX = 0
    let sourisY = 0
    let x = 0
    let y = 0
    let place = false
    let rafId = null

    const suivre = () => {
      x += (sourisX - x) * LATENCE
      y += (sourisY - y) * LATENCE
      const element = curseurRef.current
      if (element) element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      rafId = requestAnimationFrame(suivre)
    }

    const surMouvement = (evenement) => {
      sourisX = evenement.clientX
      sourisY = evenement.clientY
      if (!place) {
        // Première position : on s'y pose sans traîner depuis le coin.
        place = true
        x = sourisX
        y = sourisY
        curseurRef.current?.classList.add('lecteur__curseur--visible')
      }
    }

    window.addEventListener('pointermove', surMouvement)
    rafId = requestAnimationFrame(suivre)

    return () => {
      window.removeEventListener('pointermove', surMouvement)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // Fermeture au clavier.
  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [onClose])

  const basculerLecture = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setEnLecture(true)
    } else {
      video.pause()
      setEnLecture(false)
    }
  }

  const basculerSon = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuet(video.muted)
  }

  const allerA = (temps) => {
    const video = videoRef.current
    if (video) video.currentTime = temps
  }

  const surProgression = () => {
    const video = videoRef.current
    if (video?.duration) setProgression(video.currentTime / video.duration)
  }

  return (
    // Un clic n'importe où ferme, sauf sur la barre qui arrête la propagation.
    <div className="lecteur" onClick={onClose}>
      <video
        className="lecteur__video"
        ref={videoRef}
        src={src}
        playsInline
        onTimeUpdate={surProgression}
        onEnded={() => setEnLecture(false)}
      />

      <span className="lecteur__curseur" ref={curseurRef} aria-hidden="true">
        <span className={`lecteur__pastille${surBarre ? ' lecteur__pastille--retiree' : ''}`}>
          fermer
        </span>
      </span>

      <div
        className="lecteur__barre"
        onClick={(evenement) => evenement.stopPropagation()}
        onMouseEnter={() => setSurBarre(true)}
        onMouseLeave={() => setSurBarre(false)}
      >
        <button
          type="button"
          className="lecteur__bouton"
          onClick={basculerLecture}
          aria-label={enLecture ? 'Mettre en pause' : 'Reprendre la lecture'}
        >
          {enLecture ? <IconePause /> : <IconeLecture />}
        </button>

        <button
          type="button"
          className="lecteur__bouton"
          onClick={basculerSon}
          aria-label={muet ? 'Rétablir le son' : 'Couper le son'}
        >
          {muet ? <IconeSonCoupe /> : <IconeSon />}
        </button>

        {vignettes.length > 0 && (
          <div className="lecteur__pellicule">
            {vignettes.map((vignette) => (
              <button
                type="button"
                className="lecteur__vignette"
                key={vignette.temps}
                onClick={() => allerA(vignette.temps)}
                aria-label={`Aller à ${Math.round(vignette.temps)} secondes`}
              >
                <img src={vignette.image} alt="" draggable={false} />
              </button>
            ))}
            <span
              className="lecteur__tete"
              style={{ left: `${progression * 100}%` }}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </div>
  )
}
