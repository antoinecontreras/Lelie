class CanvasManager {
  constructor() {
    this.p5Instance = new p5((p) => {
      p.setup = () => {
        this.canvas = p.createCanvas(
          window.innerWidth,
          window.innerHeight,
          p.WEBGL
        );
        this.canvas.position(0, 0);
        this.canvas.style("pointer-events", "none");
        //   this.canvas.style('z-index', '9999');
        p.clear();
        p.noLoop();

        // this.camZSlider = p.createSlider(95, 103, 100, 0.1); // camera Z position
        this.camZSlider = p.createSlider(50, 130, 100, 1); // camera Z position
        this.camZSlider.position(20, 60);
        this.camZSlider.style("width", "200px");
        this.camZSlider.style("z-index", "9999");
        this.camZSlider.input(() => {
          this.redraw();
        });
        this.scaleSlider = p.createSlider(0.03, 0.05, 0.0392, 0.0001);
        this.scaleSlider.position(20, 100);
        this.scaleSlider.style("width", "200px");
        this.scaleSlider.style("z-index", "9999");
        this.scaleSlider.input(() => {
          this.redraw();
        });

        this.cam = p.createCamera();
      };

      p.draw = () => {
        if (!this.shouldDraw) return;

        p.clear();
        p.noStroke();

        const perspectiveCSS = window.innerWidth;
        const fov = 2 * Math.atan(p.height / 2 / perspectiveCSS);
        const camZ = this.camZSlider.value();

        console.log(` camZ: ${camZ}px scale: ${this.scaleSlider.value()}`);

        // 🔥 Update camera
        this.cam.perspective(fov, p.width / p.height, 0.1, 5000);
        this.cam.setPosition(0, 0, camZ);
        this.cam.lookAt(0, 0, 0);

        const scrollDepth = this.getScrollDepth();
        const sizeWall = this.getSizeWall();

        // const sizeW = window.innerWidth * 0.02; // 50vw
        // const sizeH = window.innerHeight * 0.02; // 50vh
        const rectangleScale = this.scaleSlider.value(); // 🔥 lecture du slider
        const sizeW = window.innerWidth * rectangleScale;
        const sizeH = window.innerHeight * rectangleScale;

        for (let i = 0; i < 2; i++) {
          const z = scrollDepth - sizeWall * i;

          p.push();
          p.translate(0, 0, z);
          p.rotateX(0);
          p.rotateY(0);
       

          this.drawTestRect(p, sizeW, sizeH);
          p.pop();
        }

        this.shouldDraw = false;
      };

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
        this.redraw();
      };
    });

    this.shouldDraw = false;
  }

  redraw() {
    this.shouldDraw = true;
    this.p5Instance.loop();
  }

  resize() {
    this.p5Instance.resizeCanvas(window.innerWidth, window.innerHeight);
    this.redraw();
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

  drawTestRect(p, w, h) {
    p.stroke(0, 255, 0);
    p.strokeWeight(.1);
    p.noFill();
    p.rectMode(p.CENTER);
    p.rect(0, 0, w, h);
  }
}
