class Volet {
    constructor(p, tex, {w,h,x,y,z,angle,swapUV}) {
      this.p = p;
      this.tex = tex;
      this.w = w; this.h = h;
      this.x = x; this.y = y; this.z = z;
      this.angle = angle;
      this.swapUV = swapUV;
    }
  
    draw() {
      const p = this.p;
      p.push();
        // profondeur et recentrage
        p.translate(0,0,this.z);
        p.translate(-this.w/2, -this.h/2);
  
        // pivot & rotation Y
        p.translate(this.x, this.y, 0);
        p.rotateY((this.angle * Math.PI)/180);
        p.translate(-this.x, -this.y, 0);
  
        // mapping UV
        const uW = this.swapUV ? this.h : this.w;
        const uH = this.swapUV ? this.w : this.h;        
  
        p.noStroke();
        p.textureMode(p.NORMAL);
        p.texture(this.tex);
        p.beginShape();
          p.vertex(0,     0,     0, 0);
          p.vertex(uW,    0,     1, 0);
          p.vertex(uW,    uH,    1, 1);
          p.vertex(0,     uH,    0, 1);
        p.endShape(p.CLOSE);
      p.pop();
    }
  }