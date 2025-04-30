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
        this.cam = p.createCamera();

        this.triangleTextures = this.buildTriangleTextures(p, 0.5);
        this.mergedTri = this.buildMergedTriangle(
          p,
          this.triangleTextures,
          this.applyRoundedMask.bind(this, p)
        );
        this.shouldDraw = true;
        this.lastTexW = 0;
        this.lastTexH = 0;
        this.lastDepth = 0.5;
        this.sw = window.innerWidth;
        this.sh = window.innerHeight;
        this.rectW = 2.5 * this.sw;
        this.rectH = 2.5 * this.sh;
        this.rawScroll = 0;
        this.SCROLL_FACTOR = 1;
        this.baseOffset1000 = 73.94;
        this.gapZ = 0.05;
        this._updateSpacing();
        this.scrollRatio = this.panelSpacing / this.sw;
        this.baseScroll = this.rawScroll * (this.sw / 1000);
        this._updateVoletsConfig();
        p.windowResized = () => {
          this.sw = window.innerWidth;
          this.sh = window.innerHeight;
          this.rectW = 2.5 * this.sw;
          this.rectH = 2.5 * this.sh;
          this.lastTexW = this.lastTexH = 0;
          this._updateSpacing();
          this.scrollRatio = this.panelSpacing / this.sw;

          this._updateVoletsConfig();
          this.p5Instance.resizeCanvas(window.innerWidth, window.innerHeight);
          this.shouldDraw = true;
          this.p5Instance.loop();
        };
        window.addEventListener(
          "wheel",
          (e) => {
            e.preventDefault();
            const newRawScroll = this.rawScroll + e.deltaY;
            const newBaseScroll = newRawScroll * (this.sw / 1000);
            if (newBaseScroll > 0) {
              this.rawScroll = newRawScroll;
              this.baseScroll = newBaseScroll;
              this.shouldDraw = true;
              this.p5Instance.loop();
            } else {
              this.rawScroll = 0;
              this.baseScroll = 0;
            }
          },
          { passive: false }
        );
      };

      p.draw = () => {
        if (!this.shouldDraw) return;
        p.clear();
        p.noStroke();

        const sw = this.sw,
          sh = this.sh;
       

         
        const fovy = p.map(sw, 1055, 1421, 1.055, 1.078);
        this.cam.perspective(fovy, p.width / p.height, 0.1, 50000);

       
        const offset = p.map(this.rectW, 1055, 1421, -94.95, 568.4);
        this.scrollDepthPx = offset - this.panelSpacing + this.baseScroll;
      
        this.textures.forEach((frameTex, idx) => {
          const rev = this.textures.length - 1 - idx;
          const z =
            this.scrollDepthPx - this.panelOffset - rev * this.panelSpacing;

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
    this.panelSpacing = this.rectW + this.gapZ * this.sw;
    this.panelOffset = (this.textures.length - 1) * this.panelSpacing * 0.1;
  }

  _resize() {
    this.sw = window.innerWidth;
    this.sh = window.innerHeight;
    this.rectW = this.sw * 2.5;
    this.rectH = this.sh * 2.5;
    this.baseScroll = this.rawScroll * (this.sw / 1000);
    this.triangleTextures = this.buildTriangleTextures(this.p5Instance, 0.5);
    this.mergedTri = this.buildMergedTriangle(
      this.p5Instance,
      this.triangleTextures,
      this.applyRoundedMask.bind(this, this.p5Instance)
    );

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
  hover(side, isHovering) {
    console.log("hover");
  }
}
