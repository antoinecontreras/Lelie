class CanvasManager {
  constructor() {
    this.p5Instance = new p5((p) => {
      this.textures = [];
      p.preload = () => {
        // 1️⃣ Charge tes vidéos ou images ici
        // Exemple avec images statiques :
        // this.textures[0] = p.loadImage("../IMG/1product Small.jpeg");
        this.textures.push(p.loadImage("../IMG/frame_05.jpg"));
        this.textures.push(p.loadImage("../IMG/frame_06.jpg"));
        this.textures.push(p.loadImage("../IMG/p_a.jpg"));
        this.textures.push(p.loadImage("../IMG/p_b.jpg"));

        this.textures.push(p.loadImage("../IMG/frame_06.jpg"));

        this.textures.push(p.loadImage("../IMG/frame_05.jpg"));

        this.textures.push(p.loadImage("../IMG/p_b.jpg"));

        this.textures.push(p.loadImage("../IMG/p_a.jpg"));

        // this.textures[1] = p.loadImage('assets/side.jpg');
        // this.textures[2] = p.loadImage('assets/side.jpg');
      };
      p.setup = () => {
        this.canvas = p.createCanvas(
          window.innerWidth,
          window.innerHeight,
          p.WEBGL
        );
        // this.scrollDepthPx = 0;
        const sceneEl = document.querySelector(".scene");
        sceneEl.parentNode.insertBefore(this.canvas.elt, sceneEl);
        // Configuration du blending pour l'alpha
        p._renderer.GL.enable(p._renderer.GL.BLEND);
        p._renderer.GL.blendFunc(
          p._renderer.GL.SRC_ALPHA,
          p._renderer.GL.ONE_MINUS_SRC_ALPHA
        );
        // p.pixelDensity(0.1);
        // p.pixelDensity(1);
        this.canvas.position(0, 0);
        this.canvas.style("pointer-events", "none");
        this.canvas.style("image-rendering", "pixelated");
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
        this.sw = window.innerWidth;
        this.sh = window.innerHeight;
        this.rectW = 2.5 * this.sw;
        this.rectH = 2.5 * this.sh;
        this.rawScroll = 0;
        this.SCROLL_FACTOR = 1;        // ← à ajuster pour gagner plus ou moins de profondeur par wheel
        this.baseOffset1000 = 73.94;  
        this.gapZ = 0.05; // 20% de sw en plus entre chaque panneau
        this._updateSpacing();
        this.scrollRatio = this.panelSpacing / this.sw;
        const rawScroll = this.getScrollDepth(); // Added back to compute rawScroll
        // this.scrollDepthPx = this.rawScroll * this.scrollRatio; // Updated to reflect the change

        this._updateVoletsConfig();
        p.windowResized = () => {
          this.sw = window.innerWidth;
          this.sh = window.innerHeight;
          this.rectW = 2.5 * this.sw;
          this.rectH = 2.5 * this.sh;
          this.lastTexW = this.lastTexH = 0;
          this._updateSpacing(); // <— on recalcule spacing & offset
          this.scrollRatio = this.panelSpacing / this.sw;
          // this._resize(); // recrée textures et volets avec les bonnes dimensions
          this._updateVoletsConfig();
          this.p5Instance.resizeCanvas(window.innerWidth, window.innerHeight);
          this.shouldDraw = true;
          this.p5Instance.loop();

          // console.log(this.rawScroll);
          // console.log("scrollRatio", this.scrollRatio);
          // console.log("scrollDepthPx", this.scrollDepthPx);
        };
        window.addEventListener(
          "wheel",
          (e) => {
            // empêche le scroll de la page
            e.preventDefault();

            // incrémente ou décrémente
            this.rawScroll += e.deltaY;

            // optionnel : borne le scroll pour ne pas sortir du tunnel
            // const maxSteps = this.textures.length - 1;
            // const maxRaw = maxSteps * this.sw;
            // this.rawScroll = Math.max(this.rawScroll, -maxRaw);
            // console.log(this.rawScroll);
            // console.log("scrollRatio", this.scrollRatio);
            // console.log("scrollDepthPx", this.scrollDepthPx);

            // redessine immédiatement
            this.shouldDraw = true;
            this.p5Instance.loop();
          },
          { passive: false }
        );
      };

      p.draw = () => {
        if (!this.shouldDraw) return;
        p.clear();
        p.noStroke();

        // 1) cam + perspective (tel que tu avais)
        const sw = this.sw,
          sh = this.sh;
        // const perspectivePx = sw;
        const perspectivePx = 800;
   
        // const fov = 2 * Math.atan(sh / 2 / perspectivePx);
        const fovy =1;
        this.cam.perspective(fovy, p.width / p.height, 0.1, 50000);
        

        // 3) conversion VW→px pour la profondeur
        const scrollDepthFromWheel = (this.rawScroll / 1000) * sw;
        const gRatio = p.map(this.rectW, 1055, 1421, -94.95, 568.4);
        
        this.scrollDepthPx = gRatio-this.panelSpacing+scrollDepthFromWheel;
        
      
        console.log(
          `sw=${sw}`,
          `scrollDepthFromWheel=${scrollDepthFromWheel}`,
          `scrollDepthPx=${this.scrollDepthPx}`
        );
        // On déplace merged (ombre frontale) **en dernier**,
        // pour qu’elle soit dessinée par-dessus les volets latéraux
        // const test = p.map(p.cos(scrollDepthPx / 600), -1, 1, 0.05, 0.15);
        // p.pixelDensity(test);
        // boucle sur chaque “frame” de ton tunnel
        this.textures.forEach((frameTex, idx) => {
          const rev = this.textures.length - 1 - idx;
          const z =
            this.scrollDepthPx - this.panelOffset - rev * this.panelSpacing;
          // pour chaque volet (avant / droite / gauche)
          this.VOLETS_CFG.forEach((cfg) => {
            const tex = cfg.texKind === "merged" ? this.mergedTri : frameTex;
            new Volet(p, tex, {
              w: this.rectW,
              h: this.rectH,
              x: cfg.x,
              y: cfg.y,
              z,
              angle: cfg.angle,
              swapUV: cfg.swapUV,
            }).draw();
          });
        });
        this.shouldDraw = false;
      };
    });
  }

  _updateSpacing() {
    // Espacement entre deux panneaux
    this.panelSpacing = this.rectW + this.gapZ * this.sw;

    // Nombre de panneaux (le même que this.textures.length)
    const N = this.textures.length;

    // Détermine la moitié de l’étendue totale de la pile :
    // (N-1) intervalles → (N-1)*panelSpacing, et on en prend la moitié
    this.panelOffset = (N - 1) * this.panelSpacing * 0.1;
  }

  _computeDepth() {
    const r = this.sh / this.sw;
    // map(r, r_min, r_max, depth_max, depth_min, clamp)
    return p5.prototype.map(r, 0.5, 2.0, 0.6, 0.4, true);
  }

  _resize() {
    // stocke les nouvelles dimensions
    this.sw = window.innerWidth;
    this.sh = window.innerHeight;
    this.rectW = this.sw * 2.5;
    this.rectH = this.sh * 2.5;

    // 1) (Re)crée tes textures de shadow-only triangles si besoin
    this.triangleTextures = this.buildTriangleTextures(this.p5Instance, 0.5);
    this.mergedTri = this.buildMergedTriangle(
      this.p5Instance,
      this.triangleTextures,
      this.applyRoundedMask.bind(this, this.p5Instance)
    );

    // 2) Instancie une fois tes Volets
    //    On stocke seulement la config statique : x,y,angle,swapUV + kind de texture
    const cfgList = [
      {
        texKind: "merged",
        x: this.rectW / 2,
        y: this.rectH / 2,
        angle: 0,
        swapUV: false,
      },
      {
        texKind: "frame",
        x: this.rectW,
        y: this.rectH / 2,
        angle: -90,
        swapUV: false,
      },
      { texKind: "frame", x: 0, y: this.rectH / 2, angle: 90, swapUV: false },
    ];
    this.volets = cfgList.map(
      (cfg) =>
        new Volet(
          this.p5Instance,
          /* tex */ null,
          /* cfg */ { ...cfg, w: this.rectW, h: this.rectH, z: 0 }
        )
    );
  }
  buildVoletTexture(p, w, h, borderRadius) {
    const g = p.createGraphics(w, h);
    g.clear();
    g.noStroke();

    g.rect(0, 0, w, h, borderRadius);
    return g;
  }
  _updateVoletsConfig() {
    this.VOLETS_CFG = [
      {
        texKind: "frame",
        x: this.rectW,
        y: 0,
        angle: -90,
        swapUV: false,
      },
      { texKind: "frame", x: 0, y: this.rectH / 2, angle: 90, swapUV: false },

      {
        texKind: "merged",
        x: this.rectW / 2,
        y: this.rectH / 2,
        angle: 0,
        swapUV: false,
      },
    ];
  }
  // dessine un plan w×h texturé à la position (x,y,z) et tourné en Y à angleDeg (en degrés)
  drawWall(p, tex, w, h, x, y, z, angleDeg) {
    p.push();
    p.translate(x, y, z);
    p.rotateY((angleDeg * Math.PI) / 180);
    p.translate(-w / 2, -h / 2, 0);
    p.textureMode(p.NORMAL);
    p.texture(tex);
    p.beginShape();
    p.vertex(0, 0, 0, 0);
    p.vertex(w, 0, 1, 0);
    p.vertex(w, h, 1, 1);
    p.vertex(0, h, 0, 1);
    p.endShape(p.CLOSE);
    p.pop();
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
    const w = p.width,
      h = p.height;
    const vf = 0.5,
      apexFactor = 0.5;
    const out = [];

    // configs pour base, côté-droit et côté-gauche
    const configs = [
      [w, h, null],
      [h, w, 0],
      [h, w, 1],
    ];

    for (const [W, H, side] of configs) {
      const g = p.createGraphics(W, H, p.P2D);
      const ctx = g.elt.getContext("2d");
      // ➊ on vide tout
      ctx.clearRect(0, 0, W, H);

      // ➋ fade vertical
      const gradV = ctx.createLinearGradient(0, H * apexFactor, 0, H);
      gradV.addColorStop(depth, "rgba(0,0,0,0)");
      gradV.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = gradV;
      this.drawTriangleShape(ctx, W, H);

      // ➌ masque horizontal pour les côtés
      if (side !== null) {
        const startX = H * (0.5 + (side === 0 ? -vf : vf));
        const endX = side === 0 ? H : 0;
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

    return out; // [base, side-right, side-left]
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
