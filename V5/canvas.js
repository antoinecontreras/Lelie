class CanvasManager {
  constructor() {
    this.p5Instance = new p5((p) => {
      p.setup = () => {
        this.canvas = p.createCanvas(
          window.innerWidth,
          window.innerHeight,
          p.WEBGL
        );
        p.pixelDensity(4);
        this.canvas.position(0, 0);
        this.canvas.style("pointer-events", "none");
        //   this.canvas.style('z-index', '9999');
        p.clear();
        p.noLoop();
        this.cam = p.createCamera();
        this.radiusPx = this.getRadiusPx(4.5); // 3.5rem => px
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
          this.drawRoundedRect(p, rectW, rectH, this.radiusPx);
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
  drawRoundedRect(p, w, h, r) {
    p.stroke(0, 255, 0);
    p.strokeWeight(2);
    p.noFill();
    // p.rectMode(p.CENTER);
    p.rect(0, 0, w, h, r);
  }
}
