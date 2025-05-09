class CanvasManager {
  constructor() {
    this.p5Instance = new p5((p) => {
      this.textures = [];
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

        const sceneEl = document.querySelector(".scene");
        sceneEl.parentNode.insertBefore(this.canvas.elt, sceneEl);

        p._renderer.GL.enable(p._renderer.GL.BLEND);
        p._renderer.GL.blendFunc(
          p._renderer.GL.SRC_ALPHA,
          p._renderer.GL.ONE_MINUS_SRC_ALPHA
        );

        this.canvas.position(0, 0);
        this.canvas.style("pointer-events", "none");
        this.canvas.style("image-rendering", "pixelated");
        this.canvas.style("z-index", "0");

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

        this.s = {
          raw: 0,
          draw: true,
          current: 0,
          lastStep: 0,
        };
        this.s.base = this.s.raw * (this.sw / 3000);
        this.s.scale = this.sw / 3000;

        this.c = {
          foxy: p.radians(74),
          cam: p.createCamera(),
        };
        this.c.cam.perspective(this.c.foxy, p.width / p.height, 0.1, 50000);
        this.panelOffset = (this.textures.length - 1) * this.sw;

        this._updateVoletsConfig();
        this.tunnels = this.textures.map((frameTex, idx) => {
          return this.VOLETS_CFG.map((cfg) => {
            // Choix de la texture en fonction de cfg.texKind
            const tex = cfg.texKind === "merged" ? this.mergedTri : frameTex;
            return new Volet(p, tex, {
              ...cfg,
              w: this.sw,
              h: this.sh,
              z: 0,
            });
          });
        });
        p.draw = () => {
          if (!this.s.draw) return;
          p.clear();
          p.noStroke();

          this.drawTunnel();
          this.s.draw = false;
        };
        p.mouseClicked = () => {
          const w = p.width,
            h = p.height,
            cx = w / 2,
            cy = h / 2,
            mx = p.mouseX,
            my = p.mouseY;

          // défini tes deux triangles
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
          if (this.pointInPolygon(mx, my, triG)) {
            const focal = this.sh / 2 / Math.tan(this.c.foxy / 2);
            const screenW = this.sw * focal;
            console.log(screenW);
          } else if (this.pointInPolygon(mx, my, triD)) {
            console.log("droit");
          }
        };
        p.windowResized = () => {
          this.s.scale = this.sw / 3000;
          p.resizeCanvas(window.innerWidth, window.innerHeight);
          this.drawTunnel();
        };

        // …puis dans setup() ou là où tu ajoutes l’évènement wheel :
        window.addEventListener(
          "wheel",
          (e) => {
            e.preventDefault();

            // 1) On incrémente toujours raw avec deltaY
            this.s.raw += e.deltaY;

            // 2) On ne veut pas de négatif : clamp à 0
            if (this.s.raw < 0) this.s.raw = 0;

            // 3) On recalcule base et mark pour redraw
            this.s.base = this.s.raw * this.s.scale;
            this.s.draw = true;

            // 4) Calcul de l’étape courante et clamp sur [0, N-1]
            const step = Math.floor(this.s.base / this.sw);
            const clamped = Math.max(
              0,
              Math.min(this.textures.length - 1, step)
            );

            // 5) Si on a changé d’étape, on ouvre/ferme les volets
            if (clamped !== this.s.current) {
              this.s.current = clamped;

              const DELTA = -7;
              const N     = this.textures.length;
              // On convertit l’étape logique en indice visuel
              // (rev==0 ⇒ le plus proche de la caméra)
              const visualIndex = N - 1 - clamped;
          
              this.tunnels.forEach((liste, idx) => {
                liste.forEach((volet) => {
                  if (idx === visualIndex && volet.cfg.texKind === "frame") {
                    volet.open(volet.cfg.angle < 0 ? -DELTA : +DELTA);
                  } else {
                    volet.close();
                  }
                });
              }); 
            }
            // console.log(clamped);

            // 4) On redessine dans tous les cas
            this.p5Instance.loop();
          },
          { passive: false }
        );
      };
    });
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

  _updateVoletsConfig() {
    this.VOLETS_CFG = [
      {
        texKind: "frame",
        x: this.sw,
        y: 0,
        angle: -90,
        swapUV: false,
      },
      { texKind: "frame", x: 0, y: this.sh / 2, angle: 90, swapUV: false },

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
