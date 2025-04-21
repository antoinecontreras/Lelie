class CanvasManager {
  constructor() {
    this.p5Instance = new p5((p) => {
      p.setup = () => {
        this.canvas = p.createCanvas(
          window.innerWidth,
          window.innerHeight,
          p.WEBGL
        );
        const sceneEl = document.querySelector('.scene');
      sceneEl.insertBefore(this.canvas.elt, sceneEl.firstChild);
        // Configuration du blending pour l'alpha
        p._renderer.GL.enable(p._renderer.GL.BLEND);
        p._renderer.GL.blendFunc(
          p._renderer.GL.SRC_ALPHA,
          p._renderer.GL.ONE_MINUS_SRC_ALPHA
        );
        p.pixelDensity(2);
        this.canvas.position(0, 0);
        this.canvas.style("pointer-events", "none");
        this.canvas.style("z-index", "0");

        

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

        let depth = 0.52; // ← si tu veux le faire varier
        // Pour chaque rectangle (ici on teste avec 1 rectangle, count=1)
        const count = 4;
        for (let i = count - 1; i >= 0; i--) {
          depth -= 0.3; // on diminue la profondeur à chaque itération
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
  const w = p.width, h = p.height;
  const vf = 0.5;               // fraction pour le fade horizontal
  const apexFactor = 0.5;       // sommet à mi‑hauteur
  const out = [];

  // configuration pour les 3 cas : [width, height, sideFlag]
  const configs = [
    [ w, h,   null  ],  // base
    [ h, w,   0     ],  // côté droit
    [ h, w,   1     ],  // côté gauche
  ];

  for (const [W, H, side] of configs) {
    const g   = p.createGraphics(W, H, p.P2D);
    g.hide();
    const ctx = g.elt.getContext("2d");

    // 1️⃣ Fade vertical de l'apex jusqu'en bas
    const gradV = ctx.createLinearGradient(
      0, H * apexFactor,
      0, H
    );
    gradV.addColorStop(depth, "rgba(0,0,0,0)");
    gradV.addColorStop(1,     "rgba(0, 0, 0, 0.8)");
    ctx.fillStyle = gradV;
    this.drawTriangleShape(ctx, W, H);

    // 2️⃣ Si c'est un côté, on ajoute le masque horizontal
    if (side !== null) {
      // calcule du décalage de début / fin
      const startX = H * (0.5 + (side === 0 ? -vf : vf));
      const endX   = side === 0 ? H : 0;

      const gradH = ctx.createLinearGradient(startX, 0, endX, 0);
      gradH.addColorStop(0, "rgba(0,0,0,0)");
      gradH.addColorStop(1, "rgba(255,255,255,1)");

      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = gradH;
      this.drawTriangleShape(ctx, W, H);
      ctx.globalCompositeOperation = "source-over";
    }

    out.push(g);
  }

  return out;  // [base, side‑right, side‑left]
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
  applyRoundedMask(p, img, relR = 0.023) {
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
    m.hide();
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
  hover(side, isHovering) {
    console.log("hover");
    // this.hoveredSide = isHovering ? side : null;
    // this.redraw();
  }
}
