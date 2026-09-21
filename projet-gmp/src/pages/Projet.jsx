import { Link, useParams } from 'react-router-dom'
import { getProjetById, getTypeLabel } from '../data/projets'
import './Projet.css'

/**
 * Page de détail d'un projet. Toutes les informations viennent du JSON,
 * récupérées à partir de l'`id` présent dans l'URL.
 */
export default function Projet() {
  const { id } = useParams()
  const projet = getProjetById(id)

  if (!projet) {
    return (
      <main className="projet projet--vide">
        <p className="projet__empty">Ce projet n’existe pas.</p>
        <Link className="projet__back" to="/">
          ← Retour aux projets
        </Link>
      </main>
    )
  }

  return (
    <main className="projet">
      <Link className="projet__back" to="/">
        ← Retour aux projets
      </Link>

      <header className="projet__header">
        <h1 className="projet__title">{projet.nom}</h1>
        <dl className="projet__meta">
          <div className="projet__meta-item">
            <dt>Année</dt>
            <dd>{projet.annee}</dd>
          </div>
          <div className="projet__meta-item">
            <dt>Type</dt>
            <dd>{getTypeLabel(projet.type)}</dd>
          </div>
        </dl>
      </header>

      <figure className="projet__cover">
        <img src={projet.image} alt={projet.nom} />
      </figure>

      <p className="projet__description">{projet.description}</p>

      {projet.images.length > 0 && (
        <section className="projet__gallery">
          {projet.images.map((image, index) => (
            <figure className="projet__gallery-item" key={image}>
              <img src={image} alt={`${projet.nom} — visuel ${index + 1}`} loading="lazy" />
            </figure>
          ))}
        </section>
      )}
    </main>
  )
}
