/**
 * ============================================================================
 *  RENDU WEBGL DES IMAGES DE LA SPIRALE
 * ============================================================================
 *
 *  Chaque projet est un maillage (grille de `segments` × `segments` quads)
 *  dont la surface est réellement déformée dans le vertex shader — ce n'est
 *  donc ni un rotate, ni un scale, ni un translate du plan entier.
 *
 *  La perspective reproduit exactement celle du CSS (`perspective` +
 *  `perspective-origin`) : la projection est faite à la main dans le shader.
 *  La couche DOM invisible qui capte les clics utilise la même transform CSS
 *  et reste donc parfaitement alignée avec ce qui est dessiné ici.
 *
 *  Tous les réglages vivent dans `src/config/sceneConfig.js`.
 */

/*
 * NOTE : le GLSL doit rester en ASCII pur, commentaires compris.
 * Les pilotes refusent de compiler un shader contenant des accents.
 */
const VERTEX_SRC = `
  precision highp float;

  attribute vec2 aPosition;   // -0.5 .. 0.5 dans le plan
  attribute vec2 aUv;         // 0 .. 1

  // Camera : reproduit exactement la perspective CSS.
  uniform vec2  uViewport;
  uniform vec2  uOrigin;       // point de fuite, en px
  uniform vec2  uStageCenter;  // centre de la scene, en px
  uniform float uPerspective;

  // Plan courant.
  uniform vec3  uCenter;       // position du plan (px)
  uniform vec2  uSize;         // largeur / hauteur (px)
  uniform float uScale;

  // Deformation liee au scroll.
  uniform float uDeform;          // -1 .. 1, signe selon le sens du scroll
  uniform float uDeformStrength;  // amplitude en px

  varying vec2 vUv;
  varying vec2 vLocal;

  const float PI = 3.14159265;

  void main() {
    vec2 local = aPosition * uSize * uScale;

    /*
     * Bombe : +1 au centre, 0 au milieu des bords, -1 aux quatre coins.
     * Scroll vers le bas (uDeform > 0) : le centre avance vers l'utilisateur
     * et les quatre coins reculent. Scroll vers le haut : l'inverse.
     */
    vec2 n = aPosition * 2.0;
    float d = clamp(dot(n, n) * 0.5, 0.0, 1.0);
    float bulge = cos(d * PI);

    float z = uCenter.z + uDeform * uDeformStrength * bulge * uScale;
    // Securite : jamais au-dela du plan de la camera.
    z = min(z, uPerspective * 0.8);

    // Projection perspective CSS : facteur P / (P - z) autour du point de fuite.
    float f = uPerspective / (uPerspective - z);
    vec2 rel = uStageCenter + uCenter.xy + local - uOrigin;
    vec2 screen = uOrigin + rel * f;

    vec2 clip = vec2(
      screen.x / uViewport.x * 2.0 - 1.0,
      1.0 - screen.y / uViewport.y * 2.0
    );

    // w = 1/f : la division perspective de GL retablit clip et corrige
    // l'interpolation des varyings sur la surface deformee.
    float w = 1.0 / f;
    gl_Position = vec4(clip * w, 0.0, w);

    vUv = aUv;
    vLocal = aPosition;
  }
`

const FRAGMENT_SRC = `
  precision mediump float;

  uniform sampler2D uTexture;
  uniform vec2  uUvScale;    // recadrage facon object-fit: cover
  uniform vec2  uUvOffset;
  uniform float uOpacity;
  uniform float uBrightness; // 1 = normal, < 1 = assombri (survol)
  uniform float uBorder;     // epaisseur du lisere, en fraction du plan

  varying vec2 vUv;
  varying vec2 vLocal;

  void main() {
    vec2 uv = vUv * uUvScale + uUvOffset;
    vec3 color = texture2D(uTexture, uv).rgb;

    // Lisere clair : detache aussi les visuels tres sombres du fond noir.
    float edge = 0.5 - max(abs(vLocal.x), abs(vLocal.y));
    float border = 1.0 - smoothstep(0.0, uBorder, edge);
    color = mix(color, vec3(0.95, 0.94, 0.93), border * 0.35);

    // Assombrissement du survol : le plan garde son opacite, seule sa
    // luminosite baisse.
    color *= uBrightness;

    gl_FragColor = vec4(color, uOpacity);
  }
`

const UNIFORM_NAMES = [
  'uViewport',
  'uOrigin',
  'uStageCenter',
  'uPerspective',
  'uCenter',
  'uSize',
  'uScale',
  'uDeform',
  'uDeformStrength',
  'uTexture',
  'uUvScale',
  'uUvOffset',
  'uOpacity',
  'uBrightness',
  'uBorder',
]

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Compilation du shader impossible : ${log}`)
  }
  return shader
}

function createProgram(gl) {
  const program = gl.createProgram()
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)

  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`Edition de liens du programme impossible : ${log}`)
  }
  return program
}

/** Grille subdivisée : c'est elle qui permet de courber réellement la surface. */
function createGrid(gl, segments) {
  const positions = []
  const uvs = []
  const indices = []

  for (let y = 0; y <= segments; y += 1) {
    for (let x = 0; x <= segments; x += 1) {
      const u = x / segments
      const v = y / segments
      positions.push(u - 0.5, v - 0.5)
      uvs.push(u, v)
    }
  }

  const stride = segments + 1
  for (let y = 0; y < segments; y += 1) {
    for (let x = 0; x < segments; x += 1) {
      const a = y * stride + x
      const b = a + 1
      const c = a + stride
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const position = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, position)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

  const uv = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, uv)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW)

  const index = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

  return { position, uv, index, count: indices.length }
}

/**
 * Crée le rendu WebGL de la scène.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object}   options
 * @param {number}   options.segments finesse de la grille de déformation
 * @param {Function} options.onReady  appelé quand une texture vient d'arriver
 * @returns {object|null} `null` si WebGL est indisponible
 */
export function createGLScene(canvas, { segments = 24, onReady } = {}) {
  const attributes = {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    depth: false,
  }
  const gl =
    canvas.getContext('webgl2', attributes) || canvas.getContext('webgl', attributes)
  if (!gl) return null

  const isWebGL2 =
    typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
  const aniso =
    gl.getExtension('EXT_texture_filter_anisotropic')
    || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')

  const program = createProgram(gl)
  const grid = createGrid(gl, segments)

  const uniforms = {}
  UNIFORM_NAMES.forEach((name) => {
    uniforms[name] = gl.getUniformLocation(program, name)
  })
  const aPosition = gl.getAttribLocation(program, 'aPosition')
  const aUv = gl.getAttribLocation(program, 'aUv')

  // Texture d'attente : un pixel sombre, le temps que l'image arrive.
  const placeholder = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, placeholder)
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([23, 23, 26, 255]),
  )
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)

  let slides = []
  let disposed = false

  function upload(slide, image) {
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    // Les images ont une taille quelconque : mipmaps possibles en WebGL2
    // uniquement. Sans elles, les projets lointains scintilleraient.
    if (isWebGL2) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.generateMipmap(gl.TEXTURE_2D)
      if (aniso) {
        const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
        gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, max))
      }
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    }

    slide.texture = texture
    slide.aspect = image.naturalWidth / image.naturalHeight
    slide.ready = true
  }

  return {
    /** Charge les images des projets, dans l'ordre du tableau. */
    loadImages(urls) {
      slides = urls.map((url) => {
        const slide = { texture: null, aspect: 1, ready: false }
        const image = new Image()
        // Obligatoire : sans CORS, une image d'une autre origine « tache »
        // la texture et WebGL refuse de la lire.
        image.crossOrigin = 'anonymous'
        image.decoding = 'async'
        image.onload = () => {
          if (disposed) return
          upload(slide, image)
          onReady?.()
        }
        image.src = url
        return slide
      })
    },

    resize(cssWidth, cssHeight, dpr) {
      canvas.width = Math.round(cssWidth * dpr)
      canvas.height = Math.round(cssHeight * dpr)
    },

    /**
     * Dessine une frame.
     *
     * @param {object}   frame
     * @param {number[]} frame.viewport   [largeur, hauteur] en px CSS
     * @param {number[]} frame.origin     point de fuite, en px
     * @param {number}   frame.perspective
     * @param {number}   frame.deform     -1 → 1, signé selon le sens du scroll
     * @param {number}   frame.deformStrength
     * @param {number}   frame.border
     * @param {object[]} frame.planes     { image, x, y, z, width, height, scale, opacity }
     */
    render(frame) {
      const [width, height] = frame.viewport

      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      if (frame.planes.length === 0) return

      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.disable(gl.DEPTH_TEST)
      gl.useProgram(program)

      gl.bindBuffer(gl.ARRAY_BUFFER, grid.position)
      gl.enableVertexAttribArray(aPosition)
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

      gl.bindBuffer(gl.ARRAY_BUFFER, grid.uv)
      gl.enableVertexAttribArray(aUv)
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0)

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, grid.index)

      gl.uniform2f(uniforms.uViewport, width, height)
      gl.uniform2f(uniforms.uOrigin, frame.origin[0], frame.origin[1])
      gl.uniform2f(uniforms.uStageCenter, width / 2, height / 2)
      gl.uniform1f(uniforms.uPerspective, frame.perspective)
      gl.uniform1f(uniforms.uDeform, frame.deform)
      gl.uniform1f(uniforms.uDeformStrength, frame.deformStrength)
      gl.uniform1f(uniforms.uBorder, frame.border)
      gl.uniform1i(uniforms.uTexture, 0)
      gl.activeTexture(gl.TEXTURE0)

      // Sans tampon de profondeur, l'ordre de dessin fait le classement :
      // du plus lointain au plus proche.
      const ordered = frame.planes.slice().sort((a, b) => a.z - b.z)

      for (const plane of ordered) {
        const slide = slides[plane.image]
        const ready = slide ? slide.ready : false
        gl.bindTexture(gl.TEXTURE_2D, ready ? slide.texture : placeholder)

        // Recadrage « cover » : l'image remplit le plan sans se déformer.
        let scaleX = 1
        let scaleY = 1
        if (ready) {
          const planeAspect = plane.width / plane.height
          if (slide.aspect > planeAspect) scaleX = planeAspect / slide.aspect
          else scaleY = slide.aspect / planeAspect
        }

        gl.uniform3f(uniforms.uCenter, plane.x, plane.y, plane.z)
        gl.uniform2f(uniforms.uSize, plane.width, plane.height)
        gl.uniform1f(uniforms.uScale, plane.scale)
        gl.uniform1f(uniforms.uOpacity, plane.opacity)
        gl.uniform1f(uniforms.uBrightness, plane.brightness)
        gl.uniform2f(uniforms.uUvScale, scaleX, scaleY)
        gl.uniform2f(uniforms.uUvOffset, (1 - scaleX) / 2, (1 - scaleY) / 2)

        gl.drawElements(gl.TRIANGLES, grid.count, gl.UNSIGNED_SHORT, 0)
      }
    },

    dispose() {
      disposed = true
      slides.forEach((slide) => slide.texture && gl.deleteTexture(slide.texture))
      slides = []
      gl.deleteTexture(placeholder)
      gl.deleteBuffer(grid.position)
      gl.deleteBuffer(grid.uv)
      gl.deleteBuffer(grid.index)
      gl.deleteProgram(program)
      // Surtout pas de loseContext() ici : le canvas est demonte avec le
      // composant, et un contexte volontairement perdu serait renvoye tel quel
      // au remontage (double montage de StrictMode), rendant la scene morte.
    },
  }
}
