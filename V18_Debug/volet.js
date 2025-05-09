class Volet {
  constructor(p, tex, cfg) {
    this.p = p;
    this.tex = tex;
    this.cfg = { ...cfg };
    // angles
    this.initialAngle = cfg.angle;
    this.targetAngle = cfg.angle;
    this.animSpeed = 0.1;
    // opacité
    this.style = {};
    this.fade("close");
  }

  open(delta) {
     this.fade("open");
    this.targetAngle = this.initialAngle + delta;
  }
  close() {
    this.fade("close");
    this.targetAngle = this.initialAngle;
  }

  fade(state) {
    if (state == "open") {
      if (this.cfg.texKind === "frame") {
        this.style.opacity = 205;
      }
    }else if((state == "close")){
       if (this.cfg.texKind === "frame") {
        this.style.opacity = 105;
      } else {
        this.style.opacity = 65;
      }
    }
  }
  // fade(opacity) {
  //   // const { p, animSpeed, targetAngle, style } = this;
  //   // style.opacity = p.lerp(style.opacity, style.targetOpacity, animSpeed);
  //   // if (Math.abs(style.opacity - style.targetOpacity) < 1) {
  //   //   style.opacity = style.targetOpacity;
  //   // }
  //   this.style.opacity = opacity;
  // }
  _animate() {
    const { p, cfg, animSpeed, targetAngle, style } = this;
    // --- angle
    cfg.angle = p.lerp(cfg.angle, targetAngle, animSpeed);
    if (Math.abs(cfg.angle - targetAngle) < 0.1) {
      cfg.angle = targetAngle;
    }
  }

  draw() {
    // this.fade(this.style.targetOpacity);
    this._animate();
    // console.log("inside : " + this.p.frameCount);
    const p = this.p;
    const { w, h, x, y, z, angle, swapUV } = this.cfg;
    p.push();
    p.translate(0, 0, z);
    p.translate(-w / 2, -h / 2);
    p.translate(x, y);
    p.rotateY((angle * Math.PI) / 180);
    p.translate(-x, -y);

    // applique la tint + opacité
    p.tint(255, this.style.opacity);

    const uW = swapUV ? h : w;
    const uH = swapUV ? w : h;
    p.noStroke();
    p.textureMode(p.NORMAL);
    p.texture(this.tex);
    p.beginShape();
    p.vertex(0, 0, 0, 0);
    p.vertex(uW, 0, 1, 0);
    p.vertex(uW, uH, 1, 1);
    p.vertex(0, uH, 0, 1);
    p.endShape(p.CLOSE);
    p.pop();
  }
}
