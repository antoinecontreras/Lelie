class CanvasManager {
  constructor() {
    this.p5Instance = new p5((p) => {
      p.setup = () => {
        this.canvas = p.createCanvas(
          window.innerWidth,
          window.innerHeight,
          p.WEBGL
        );
        // Configuration du blending pour l'alpha
        p._renderer.GL.enable(p._renderer.GL.BLEND);
        p._renderer.GL.blendFunc(
          p._renderer.GL.SRC_ALPHA,
          p._renderer.GL.ONE_MINUS_SRC_ALPHA
        );
        p.pixelDensity(2);
        this.canvas.position(0, 0);
        this.canvas.style("pointer-events", "none");
        this.canvas.style("z-index", "9999");

        p.clear();
        p.noLoop();
        this.cam = p.createCamera();
        this.radiusPx = this.getRadiusPx(4.5);

        // On crée nos textures triangles une seule fois (avec depth statique ici à 0.5)
        this.triangleTextures = this.createTriangleTextures(p, 0.5); //0.5
        this.shouldDraw = true;
      };

      p.draw = () => {
        if (!this.shouldDraw) return;

        p.clear();
        p.noStroke();
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        // Perspective et caméra
        const perspectivePx = screenW;
        const fov = 2 * Math.atan(screenH / 2 / perspectivePx);
        this.cam.setPosition(0, 0, perspectivePx);
        this.cam.perspective(fov, p.width / p.height, 0.1, 50000);
        this.cam.lookAt(0, 0, 0);

        // Scroll (pour le positionnement en profondeur)
        const scrollDepthPx = (this.getScrollDepth() / 100) * screenW;
        const TRI_CFG = [
          { angle: 0,          tex: 0, flipX:  1, swap: false }, // bas
          { angle: p.HALF_PI,  tex: 1, flipX:  1, swap: true  }, // droite
          { angle:-p.HALF_PI,  tex: 1, flipX: -1, swap: true  }  // gauche (miroir)
        ];

        // Pour chaque rectangle (ici on teste avec 1 rectangle, count=1)
        const count = 2;
        for (let i = count - 1; i >= 0; i--) {
          const rectW = 2.5 * screenW;
          const rectH = 2.5 * screenH;
          // Calcul de la profondeur (ici statique par rapport à i)
          const z = scrollDepthPx - 1.5 * screenW - 3 * screenW * i;

          p.push();
          p.translate(0, 0, z);
          // Centrage du rectangle 3D en le décalant de -50% en X et Y
          p.translate(-rectW / 2, -rectH / 2);

          for (const cfg of TRI_CFG) {

            // — pivot adapté —
            const pivotX = rectW * 0.5;
            const pivotY = cfg.swap ? rectW * 0.5 : rectH * 0.5; // <‑ clé du mapping
          
            p.push();
          
            // 1. on place le pivot
            p.translate(pivotX, pivotY);
          
            // 2. rotation
            p.rotateZ(cfg.angle);
          
            // 3. éventuel miroir horizontal
            if (cfg.flipX === -1) p.scale(-1, 1);
          
            // 4. retour au coin haut‑gauche du rectangle
            p.translate(-pivotX, -pivotY);
          
            // 5. dimensions UV (inversion si swap)
            const w = cfg.swap ? rectH : rectW;
            const h = cfg.swap ? rectW : rectH;
          
            // 6. dessin
            this.drawTriangleTexture(p, this.triangleTextures[cfg.tex], w, h);
          
            p.pop();
          }
          p.pop();
          // }
        }

        this.shouldDraw = false;
      };

      p.windowResized = () => {
        this.p5Instance.resizeCanvas(window.innerWidth, window.innerHeight);
        this.updatePerspective();
        this.redraw();
      };
    });

    this.shouldDraw = false;
  }

  getRadiusPx(remNumber) {
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
    const radiusPx = remNumber * rootFontSize;
    return radiusPx;
  }

  redraw() {
    this.shouldDraw = true;
    this.p5Instance.loop();
  }

  updatePerspective() {
    const p = this.p5Instance;
    const perspectiveCSS = window.innerWidth;
    const fov = 2 * Math.atan(p.height / 2 / perspectiveCSS);
    this.cam.perspective(fov, p.width / p.height, 0.1, 5000);
  }

  getScrollDepth() {
    const scrollDepth =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--scroll-depth"
        )
      ) || 0;
    return scrollDepth;
  }

  getSizeWall() {
    const sizeWall =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--sizeWall"
        )
      ) || 600;
    return sizeWall;
  }

  // Affiche le triangle texturé avec mapping UV sur une forme rectangle.
  drawTriangleTexture(p, tex, w, h) {
    p.noStroke();
    p.textureMode(p.NORMAL);
    p.texture(tex);
    p.beginShape();
    p.vertex(0, 0, 0, 0);
    p.vertex(w, 0, 1, 0);
    p.vertex(w, h, 1, 1);
    p.vertex(0, h, 0, 1);
    p.endShape(p.CLOSE);
  }

  // Création de trois textures de triangle, une pour chaque orientation.
  // Le paramètre "depth" contrôle le point de départ du dégradé vertical (0.5 ici par exemple)
  createTriangleTextures(p, depth = 0.5) {
    const w = p.width;
    const h = p.height;
    const vertiFade = 0.2;
    const results = [];

    // On génère 3 textures
    for (let i = 0; i < 3; i++) {
      if (i === 0) {
        const g = p.createGraphics(w, h, p.P2D);
        const ctx = g.elt.getContext("2d");
        const gradV = ctx.createLinearGradient(0, h / 2, 0, h);
        gradV.addColorStop(depth, "rgba(0,0,0,0)");
        gradV.addColorStop(1, "rgba(0,0,0,0.7)");
        ctx.fillStyle = gradV;
        this.drawTriangleShape(ctx, w, h);
        results.push(g);
      } else if (i === 1 || i === 2) {
        const g = p.createGraphics(h, w, p.P2D);
        const ctx = g.elt.getContext("2d");
        const gradV = ctx.createLinearGradient(0, w / 2, 0, w);
        gradV.addColorStop(depth, "rgba(0,0,0,0)");
        gradV.addColorStop(1, "rgba(0,0,0,0.7)");
        ctx.fillStyle = gradV;
        this.drawTriangleShape(ctx, h, w);
        const fadeStart =
          i === 1 ? w * 0.5 - w * vertiFade : w * 0.5 + w * vertiFade;
        const fadeEnd = i === 1 ? w : 0;
        const gradH = ctx.createLinearGradient(fadeStart, 0, fadeEnd, 0);
        gradH.addColorStop(0, "rgba(255,255,255,0)");
        gradH.addColorStop(1, "rgba(255,255,255,1)");
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = gradH;
        this.drawTriangleShape(ctx, h, w);
        ctx.globalCompositeOperation = "source-over";
        results.push(g);
      }
    }

    return results;
  }

  // Pour dessiner le triangle dans la texture.
  // Ici, on veut que le triangle ait pour base le bord inférieur (de 0,h à w,h)
  // et que son apex soit au point (w/2, k*h). k est un facteur (par ex. 0.5) que tu pourras ajuster pour compenser la perspective.
  drawTriangleShape(ctx, w, h) {
    // Facteur de l'apex : ajuste ici pour modifier la hauteur du triangle.
    const apexFactor = 0.5; // Par défaut, l'apex est à la moitié de la hauteur
    ctx.beginPath();
    ctx.moveTo(0, h); // coin bas gauche
    ctx.lineTo(w, h); // coin bas droit
    ctx.lineTo(w / 2, h * apexFactor); // sommet
    ctx.closePath();
    ctx.fill();
  }

  // Applique un masque de coins arrondis sur une image.
  applyRoundedMask(p, img, relRX = 0.1, relRY = 0.1) {
    const w = img.width;
    const h = img.height;
    const rX = w * relRX;
    const rY = h * relRY;

    const masked = p.createGraphics(w, h);
    masked.clear();
    masked.noStroke();
    masked.fill(255);

    masked.beginShape();
    masked.vertex(rX, 0);
    masked.vertex(w - rX, 0);
    masked.quadraticVertex(w, 0, w, rY);
    masked.vertex(w, h - rY);
    masked.quadraticVertex(w, h, w - rX, h);
    masked.vertex(rX, h);
    masked.quadraticVertex(0, h, 0, h - rY);
    masked.vertex(0, rY);
    masked.quadraticVertex(0, 0, rX, 0);
    masked.endShape(p.CLOSE);

    img.mask(masked);
    return img;
  }
}
