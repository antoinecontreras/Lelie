class CanvasManager {
  constructor() {
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
        inVolet: false,
        clickMode: false,
      };
      const styleDatas = [
        ["pointer-events", "none"],
        ["image-rendering", "pixelated"],
        ["z-index", "0"],
        ["border-radius", "1.4rem"],
      ];
      this.s.prevOpenTunnel = null;

      p.preload = () => {
        this.textures.push(p.loadImage("../IMG/frame_05.jpg"));
        this.textures.push(p.loadImage("../IMG/frame_06.jpg"));
        this.textures.push(p.loadImage("../IMG/p_a.jpg"));
        this.textures.push(p.loadImage("../IMG/p_b.jpg"));
        this.textures.push(p.loadImage("../IMG/frame_05.jpg"));
        this.textures.push(p.loadImage("../IMG/p_b.jpg"));
        this.textures.push(p.loadImage("../IMG/p_a.jpg"));
        this.textures.push(p.loadImage("../IMG/frame_06.jpg"));
      };

      p.setup = () => {
        this.canvas = p.createCanvas(
          window.innerWidth,
          window.innerHeight,
          p.WEBGL
        );
        const sceneEl = document.querySelector(".canvas-container");
        this.canvas.parent(sceneEl);

        this.preloadAndSetup(p);
        styleDatas.forEach((styleData) => {
          this.canvas.style(styleData[0], styleData[1]);
        });

        p.clear();
        // p.noLoop();

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
        // this.panelOffset = (this.textures.length - 1) ;
        addScreenPositionFunction(p);
        this._updateVoletsConfig();
        this.tunnels = this.textures.map((frameTex, idx) => {
          return this.VOLETS_CFG.map((cfg) => {
            console.log();
            cfg.ancer = cfg.angle > 0 ? 0 : cfg.wall;
            const tex = cfg.texKind === "merged" ? this.mergedTri : frameTex;
            return new Volet(p, tex, {
              ...cfg,
              w: this.sw,
              h: this.sh,
              z: 0,
            });
          });
        });
        this.s.prevHoverTunnel = this.tunnels[this.tunnels.length - 1];
        console.log(this.s.prevHoverTunnel);
        this._enterTunnel(this.s.prevHoverTunnel);
      };

      p.draw = this._draw.bind(this, p);

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
        // this.s.scale = this.sw / 3000;
        this.drawTunnel();
      };
    });
  }
  _draw() {
    if (!this.s.draw) return;
    const p = this.p5Instance;
    p.clear();
    p.noStroke();
    const corners = this.drawTunnel(p);
    if (this.s.inVolet && !this.s.clickMode) {
      const mapX = p.map(p.mouseX, 0, this.sw, -this.sw / 2, this.sw / 2);
      
      for (let i = 0; i < corners.length; i++) {
        const leftSide = corners[i][0];
        const rightSide = corners[i][1];
        if (!leftSide && !rightSide) continue;
        
        const side = this.s.inVolet === "left" ? leftSide : rightSide;
        const isInSide =
        mapX >= Math.min(side.p1, side.p2) &&
        mapX <= Math.max(side.p1, side.p2);
        
        if (isInSide) {
          if (
            this.activeTunnel !== this.s.prevOpenTunnel &&
            this.s.prevOpenTunnel
          ) {
            this.tunnels.forEach((tunnel) => {
              tunnel
                .filter((volet) => volet.isOpen == true)
                .forEach((volet) => volet.close());
              this.s.draw = true;
              this.p5Instance.loop();
            });
          }
          if (this.s.current !== this.textures.length - 1 - i) {
            this.s.current = this.textures.length - 1 - i;
          }

          const tunnelIndex = this.s.inVolet === "left" ? 0 : 1;
          this.currentTunnel = this.tunnels[i][tunnelIndex];
          this._openTunnel(this.currentTunnel);
          const mergedData = this.tunnels[i].find(
            (e) => e.cfg.texKind === "merged"
          );
          mergedData.sleep();
        } else {
          const mergedData = this.tunnels[i].find(
            (e) => e.cfg.texKind === "merged"
          );
          mergedData.focus();
        }
      }
    }

    if (this._animationsRunning()) {
      // this.p5Instance.loop();
    } else {
      this.s.prevOpenTunnel = this.currentTunnel;
      this.s.draw = false;
      this.s.isAnimating = false;
    }
  }

  // ouvre un tableau de Volets “frame” à l’angle normal
  _openTunnel(frame) {
    const delta = frame.cfg.angle < 0 ? -this.s.delta : +this.s.delta;
    frame.open(delta);
  }
  setupMouseMove(p) {
    p.mouseMoved = () => {
      if (this.s.clickMode) return;
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

      const isInLeftTriangle = this.pointInPolygon(mx, my, triG);
      const isInRightTriangle = this.pointInPolygon(mx, my, triD);
      this.s.inVolet = isInLeftTriangle
        ? "left"
        : isInRightTriangle
        ? "right"
        : false;
      if (this.s.inVolet) {
        this.s.draw = true;
        this.p5Instance.loop();
      } else {
        // this.tunnels.forEach((volet) => volet.filter((frame) => frame.cfg));
        if (Array.isArray(this.tunnels)) {
          this.tunnels.forEach((volet) => {
            volet
              .filter((frame) => frame.isOpen == true)
              .forEach((frame) => {
                frame.close();
                // this.s.draw = true;
                // this.p5Instance.loop();
              });
          });
        }
      }
    };
  }
  setupMouseClicked(p) {
    p.mouseClicked = (e) => {
      if (!this.s.inVolet || e.target.id !== "canvasForHTML") return;

      const { s, tunnels, textures } = this;

      // Update positions and state
      // console.log(s.current);

      // Handle tunnel transitions
      s.prevHoverTunnel
        ?.filter((v) => v.cfg.texKind === "frame")
        .forEach((v) => {
          v.close();
          v.sleep();
        });

      s.scrollFrame = tunnels[s.visualIndex];
      this._enterTunnel(s.scrollFrame);
      this._getTitle(s.visualIndex);
      s.prevHoverTunnel = s.scrollFrame;

      s.raw = (s.current * this.sw) / 2 / s.scale;
      s.base = s.raw * s.scale;
      s.draw = true;
      s.visualIndex = textures.length - 1 - s.current;

      if (!s.clickMode && this.currentTunnel.cfg.z === 0) {
        this.currentTunnel.isClicked(90);

        s.clickMode = true;
      } else s.clickMode = false;
    };
  }
  _getTitle(element) {
    const el = document.querySelector(`.scene>a:nth-child(${element + 1})`);
    const focused = document.querySelector(".scene>a.focus");
    if (focused === el) return;
    focused?.classList.remove("focus");
    el.classList.add("focus");
  }
  _enterTunnel(frames) {
    frames.filter((v) => v.cfg.texKind === "frame");
    frames.forEach((v) => {
      v.focus();
    });
  }
  setupWheel(p) {
    window.addEventListener(
      "wheel",
      (e) => {
        if (this.s.clickMode) return;
        e.preventDefault();
        // Mise à jour du raw, base et draw
        this.s.raw = Math.max(0, this.s.raw + e.deltaY);
        this.s.base = this.s.raw * this.s.scale;
        this.s.draw = true;

        // Calcul du nouvel index et clamp
        // const step = Math.floor(this.s.base / this.sw*2);
        const step = Math.floor((this.s.base / this.sw) * 2);
        const clamped = Math.max(0, Math.min(this.textures.length - 1, step));

        if (clamped !== this.s.current) {
          // Fermeture du tunnel précédent

          this.s.prevHoverTunnel
            .filter((volet) => volet.cfg.texKind == "frame")
            .forEach((volet) => {
              volet.close();
              volet.sleep();
            });

          this.s.current = clamped;
          this.s.visualIndex = this.textures.length - 1 - clamped;

          this.s.scrollFrame = this.tunnels[this.s.visualIndex];
          this._enterTunnel(this.s.scrollFrame);

          this._enterTunnel(this.s.scrollFrame);
          this._getTitle(this.s.visualIndex);
          this.s.prevHoverTunnel = this.s.scrollFrame;
        }

        this.p5Instance.loop();
      },
      { passive: false }
    );
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
  drawTunnel(p) {
    const vols = [];
    const halfSw = this.sw / 2;
    const halfSh = this.sh / 2;

    for (let idx = 0; idx < this.tunnels.length; idx++) {
      const voletList = this.tunnels[idx];
      const z = this.s.base - ((this.textures.length - 1 - idx) * this.sw) / 2;
      if (z < halfSw) {
        let vol = [];
        for (const volet of voletList) {
          volet.cfg.z = z;
          volet.draw();

          const angle = volet.initialAngle;
          if (angle !== -90 && angle !== 90) continue;

          const isLeftSide = angle === 90;
          // console.log(volet.cfg.ancer, volet.cfg.w);
          const x = isLeftSide ? 0 : volet.cfg.w;

          // console.log(z);
          const p1 =
            z > 0
              ? { x: isLeftSide ? -halfSw : halfSw, y: -halfSh }
              : p.screenPosition(x, 0, 0);

          const p2 = p.screenPosition(
            // x + (isLeftSide ? volet.cfg.w/2 : -volet.cfg.w),
            x + (isLeftSide ? halfSw : -halfSw),
            20,
            0
          );

          vol.push({ p1: p1.x, p2: p2.x });
        }

        vols.push(vol);
      }
    }
    return vols;
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

  // _getFoxy(sw) {
  //   return this.p5Instance.map(
  //     sw,
  //     this.fovyParams.minWidth,
  //     this.fovyParams.maxWidth,
  //     this.fovyParams.minFovy,
  //     this.fovyParams.maxFovy
  //   );
  // }
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
      {
        texKind: "frame",
        x: 0,
        y: this.sh / 2,
        wall: this.sw / 2,
        angle: 90,
        swapUV: false,
      },
      {
        texKind: "frame",
        x: this.sw,
        y: 0,
        wall: this.sw / 2,
        angle: -90,
        swapUV: false,
      },
      {
        texKind: "merged",
        x: this.sw,
        y: this.sh,
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
  preloadAndSetup(p) {
    // ton preload, setup, etc.
    this.setupMouseMove(p);
    this.setupMouseClicked(p);
    this.setupWheel(p);
  }
}
