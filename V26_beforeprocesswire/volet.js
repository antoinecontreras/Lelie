class Volet {
  constructor(p, tex, cfg) {
    this.p = p;
    this.tex = tex;
    this.cfg = { ...cfg };
    // angles
    this.initialAngle = cfg.angle;
    this.targetAngle = cfg.angle;
    this.animSpeed = 0.4;
    // opacité

    if (this.cfg.texKind == "frame") {
      this.style = {
        // opacity: 105,
        focus: 255,
        sleep: 155,
      };
    } else {
      this.style = {
        // opacity: 105,
        focus: 105,
        sleep: 55,
      };
    }

    this.style.opacity = this.style.sleep;
    this.isOpen = false;
  }
  focus() {
    this.style.opacity = this.style.focus;
  }
  sleep() {
    this.style.opacity = this.style.sleep;
  }
  open(delta) {
    this.isOpen = true;
    this.targetAngle = this.initialAngle + delta;
  }
  isClicked(delta) {
    const rotate = this.cfg.angle > 0 ? -delta : delta;
    this.targetAngle = this.initialAngle + rotate;
  }
  close() {
    this.targetAngle = this.initialAngle;
    this.isOpen = false;
  }

  _animate() {
    const { p, cfg, animSpeed, targetAngle, style } = this;
    // --- angle
    cfg.angle = p.lerp(cfg.angle, targetAngle, animSpeed);
    if (Math.abs(cfg.angle - targetAngle) < animSpeed) {
      cfg.angle = targetAngle;
    }
  }

  draw() {
    this._animate();
    // console.log("inside : " + this.p.frameCount);
    const p = this.p;
    let { w, h, wall, ancer, x, y, z, angle, swapUV } = this.cfg;

    p.push();
    p.translate(0, 0, z);
    p.translate(-w / 2, -h / 2);
    p.translate(x, y);

    p.rotateY((angle * Math.PI) / 180);
    // if (this.initialAngle == -90) p.translate(w / 2, 0);

    p.translate(-x, -y);
    // applique la tint + opacité
    p.tint(255, this.style.opacity);
    // p.tint(p.saturation(0, 255, 191.5), this.style.opacity);

    if (this.cfg.texKind == "merged") {
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
    } else {

      const uW = swapUV ? h : wall ;
      const uH = swapUV ? wall : h;
      const texW = this.tex.width;
      const texH = this.tex.height;
      const ratioTex = texW / texH; // ratio image
      const ratioRect = uW / uH; // ratio du plan cible
      let uMin = 0,
        uMax = 1;
      let vMin = 0,
        vMax = 1;

      if (ratioTex > ratioRect) {
        const uSpan = ratioRect / ratioTex;
        uMin = (1 - uSpan) / 2; // 0.25
        uMax = uMin + uSpan; // 0.75
        vMin = 0;
        vMax = 1;
      } else {
        const vSpan = ratioTex / ratioRect;
        vMin = (1 - vSpan) / 2; // 0.25
        vMax = vMin + vSpan; // 0.75
        uMin = 0;
        uMax = 1;
      }
      p.noStroke();
      p.textureMode(p.NORMAL);
      p.texture(this.tex);
      p.beginShape(p.QUADS);
      p.vertex(ancer, 0, uMin, vMin);
      p.vertex(uW+ancer, 0, uMax, vMin);
      p.vertex(uW+ancer, uH, uMax, vMax);
      p.vertex(ancer, uH, uMin, vMax);
      p.endShape(p.CLOSE);
    }

    p.pop();
  }
}
