class Volet {
  constructor(p, tex, cfg) {
    this.p = p;
    this.tex = tex;
    this.cfg = { ...cfg };
    // angles
    this.initialAngle = cfg.angle;
    this.targetAngle = cfg.angle;
    this.animSpeed = 0.2;
    // opacité
    this.style = {
      // opacity: 105,
      focus: 255,
      sleep: 105,
    };
    this.style.opacity = this.style.sleep;
    this.isOpen = false;
    this.fade("close");
  }
  focus() {
    this.style.opacity = this.style.focus;
  }
  sleep() {
    this.style.opacity = this.style.sleep;
  }
  open(delta) {
    this.isOpen = true;
    this.fade("open");
    this.targetAngle = this.initialAngle + delta;
  }
  close() {
    this.fade("close");
    this.targetAngle = this.initialAngle;
    this.isOpen = false;
  }

  fade(state) {
    if (state == "open") {
      if (this.cfg.texKind === "frame") {
        // this.style.opacity = this.style.focus;
      }
    } else if (state == "close") {
      if (this.cfg.texKind === "frame") {
        // this.style.opacity = this.style.sleep;
      } else {
        // this.style.opacity = 65;
      }
    }
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
    // p.tint(p.saturation(0, 255, 191.5), this.style.opacity);

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
