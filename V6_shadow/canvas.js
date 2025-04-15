class CanvasManager {
  constructor() {
    this.p5Instance = new p5((p) => {
      p.setup = () => {
        this.canvas = p.createCanvas(
          window.innerWidth,
          window.innerHeight,
          p.WEBGL
        );
        p._renderer.GL.enable(p._renderer.GL.BLEND);
        p._renderer.GL.blendFunc(
          p._renderer.GL.SRC_ALPHA,
          p._renderer.GL.ONE_MINUS_SRC_ALPHA
        );
        // p.setAttributes({
        //   alpha: true,
        //   // tu peux ajouter d’autres:
        //   // premultipliedAlpha: false,
        //   // antialias: false,
        //   // preserveDrawingBuffer: true,
        // });
        p.pixelDensity(4);
        this.canvas.position(0, 0);
        this.canvas.style("pointer-events", "none");
        //   this.canvas.style('z-index', '9999');
        p.clear();
        p.noLoop();
        this.cam = p.createCamera();
        this.radiusPx = this.getRadiusPx(4.5); // 3.5rem => px
        // this.shadowTexture = this.createShadowTexture(p); // 🔥 Créée une fois
        this.shadowTexture = this.createTestTexture(p);
      };

      p.draw = () => {
        if (!this.shouldDraw) return;

        p.clear();
        p.noStroke();
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        // 1) Perspect. CSS "100vw" => en px
        const perspectivePx = screenW;
        const fov = 2 * Math.atan(screenH / 2 / perspectivePx);

        this.cam.setPosition(0, 0, perspectivePx);
        this.cam.perspective(fov, p.width / p.height, 0.1, 50000);
        this.cam.lookAt(0, 0, 0);

        // 2) Scroll en px
        const scrollDepthPx = (this.getScrollDepth() / 100) * screenW;

        // 3) Pour chaque .rectangle
        for (let i = 0; i < 3; i++) {
          // 250vw => 2.5 * screenW, 250vh => 2.5 * screenH
          const rectW = 2.5 * screenW;
          const rectH = 2.5 * screenH;

          // translateZ(calc(var(--scroll-depth) - 150vw + 300vw * index * -1))
          const z = scrollDepthPx - 1.5 * screenW - 3 * screenW * i;

          p.push();
          // Centrage (-50%, -50%)
          p.translate(0, 0, z);
          p.translate(-rectW / 2, -rectH / 2);
          // this.drawRect(p, rectW, rectH); // ton dessin
          this.drawRoundedRect(
            p,
            rectW,
            rectH,
            this.radiusPx,
            this.shadowTexture
          );
          p.pop();
        }

        this.shouldDraw = false;
      };
    });

    this.shouldDraw = false;
  }
  getRadiusPx(remNumber) {
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
    console.log(rootFontSize);
    const radiusPx = remNumber * rootFontSize; // 7rem => px
    return radiusPx;
  }

  redraw() {
    this.shouldDraw = true;
    this.p5Instance.loop();
  }

  resize() {
    this.p5Instance.resizeCanvas(window.innerWidth, window.innerHeight);
    this.updatePerspective(); // ⬅️ 🔥 Recalculer la perspective
    this.redraw();
  }
  updatePerspective() {
    const p = this.p5Instance;

    const perspectiveCSS = window.innerWidth;
    const fov = 2 * Math.atan(p.height / 2 / perspectiveCSS); // 🎯 recalcul propre

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
  // drawRoundedRect(p, w, h, r, textureToUse) {
  //   // p.noStroke();
  //   p.stroke(0, 255, 0);
  //   p.strokeWeight(20);
  //   p.texture(textureToUse);
  //   p.beginShape();
  //   p.vertex(0, 0, 0, 0);
  //   p.vertex(w, 0, 1, 0);
  //   p.vertex(w, h, 1, 1);
  //   p.vertex(0, h, 0, 1);
  //   p.endShape(p.CLOSE);
  //   // p.stroke(0, 255, 0);
  //   // p.strokeWeight(20);
  //   // p.noFill();
  //   // // p.rectMode(p.CENTER);
  //   // p.rect(0, 0, w, h, r);
  // }
  drawRoundedRect(p, w, h, r, textureToUse) {
    p.stroke(0, 255, 0);
    p.strokeWeight(20);
    // p.noFill();
    // p.color(0, 126, 255, 200)
    p.fill(0, 0, 0,20);
    // p.alpha(p.color(0, 126, 255, 200));
    p.rect(0, 0, w, h, r);

    // p.noStroke();
    // p.texture(textureToUse);
    // p.beginShape();

    // const uSize = 0.5; // 🔥🔥 moitié de la texture en largeur ET hauteur
    // console.log(w);
    // p.vertex(0, 0, 0, 0);
    // p.vertex(w, 0, uSize, 0);
    // p.vertex(w, h, uSize, uSize);
    // p.vertex(0, h, 0, uSize);

    // p.endShape(p.CLOSE);
  }

  createShadowTexture(p) {
    const texSize = 512; // 🔥 Petite taille pour l'optimisation
    const gfx = p.createGraphics(texSize, texSize);

    gfx.noFill();
    gfx.background(255);

    let settings = {
      shrink: 1,
      radius: 45,
      levels: 50,
      minColor: 0,
      maxColor: 175,
    };

    let w = gfx.width * 0.6;
    gfx.push();
    gfx.translate(gfx.width / 2, gfx.height / 2 - w / 2);

    for (let i = 0; i < settings.levels; i++) {
      let t = i / (settings.levels - 1);
      let offset = i * settings.shrink;
      let offsetY = i * settings.shrink;
      let col = gfx.lerp(settings.minColor, settings.maxColor, t);
      let alpha = gfx.map(i, 0, settings.levels, 255, 0);
      const radius = gfx.map(i, 0, settings.levels, 15, settings.radius);

      gfx.stroke(col, alpha);
      gfx.strokeWeight(gfx.map(i, 0, settings.levels, 30, 18));

      this.drawUShape(
        gfx,
        -w / 2 + offset,
        offsetY,
        w - 2 * offset,
        w - 2 * offset,
        radius
      );
    }
    gfx.pop();
    return gfx;
  }
  drawUShape(g, x, y, w, h, r) {
    let radius = Math.min(r, w / 2, h / 2);

    g.beginShape();
    g.vertex(x, y);
    g.vertex(x, y + h - radius);
    g.quadraticVertex(x, y + h, x + radius, y + h);
    g.vertex(x + w - radius, y + h);
    g.quadraticVertex(x + w, y + h, x + w, y + h - radius);
    g.vertex(x + w, y);
    g.endShape();
  }
  createTestTexture(p) {
    const size = 20;
    const gfx = p.createGraphics(size, size);

    gfx.clear(); // 🔥 totalement transparent

    const cols = 8;
    const rows = 8;
    const cellW = size / cols;
    const cellH = size / rows;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if ((x + y) % 2 === 0) {
          gfx.noStroke();
          gfx.fill(255, 0, 0, 15); // Blanc 100%
          gfx.rect(x * cellW, y * cellH, cellW, cellH);
        }
      }
    }

    return gfx;
  }
}
