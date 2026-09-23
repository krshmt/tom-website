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
 *  Notion de « slot » : la spirale est une trajectoire infinie découpée en
 *  emplacements numérotés. Le slot 0 est le point de départ, les slots
 *  négatifs sont derrière l'utilisateur. Le projet affiché dans un slot vaut
 *  `slot modulo nombre de projets` : c'est ce qui rend la boucle infinie.
 *
 *  Notion de « profondeur » (`depth`) : distance d'un slot à la caméra,
 *  exprimée en nombre de projets. 0 = pile sur la caméra, 3 = trois crans
 *  plus loin, -1 = déjà passé derrière l'utilisateur.
 */
export const SCENE = {
  // ------------------------------------------------ POINT DE VUE / CAMÉRA
  /** Distance oeil <-> écran en px. Plus grand = perspective plus douce. */
  perspective: 1500,
  /** Point de fuite, en % de la fenêtre. */
  perspectiveOrigin: { x: '50%', y: '52%' },
  /**
   * Recul du point de vue, en nombre de projets.
   * C'est LE réglage à augmenter pour éloigner toute la scène : les premiers
   * projets sont alors entièrement visibles au chargement.
   */
  cameraSetback: 2.6,

  // ------------------------------------------------- FORME DE LA SPIRALE
  /** Rayon horizontal de la spirale (px). */
  radiusX: 820,
  /** Rayon vertical de la spirale (px). Différent de radiusX = ellipse. */
  radiusY: 420,
  /** Écart angulaire entre deux projets consécutifs (deg). */
  angleStep: 62,
  /** Orientation du premier projet sur le cercle (deg). */
  startAngle: -120,
  /** Espacement en profondeur entre deux projets (px) = profondeur de scène. */
  spacing: 1050,
  /** Descente verticale de la spirale par projet parcouru (px). */
  descent: 75,

  // --------------------------------------------------------------- SCROLL
  /**
   * Le défilement passe par Lenis (voir src/scroll/lenis.js).
   * Sur la homepage, la scène capte les deltas normalisés par Lenis au lieu
   * de faire défiler le document : la progression n est jamais bornée, ce
   * qui rend la spirale infinie dans les deux sens.
   */
  /** Pixels de scroll nécessaires pour avancer d'un projet = vitesse. */
  scrollPerProject: 560,
  /** Multiplicateur Lenis appliqué à la molette et au tactile. */
  scrollSpeed: 1,
  /** Lissage Lenis, son "lerp" : 0.02 = très flottant, 1 = collé au scroll. */
  smoothing: 0.085,
  /** Déplacement (px) d'un appui sur les flèches / Page haut-bas. */
  keyboardStep: 320,
  /** Rotation supplémentaire de toute la spirale par projet scrollé (deg). */
  angleScroll: 0,

  // ------------------------------------------------ DÉFILEMENT AUTOMATIQUE
  /**
   * La scène avance toute seule, même sans action du visiteur : les projets
   * se rapprochent lentement, comme un scroll continu vers le bas.
   */
  autoScroll: {
    /** Vitesse, en pixels de scroll par seconde. 0 désactive la dérive. */
    speed: 200,
    /**
     * Le sens de la dérive suit le dernier sens de défilement : vers le haut,
     * les projets s'éloignent au lieu de se rapprocher.
     */
    followDirection: true,
  },

  // --------------------------------------------------------------- IMAGES
  /** Largeur de base d'une image (px). */
  imageWidth: 400,
  /** Hauteur = imageWidth × imageRatio. */
  imageRatio: 1.28,
  /** Échelle globale appliquée à toutes les images. */
  scale: 1,

  // ------------------------------------------------ ROTATIONS DES PLANS (deg)
  /**
   * Tout à 0 : les images font face à la caméra, leur bord haut reste
   * parfaitement horizontal. La profondeur vient uniquement de la position
   * en z et de la perspective.
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
    /** Variation du rayon par slot (±18 %). */
    radius: 0.18,
    /** Variation de l'échelle par slot (±22 %). */
    scale: 0.22,
    /** Désordre ajouté aux rotations. À 0 pour garder les images droites. */
    rotation: 0,
  },

  // ---------------------------------------------------------------- SURVOL
  hover: {
    /** Échelle atteinte au survol (l'état normal vaut 1). */
    scale: 0.9,
    /** Luminosité atteinte au survol : 1 = normal, 0.7 = 30 % plus sombre. */
    darken: 0.7,
    /** Vitesse de la transition : 0.02 = lent, 1 = instantané. */
    speed: 0.13,
  },

  // ------------------------------------------- DÉFORMATION (shader WebGL)
  /**
   * La surface de chaque image est une grille déformée dans le vertex shader.
   * Scroll vers le bas : le centre avance vers l'utilisateur et les quatre
   * coins reculent. Scroll vers le haut : l'inverse. À l'arrêt, tout revient
   * progressivement à plat.
   */
  deformation: {
    /** Amplitude maximale du bombé, en px de profondeur. */
    strength: 250,
    /** Sensibilité au scroll : vitesse × ce facteur, borné à ±1. */
    scrollSensitivity: 7,
    /** Vitesse de retour vers la position neutre : 0.02 = lent, 1 = immédiat. */
    returnSpeed: 0.16,
    /** Finesse de la grille. Plus haut = surface plus lisse, plus coûteux. */
    segments: 24,
  },

  // ---------------------------------------------- APPARITION / DISPARITION
  /**
   * Seuils exprimés en profondeur (nombre de projets).
   * Garder (|outEnd| × spacing + deformation.strength) < perspective × 0.8,
   * sinon les images passeraient derrière le plan de la caméra.
   * Actuellement : 0.7 × 1050 + 200 = 935 pour une limite de 1200.
   */
  fade: {
    inStart: 6.5, // au-delà : invisible (trop loin)
    inEnd: 5.0, // en deçà : pleinement visible
    outStart: 0.6, // commence à s'effacer en passant la caméra
    outEnd: -0.7, // totalement effacé, le slot n'est plus rendu
  },

  // ----------------------------------------------------------- RESPONSIVE
  /** La composition entière est réduite sur les écrans étroits. */
  responsive: {
    referenceWidth: 1440,
    min: 0.5,
    max: 1.1,
  },
}
