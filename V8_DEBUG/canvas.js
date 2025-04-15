class CanvasManager {
  constructor() {
    this.p5Instance = new p5((p) => {
      p.setup = () => {
        this.canvas = p.createCanvas(
          window.innerWidth,
          window.innerHeight,
          p.WEBGL
        );
        this.canvas.position(0, 0).style("z-index", "9999");
        p.setAttributes("alpha", true);
        p._renderer.GL.enable(p._renderer.GL.BLEND);
        p._renderer.GL.blendFunc(
          p._renderer.GL.SRC_ALPHA,
          p._renderer.GL.ONE_MINUS_SRC_ALPHA
        );
        p.noLoop();
      };

      p.draw = () => {
        p.clear();

        p.push();
        p.translate(0, 0, -100);
        
        p.fill(255, 0, 0, 200);
        p.rect(0, 0, 250, 150);
        p.pop();

        

        p.push();
        const depth = p.map(p.mouseX, 0, window.innerWidth, -200, 300);
        p.translate(0, 0, depth);
        
        p.fill(255,0,0, 10);
        p.rect(-100, -100, 150, 150);
        p.pop();

        p.push();
        p.translate(-150, -100, 200);
        
        p.fill(0, 250, 0, 100);
        p.rect(0, 0, 250, 150);
        p.pop();


      };

      p.mouseMoved = () => p.redraw();
    });
  }
}
