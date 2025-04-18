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

        this.triangleTextures = this.buildTriangleTextures(p, 0.5); //0.5
        this.mergedTri = this.buildMergedTriangle(
          p,
          this.triangleTextures,
          this.applyRoundedMask.bind(this, p) // on passe la fonction de masque
        );
        this.shouldDraw = true;
        this.lastTexW = 0; // ← mémorisera la taille des textures
        this.lastTexH = 0;
        this.lastDepth = 0.5;
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
          { angle: 0, tex: 0, flipX: 1, swap: false }, // bas
          { angle: p.HALF_PI, tex: 1, flipX: 1, swap: true }, // droite
          { angle: -p.HALF_PI, tex: 1, flipX: -1, swap: true }, // gauche (miroir)
        ];

        const depth = 0.52; // ← si tu veux le faire varier
        const texArr = this.getTriangleTextures(p, depth);
        // Pour chaque rectangle (ici on teste avec 1 rectangle, count=1)
        const count = 5;
        for (let i = count - 1; i >= 0; i--) {
          const rectW = 2.5 * screenW;
          const rectH = 2.5 * screenH;
          // Calcul de la profondeur (ici statique par rapport à i)
          const z = scrollDepthPx - 1.5 * screenW - 3 * screenW * i;

          p.push();
          p.translate(0, 0, z);
          
          p.translate(-rectW / 2, -rectH / 2);
          this.drawTriangleTexture(
            p,
            this. mergedTri,  // texture unique déjà fusionnée + arrondie
            rectW,
            rectH
          );
          // for (const cfg of TRI_CFG) {
          //   const pivotX = rectW * 0.5;
          //   const pivotY = cfg.swap ? rectW * 0.5 : rectH * 0.5;
          //   p.push();
          //   p.translate(pivotX, pivotY);
          //   p.rotateZ(cfg.angle);
          //   if (cfg.flipX === -1) p.scale(-1, 1);
          //   p.translate(-pivotX, -pivotY);
          //   const w = cfg.swap ? rectH : rectW;
          //   const h = cfg.swap ? rectW : rectH;
          //   this.drawTriangleTexture(p, texArr[cfg.tex], w, h);
          //   p.pop();
          // }
          p.pop();
          // }
        }

        this.shouldDraw = false;
      };

      p.windowResized = () => {
        this.p5Instance.resizeCanvas(window.innerWidth, window.innerHeight);
        this.lastTexW = this.lastTexH = 0; // force rebuild
        this.updatePerspective();
        this.redraw();
      };
    });

    this.shouldDraw = false;
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

  getTriangleTextures(p, depth = 0.5) {
    // Taille courante du canvas
    const w = p.width;
    const h = p.height;

    // Faut‑il régénérer ?
    const needRebuild =
      w !== this.lastTexW ||
      h !== this.lastTexH ||
      depth !== this.lastDepth ||
      !this.triangleTextures;

    if (needRebuild) {
      this.triangleTextures = this.buildTriangleTextures(p, depth);
      this.lastTexW = w;
      this.lastTexH = h;
      this.lastDepth = depth;
    }
    return this.triangleTextures;
  }

  // Création de trois textures de triangle, une pour chaque orientation.
  // Le paramètre "depth" contrôle le point de départ du dégradé vertical (0.5 ici par exemple)
  buildTriangleTextures(p, depth = 0.5) {
    const w = p.width;
    const h = p.height;
    const vertiFade = 0.5;
    const res = [];

    // i == 0  ➔ bas (w × h)
    {
      const g = p.createGraphics(w, h, p.P2D);
      const ctx = g.elt.getContext("2d");
      const gradV = ctx.createLinearGradient(0, h / 2, 0, h);
      gradV.addColorStop(depth, "rgba(0,0,0,0)");
      gradV.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = gradV;
      this.drawTriangleShape(ctx, w, h);
      res.push(g);
    }

    // i == 1 et 2 ➔ côtés (h × w)
    for (let side = 0; side < 2; side++) {
      const g = p.createGraphics(h, w, p.P2D);
      const ctx = g.elt.getContext("2d");

      // dégradé vertical
      const gradV = ctx.createLinearGradient(0, w / 2, 0, w);
      gradV.addColorStop(depth, "rgba(0,0,0,0)");
      gradV.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = gradV;
      this.drawTriangleShape(ctx, h, w);

      // dégradé horizontal pour la latéralité
      const fadeStart =
        side === 0 ? w * 0.5 - w * vertiFade : w * 0.5 + w * vertiFade;
      const fadeEnd = side === 0 ? w : 0;
      const gradH = ctx.createLinearGradient(fadeStart, 0, fadeEnd, 0);
      gradH.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradH.addColorStop(1, "rgb(255, 255, 255)");
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = gradH;
      this.drawTriangleShape(ctx, h, w);
      ctx.globalCompositeOperation = "source-over";

      res.push(g);
    }

    return res; // [bas, coté‑droit, coté‑gauche]
  }

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
  applyRoundedMask(p, img, relR = 0.025) {
    const w = img.width;
    const h = img.height;

    // rayon = même valeur en pixels sur X et Y  →  coin reste circulaire
    const r = Math.min(w, h) * relR;

    const m = p.createGraphics(w, h);
    m.clear();
    m.noStroke();
    m.fill(255);

    m.beginShape();
    m.vertex(r, 0);
    m.vertex(w - r, 0);
    m.quadraticVertex(w, 0, w, r);
    m.vertex(w, h - r);
    m.quadraticVertex(w, h, w - r, h);
    m.vertex(r, h);
    m.quadraticVertex(0, h, 0, h - r);
    m.vertex(0, r);
    m.quadraticVertex(0, 0, r, 0);
    m.endShape(p.CLOSE);

    img.mask(m);
    return img;
  }
  buildMergedTriangle(p, tris, maskFn) {
    const w = p.width;
    const h = p.height;
    // 1️⃣ on crée un buffer 2D
    const m = p.createGraphics(w, h, p.P2D);
    m.clear();
    m.imageMode(p.CENTER);

    // 2️⃣ on y colle les 3 triangles
    //    – bas
    m.push();
    m.translate(w / 2, h / 2);
    m.image(tris[0], 0, 0);
    m.pop();
    //    – droite
    m.push();
    m.translate(w / 2, h / 2);
    m.rotate(p.HALF_PI);
    m.image(tris[1], 0, 0);
    m.pop();
    //    – gauche (miroir)
    m.push();
    m.translate(w / 2, h / 2);
    m.rotate(-p.HALF_PI);
    m.image(tris[2], 0, 0);
    m.pop();

    // 3️⃣ on transforme p5.Graphics en p5.Image pour le masque
    const mergedImg = m.get();

    // 4️⃣ on applique le mask arrondi (border‐radius)
    return maskFn(mergedImg);
  }
}
