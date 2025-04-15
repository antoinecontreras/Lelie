class CanvasManager {
  constructor() {
    this.img = null;
    this.p5Instance = new p5((p) => {
      p.preload = () => {
        // this.img = p.loadImage('../IMG/1_gradient.png');
      };
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
        this.canvas.imageSmoothingEnabled = false;
        // p.setAttributes({
        //   alpha: true,
        //   // tu peux ajouter d’autres:
        //   // premultipliedAlpha: false,
        //   // antialias: false,
        //   // preserveDrawingBuffer: true,
        // });
        p.pixelDensity(2);
        this.canvas.position(0, 0);
        this.canvas.style("pointer-events", "none");
        // this.canvas.style("image-rendering", "pixelated");
        this.canvas.style("z-index", "9999");

        p.clear();
        p.noLoop();
        this.cam = p.createCamera();
        this.radiusPx = this.getRadiusPx(4.5); // 3.5rem => px
        this.shadowTexture = p.loadImage("../IMG/1_gradient.png", (img) => {
          this.roundTexture = this.applyRoundedMask(p, img, 0.02, 0.023);

          this.redraw(); // Redessiner une fois l’image prête
        });

        // this.canvas.imageSmoothingEnabled = false;
        // this.pixelTex = this.canvas.getTexture( this.shadowTexture);
        // this.pixelTex.setInterpolation(p.NEAREST, p.NEAREST);
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
        const count = 3;
        for (let i = count - 1; i >= 0; i--) {
          const rectW = 2.5 * screenW;
          const rectH = 2.5 * screenH;

          const z = scrollDepthPx - 1.5 * screenW - 3 * screenW * i;

          p.push();
          p.translate(0, 0, z);

          p.translate(-rectW / 2, -rectH / 2);

          this.drawRoundedRect(
            p,
            rectW,
            rectH,
            this.radiusPx,
            this.roundTexture
          );

          p.pop();

          // p.push();
          // p.translate(0, 0, z);

          // p.translate(-rectW / 2, -rectH / 2);
          // p.stroke(255, 0, 0, 100);
          // const strokeDepth = 3;
          // const coef = 1;
          // p.strokeWeight(strokeDepth);
          // p.noFill();
          // // p.rectMode(p.CENTER);
          // p.rect(
          //   -strokeDepth*.5,
          //   -strokeDepth*.5,
          //   rectW + strokeDepth ,
          //   rectH + strokeDepth,
          //   this.radiusPx
          // );
          // p.pop();
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

  //   p.noStroke();

  //   p.textureMode(p.NORMAL);
  //   // p.texture(this.img);
  //   p.texture(textureToUse);
  //   p.beginShape();

  //   // Mapping simple sur toute la surface
  //   p.vertex(0, 0, 0, 0);
  //   p.vertex(w, 0, 1, 0);
  //   p.vertex(w, h, 1, 1);
  //   p.vertex(0, h, 0, 1);

  //   p.endShape(p.CLOSE);
  // }
  drawRoundedRect(p, w, h, r, textureToUse) {
    const radius = Math.min(r, w / 2, h / 2);

    // 1. Couche de fond avec texture simple
    p.noStroke();
    p.textureMode(p.NORMAL);
    p.texture(textureToUse);
    p.beginShape();
    p.vertex(0, 0, 0, 0);
    p.vertex(w, 0, 1, 0);
    p.vertex(w, h, 1, 1);
    p.vertex(0, h, 0, 1);
    p.endShape(p.CLOSE);
  }
  applyRoundedMask(p, img, relRX = 0.1, relRY = 0.1) {
    const w = img.width;
    const h = img.height;
    const rX = w * relRX;
    const rY = h * relRY;

    const masked = p.createGraphics(w, h);
    masked.clear();

    masked.noStroke();
    masked.fill(255);

    // On simule les arrondis "différentiels"
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
