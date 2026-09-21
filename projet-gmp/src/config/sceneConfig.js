/**
 * ============================================================================
 *  PARAMÈTRES DE LA SCÈNE 3D — tout se règle ici, et nulle part ailleurs.
 * ============================================================================
 *
 *  Repère utilisé :
 *    x  → droite positive
 *    y  → bas positif   (une valeur négative monte donc à l'écran)
 *    z  → vers l'utilisateur positif (négatif = au loin)
 *
 *  Notion de « profondeur » (`depth`) : distance d'un projet à la caméra,
 *  exprimée en nombre de projets. 0 = pile sur la caméra, 3 = trois crans
 *  plus loin, -1 = déjà passé derrière l'utilisateur.
 */
export const SCENE = {
  // ---------------------------------------------------------- PERSPECTIVE
  /** Distance oeil <-> écran en px. Plus petit = perspective plus violente. */
  perspective: 1250,
  /** Point de fuite, en % de la fenêtre. */
  perspectiveOrigin: { x: '50%', y: '68%' },

  // ------------------------------------------------- FORME DE LA SPIRALE
  /** Rayon horizontal de la spirale (px). */
  radiusX: 580,
  /** Rayon vertical de la spirale (px). Différent de radiusX = ellipse. */
  radiusY: 430,
  /** Écart angulaire entre deux projets consécutifs (deg). */
  angleStep: 62,
  /** Orientation du premier projet sur le cercle (deg). */
  startAngle: -120,
  /** Espacement en profondeur entre deux projets (px). */
  spacing: 520,
  /** Descente verticale de la spirale par projet parcouru (px). */
  descent: 95,

  // --------------------------------------------------------------- SCROLL
  /** Pixels de scroll nécessaires pour avancer d'un projet. */
  scrollPerProject: 560,
  /** Lissage du déplacement : 0.02 = très flottant, 1 = collé au scroll. */
  smoothing: 0.085,
  /** Marge de scroll avant le premier projet (en nombre de projets). */
  leadIn: 0.15,
  /** Marge de scroll après le dernier projet (en nombre de projets). */
  leadOut: 1.6,
  /** Rotation supplémentaire de toute la spirale par projet scrollé (deg). */
  angleScroll: 0,

  // --------------------------------------------------------------- IMAGES
  /** Largeur de base d'une image (px). */
  imageWidth: 430,
  /** Hauteur = imageWidth × imageRatio. */
  imageRatio: 1.28,
  /** Échelle globale appliquée à toutes les images. */
  scale: 1,

  // ------------------------------------------------ ROTATIONS DES PLANS (deg)
  /**
   * Tout à 0 : les images font face à la caméra, leur bord haut reste
   * parfaitement horizontal. La profondeur vient uniquement de la position
   * en z et de la perspective.
   * Toute valeur non nulle réintroduit une inclinaison.
   */
  rotation: {
    /** Inclinaison de base sur chaque axe. */
    x: 0,
    y: 0,
    z: 0,
    /** Amplitude du balancement x/y suivant la position sur la spirale. */
    swing: 0,
    /** Amplitude du roulis z suivant la position sur la spirale. */
    roll: 0,
  },

  // --------------------------- VARIATIONS (0 = spirale parfaitement régulière)
  variation: {
    /** Variation du rayon par projet (±18 %). */
    radius: 0.18,
    /** Variation de l'échelle par projet (±22 %). */
    scale: 0.22,
    /** Désordre ajouté aux rotations. À 0 pour garder les images droites. */
    rotation: 0,
  },

  // ---------------------------------------------- APPARITION / DISPARITION
  /**
   * Seuils exprimés en profondeur (nombre de projets).
   * Garder |outEnd| × spacing < perspective, sinon les images passent
   * derrière le plan de la caméra et explosent en taille.
   */
  fade: {
    inStart: 6.5, // au-delà : invisible (trop loin)
    inEnd: 5.0, // en deçà : pleinement visible
    outStart: -0.15, // commence à s'effacer en passant la caméra
    outEnd: -1.2, // totalement effacé, le projet n'est plus rendu
  },

  // ----------------------------------------------------------- RESPONSIVE
  /** La composition entière est réduite sur les écrans étroits. */
  responsive: {
    referenceWidth: 1440,
    min: 0.5,
    max: 1.1,
  },
}
