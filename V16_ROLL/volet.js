class Volet {
  constructor(p, tex, cfg) {
    this.p   = p;
    this.tex = tex;
    this.cfg = { ...cfg };
    // 1) on garde l'angle de base
    this.initialAngle = cfg.angle;
    this.targetAngle  = cfg.angle;
    this.animSpeed    = 0.1; // 0 = immobile, 1 = snap immédiat
  }

  // 2) Méthode pour demander une ouverture (delta peut être positif ou négatif)
  open(delta) {
    this.targetAngle = this.initialAngle + delta;
  }

  // 3) Méthode pour refermer
  close() {
    this.targetAngle = this.initialAngle;
  }

  // 4) On interpole l’angle à chaque dessin
  _animate() {
    const { p, cfg, animSpeed, targetAngle } = this;
    cfg.angle = p.lerp(cfg.angle, targetAngle, animSpeed);
    // Quand la différence est négligeable, on stoppe l’animation
    if (Math.abs(cfg.angle - targetAngle) < 0.1) {
      cfg.angle = targetAngle;
    }
  }

  draw() {
    this._animate();

    const p = this.p;
    const { w,h,x,y,z,angle,swapUV } = this.cfg;
    p.push();
      /* — ton code de rendu inchangé — */
      p.translate(0,0,z);
      p.translate(-w/2,-h/2);
      p.translate(x,y);
      p.rotateY(angle * Math.PI/180);
      p.translate(-x,-y);
      const uW = swapUV ? h : w;
      const uH = swapUV ? w : h;
      p.noStroke();
      p.textureMode(p.NORMAL);
      p.texture(this.tex);
      p.beginShape();
        p.vertex(0,0,        0,0);
        p.vertex(uW,0,       1,0);
        p.vertex(uW,uH,      1,1);
        p.vertex(0,uH,       0,1);
      p.endShape(p.CLOSE);
    p.pop();
  }
}
