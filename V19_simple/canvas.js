class CanvasManager {
  constructor() {
    // this.request = this._animation.bind(this);
    this.p5Instance = new p5((p) => {
      this.textures = [];
      this.s = {
        raw: 0,
        draw: true,
        current: 0,
        lastStep: 0,
        delta: -4,
        visualIndex: 0,
        isAnimating: false,
        currentSide: null,
        prevHoverTunnel: null,
        prevOpenTunnel: null,
      };
      const styleDatas = [
        ["pointer-events", "none"],
        ["image-rendering", "pixelated"],
        ["z-index", "0"],
      ];
      this.s.prevOpenTunnel = null;
      p.preload = () => {
        this.textures.push(p.loadImage("../IMG/frame_05.jpg"));
        this.textures.push(p.loadImage("../IMG/frame_06.jpg"));
        this.textures.push(p.loadImage("../IMG/p_a.jpg"));
        this.textures.push(p.loadImage("../IMG/p_b.jpg"));
        this.textures.push(p.loadImage("../IMG/frame_06.jpg"));
        this.textures.push(p.loadImage("../IMG/frame_05.jpg"));
        this.textures.push(p.loadImage("../IMG/p_b.jpg"));
        this.textures.push(p.loadImage("../IMG/p_a.jpg"));
      };
      p.setup = () => {
        this.canvas = p.createCanvas(
          window.innerWidth,
          window.innerHeight,
          p.WEBGL
        );

        styleDatas.forEach((styleData) => {
          this.canvas.style(styleData[0], styleData[1]);
        });
        const sceneEl = document.querySelector(".scene");
        sceneEl.parentNode.insertBefore(this.canvas.elt, sceneEl);

        p._renderer.GL.enable(p._renderer.GL.BLEND);
        p._renderer.GL.blendFunc(
          p._renderer.GL.SRC_ALPHA,
          p._renderer.GL.ONE_MINUS_SRC_ALPHA
        );

        p.clear();
        p.noLoop();

        this.triangleTextures = this.buildTriangleTextures(p, 0.5);
        this.mergedTri = this.buildMergedTriangle(
          p,
          this.triangleTextures,
          this.applyRoundedMask.bind(this, p)
        );

        this.sw = window.innerWidth;
        this.sh = window.innerHeight;
        // this.sh = 1204;

        this.s.isAnimating = false;
        this.s.base = this.s.raw * (this.sw / 3000);
        this.s.scale = this.sw / 3000;
        this.c = this._initCamera(p);
        this.s.visualIndex = this.textures.length - 1;
        this.panelOffset = (this.textures.length - 1) * this.sw;

        this._updateVoletsConfig();
        this.tunnels = this.textures.map((frameTex, idx) => {
          return this.VOLETS_CFG.map((cfg) => {
            const tex = cfg.texKind === "merged" ? this.mergedTri : frameTex;
            return new Volet(p, tex, {
              ...cfg,
              w: this.sw,
              h: this.sh,
              z: 0,
            });
          });
        });
      };
      this.setupMouseMove(p);
      this.setupWheel(p);

      p.draw = this._draw.bind(this, p);

      // …puis dans setup() ou là où tu ajoutes l’évènement wheel :

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
        this.s.scale = this.sw / 3000;
        this.drawTunnel();
      };
    });
  }
  _draw(p) {
    if (!this.s.draw) return;
    p.clear();
    p.noStroke();
    this.drawTunnel();
    if (this._animationsRunning()) {
      this.p5Instance.loop();
    } else {
      this.s.prevOpenTunnel = this.currentTunnel;
      this.s.draw = false;
      this.s.isAnimating = false;
    }
  }
  // ferme un tableau de Volets “frame”
  _closeTunnel(frames) {
    if (!frames) return;
    frames.filter((v) => v.cfg.texKind === "frame").forEach((v) => v.close());
  }

  // ouvre un tableau de Volets “frame” à l’angle normal
  _openTunnel(frames) {
    frames
      .filter((v) => v.cfg.texKind === "frame")
      .forEach((v) => {
        const delta = v.cfg.angle < 0 ? -this.s.delta : +this.s.delta;
        v.open(delta);
      });
  }
  setupMouseMove(p) {
    p.mouseMoved = () => {
      const w = p.width,
      h = p.height,
      cx = w / 2,
      cy = h / 2,
      mx = p.mouseX,
      my = p.mouseY,
      triG = [
        { x: 0, y: 0 },
        { x: cx, y: cy },
        { x: 0, y: h },
      ],
      triD = [
        { x: w, y: 0 },
        { x: cx, y: cy },
        { x: w, y: h },
      ];

      const isLeft = this.pointInPolygon(mx, my, triG);
      const isRight = this.pointInPolygon(mx, my, triD);
      const newSide = isLeft ? "left" : isRight ? "right" : null;

      // 1) Si on change de zone, on ferme l'ancien
      if (newSide !== this.s.currentSide) {
      if (this.s.prevHoverTunnel) {
        this._closeTunnel(this.s.prevHoverTunnel);
        this.s.prevHoverTunnel = null;
        this.s.draw = true; // Only set draw=true if we actually close something
      }
      }

      // 2) Si on sort complètement, on réinitialise et on s'arrête
      if (newSide === null) {
      console.log("out");
      this.s.currentSide = null;
      return;
      }

      // 3) Si on reste dans la même zone, on ne fait rien
      if (newSide === this.s.currentSide) {
      return;
      }

      // 4) Sinon on ouvre le nouveau volet (gauche ou droite)
      const idx = newSide === "left" ? 0 : 1;
      let raw = this.tunnels[this.s.visualIndex][idx];
      const frames = Array.isArray(raw) ? raw : [raw];
      this._openTunnel(frames);

      // 5) Mémoire + redraw
      this.s.prevHoverTunnel = frames;
      this.s.currentSide = newSide;
      this.s.draw = true;
      this.p5Instance.loop();
    };
  }
  setupWheel(p) {
    window.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();

        // Mise à jour du raw, base et draw
        this.s.raw = Math.max(0, this.s.raw + e.deltaY);
        this.s.base = this.s.raw * this.s.scale;
        this.s.draw = true;

        // Calcul du nouvel index et clamp
        const step = Math.floor(this.s.base / this.sw);
        const clamped = Math.max(0, Math.min(this.textures.length - 1, step));

        if (clamped !== this.s.current) {
          // Fermeture du tunnel précédent
          this._closeTunnel(this.s.prevHoverTunnel);
          this.s.prevHoverTunnel = null;
          this.s.currentSide = null;

          // Fermeture du tunnel ouvert par scroll précédent
          this._closeTunnel(this.s.prevOpenTunnel);

          // Mise à jour des indices
          this.s.current = clamped;
          this.s.visualIndex = this.textures.length - 1 - clamped;

          console.log("After update: ", this.s.visualIndex); // Affiche la nouvelle valeur de visualIndex

          // Ouverture du nouveau tunnel
          this.currentTunnel = this.tunnels[this.s.visualIndex];
          const frames = this.currentTunnel.filter(
            (v) => v.cfg.texKind === "frame"
          );
          frames.forEach((v) => (v.style.opacity = 205));

          this.s.prevOpenTunnel = frames;
        }

        this.p5Instance.loop();
      },
      { passive: false }
    );
  }
  _computeSide(p) {
    const w = p.width,
      h = p.height,
      cx = w / 2,
      cy = h / 2;
    const mx = p.mouseX,
      my = p.mouseY;
    const triG = [
      { x: 0, y: 0 },
      { x: cx, y: cy },
      { x: 0, y: h },
    ];
    const triD = [
      { x: w, y: 0 },
      { x: cx, y: cy },
      { x: w, y: h },
    ];
    const isLeft = this.pointInPolygon(mx, my, triG);
    const isRight = this.pointInPolygon(mx, my, triD);
    const newSide = isLeft ? "left" : isRight ? "right" : null;
    return { isLeft, isRight, newSide };
  }
  preloadAndSetup(p) {
    // ton preload, setup, etc.
    this.setupMouseMove(p);
    this.setupWheel(p);
  }

  _animationsRunning() {
    return this.tunnels.some((tunnel) =>
      tunnel.some(
        (volet) =>
          Math.abs(volet.cfg.angle - volet.targetAngle) > 0.1 ||
          Math.abs(volet.style.opacity - volet.style.targetOpacity) > 1
      )
    );
  }
  drawTunnel() {
    this.tunnels.forEach((voletList, idx) => {
      const rev = this.textures.length - 1 - idx;
      const z = this.s.base - rev * this.sw;
      voletList.forEach((volet) => {
        volet.cfg.z = z;
        volet.draw();
      });
    });
  }
  pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x,
        yi = poly[i].y;
      const xj = poly[j].x,
        yj = poly[j].y;
      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
  _getFoxy(sw) {
    return this.p5Instance.map(
      sw,
      this.fovyParams.minWidth,
      this.fovyParams.maxWidth,
      this.fovyParams.minFovy,
      this.fovyParams.maxFovy
    );
  }
  _initCamera(p) {

    const c = {
      // foxy: p.radians(p.height / 16.27),
      foxy: p.radians(p.height / 16.27),
      cam: p.createCamera(),
    };
    // c.cam.perspective(c.foxy, p.width / p.height, 0.1, 50000);
    c.cam.perspective(c.foxy, p.width / p.height, 0.1, 50000);
    return c;
  }

  _updateVoletsConfig() {
    this.VOLETS_CFG = [
      { texKind: "frame", x: 0, y: this.sh / 2, angle: 90, swapUV: false },
      {
        texKind: "frame",
        x: this.sw,
        y: 0,
        angle: -90,
        swapUV: false,
      },

      {
        texKind: "merged",
        x: this.sw / 2,
        y: this.sh / 2,
        angle: 0,
        swapUV: false,
      },
    ];
  }

  buildTriangleTextures(p, depth = 0.5) {
    const w = p.width,
      h = p.height;
    const vf = 0.5,
      apexFactor = 0.5;
    const out = [];
    const configs = [
      [w, h, null],
      [h, w, 0],
      [h, w, 1],
    ];

    for (const [W, H, side] of configs) {
      const g = p.createGraphics(W, H, p.P2D);
      const ctx = g.elt.getContext("2d");
      ctx.clearRect(0, 0, W, H);

      const gradV = ctx.createLinearGradient(0, H * apexFactor, 0, H);
      gradV.addColorStop(depth, "rgba(0,0,0,0)");
      gradV.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = gradV;
      this.drawTriangleShape(ctx, W, H);

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

    return out;
  }

  drawTriangleShape(ctx, w, h) {
    const apexFactor = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, h);
    ctx.lineTo(w / 2, h * apexFactor);
    ctx.closePath();
    ctx.fill();
  }

  applyRoundedMask(p, img, relR = 0.023) {
    const w = img.width;
    const h = img.height;

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

    const m = p.createGraphics(w, h, p.P2D);
    m.hide();
    m.clear();
    m.imageMode(p.CENTER);

    m.push();
    m.translate(w / 2, h / 2);
    m.image(tris[0], 0, 0);
    m.pop();

    m.push();
    m.translate(w / 2, h / 2);
    m.rotate(p.HALF_PI);
    m.image(tris[1], 0, 0);
    m.pop();

    m.push();
    m.translate(w / 2, h / 2);
    m.rotate(-p.HALF_PI);
    m.image(tris[2], 0, 0);
    m.pop();

    const mergedImg = m.get();

    return maskFn(mergedImg);
  }
}
