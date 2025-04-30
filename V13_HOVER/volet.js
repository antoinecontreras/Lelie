class Volet {
    constructor(p, tex, cfg) {
      this.p   = p;
      this.tex = tex;
      this.cfg = cfg; // { w,h,x,y,z,angle,swapUV,texKind }
    }
    draw() {
      const p = this.p;
      const { w,h,x,y,z,angle,swapUV } = this.cfg;
      p.push();
        // profondeur et recentrage
        p.translate(0,0,z);
        p.translate(-w/2,-h/2);
  
        // pivot & rotation
        p.translate(x,y);
        p.rotateY(angle * Math.PI/180);
        p.translate(-x,-y);
  
        // dimensions UV si swap
        const uW = swapUV ? h : w;
        const uH = swapUV ? w : h;
        p.noStroke();
        p.textureMode(p.NORMAL);
        p.texture(this.tex);
        // p.textSize(32);
        p.beginShape();
          p.vertex(0,   0,   0,0);
          p.vertex(uW,  0,   1,0);
          p.vertex(uW,  uH,  1,1);
          p.vertex(0,   uH,  0,1);
        p.endShape(p.CLOSE);
      p.pop();
    }
  }