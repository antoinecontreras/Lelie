class Volet {
  constructor(p, tex, cfg) {
    this.p   = p;
    this.tex = tex;
    this.cfg = { ...cfg };
    // angles
    this.initialAngle = cfg.angle;
    this.targetAngle  = cfg.angle;
    this.animSpeed    = 0.1;

    // opacité
    this.style = {
      opacity:       255,
      targetOpacity: 255   // ← on initialise la cible
    };
  }

  open(delta) { this.targetAngle = this.initialAngle + delta; }
  close()     { this.targetAngle = this.initialAngle; }

  click() {
    // toggle entre 100% et 30%
    const s = this.style;
    s.targetOpacity = (s.targetOpacity === 255 ? 0.3*255 : 255);
    // on force un redraw d’un frame
    this.p.redraw();
  }

  _animate() {
    const { p, cfg, animSpeed, targetAngle, style } = this;
    // --- angle
    cfg.angle = p.lerp(cfg.angle, targetAngle, animSpeed);
    if (Math.abs(cfg.angle - targetAngle) < 0.1) {
      cfg.angle = targetAngle;
    }
    // --- opacité
    style.opacity =
      p.lerp(style.opacity, style.targetOpacity, animSpeed);
    if (Math.abs(style.opacity - style.targetOpacity) < 1) {
      style.opacity = style.targetOpacity;
    }
  }

  draw() {
    this._animate();

    const p = this.p;
    const { w,h,x,y,z,angle,swapUV } = this.cfg;
    p.push();
      p.translate(0,0,z);
      p.translate(-w/2,-h/2);
      p.translate(x,y);
      p.rotateY(angle * Math.PI/180);
      p.translate(-x,-y);

      // applique la tint + opacité
      p.tint(255, this.style.opacity);

      const uW = swapUV ? h : w;
      const uH = swapUV ? w : h;
      p.noStroke();
      p.textureMode(p.NORMAL);
      p.texture(this.tex);
      p.beginShape();
        p.vertex(0,   0,   0,0);
        p.vertex(uW,  0,   1,0);
        p.vertex(uW,  uH,  1,1);
        p.vertex(0,   uH,  0,1);
      p.endShape(p.CLOSE);
    p.pop();
  }
}
