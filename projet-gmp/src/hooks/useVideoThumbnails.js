import { useEffect, useState } from 'react'

/** Au-delà, on renonce à attendre : le lecteur s'ouvre sans pellicule. */
const DELAI_MAX = 6000

/**
 * Extrait des vignettes directement depuis la vidéo.
 *
 * Une vidéo hors écran est avancée à des instants régulièrement répartis et
 * chaque image est dessinée dans un canvas. Les vignettes suivent donc
 * toujours le fichier : changer la vidéo change la pellicule, sans rien
 * préparer à la main.
 *
 * `pret` passe à vrai une fois la pellicule complète — ou en cas d'échec ou
 * de délai dépassé. L'appelant peut ainsi n'afficher le lecteur qu'une fois
 * tout en place, plutôt que de laisser les vignettes se remplir sous les
 * yeux du visiteur.
 *
 * @param {string|null} src  chemin de la vidéo ; `null` n'extrait rien
 * @param {number} nombre    nombre de vignettes à produire
 * @param {number} largeur   largeur d'une vignette, en px
 */
export function useVideoThumbnails(src, nombre = 6, largeur = 160) {
  const [etat, setEtat] = useState({ vignettes: [], pret: false })

  useEffect(() => {
    if (!src) {
      return undefined
    }

    let annule = false
    let produites = []

    const video = document.createElement('video')
    video.src = src
    video.muted = true
    video.preload = 'auto'
    video.crossOrigin = 'anonymous'
    // Indispensable sur iOS : sans cela la lecture passe en plein écran et
    // aucune image n'est disponible pour le canvas.
    video.playsInline = true

    const terminer = () => {
      if (!annule) setEtat({ vignettes: produites, pret: true })
    }

    // Garde-fou : une vidéo lente ou illisible ne doit pas bloquer l'ouverture.
    const garde = setTimeout(terminer, DELAI_MAX)

    const attendre = (evenement) =>
      new Promise((resolve, reject) => {
        video.addEventListener(evenement, resolve, { once: true })
        video.addEventListener('error', reject, { once: true })
      })

    const extraire = async () => {
      await attendre('loadedmetadata')
      if (annule || !video.duration || !Number.isFinite(video.duration)) return

      const canvas = document.createElement('canvas')
      const ratio = video.videoHeight / video.videoWidth || 0.5625
      canvas.width = largeur
      canvas.height = Math.round(largeur * ratio)
      const contexte = canvas.getContext('2d')

      for (let i = 0; i < nombre; i += 1) {
        if (annule) return
        // On évite le tout premier et le tout dernier instant, souvent noirs.
        const temps = (video.duration * (i + 0.5)) / nombre
        video.currentTime = temps
        await attendre('seeked')
        if (annule) return
        contexte.drawImage(video, 0, 0, canvas.width, canvas.height)
        produites = [...produites, { temps, image: canvas.toDataURL('image/jpeg', 0.72) }]
      }
    }

    extraire()
      .catch(() => {
        // Vidéo illisible : le lecteur s'ouvrira simplement sans pellicule.
      })
      .finally(() => {
        clearTimeout(garde)
        terminer()
      })

    return () => {
      annule = true
      clearTimeout(garde)
      video.removeAttribute('src')
      video.load()
    }
  }, [src, nombre, largeur])

  return etat
}
