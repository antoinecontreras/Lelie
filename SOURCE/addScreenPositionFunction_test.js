// À charger **après** p5.js
function addScreenPositionFunction(pInst) {
  const p = pInst || this;

  /**
   * Transforme un point 3D (x,y,z) en coordonnées écran (pixels).
   * Usage en global mode :  let v = screenPosition(x,y,z);
   * Ou en instance mode : let v = p.screenPosition(x,y,z);
   */
  p.screenPosition = function(x, y, z=0) {
    // 1) Crée un vecteur p5
    let v = p.createVector(x, y, z, 1);

    // 2) Récupère les matrices WebGL
    const mv  = p._renderer.uMVMatrix;     // matrice modèle→vue
    const pr  = p._renderer.uPMatrix;      // matrice projection

    // 3) Calcule MVP = P × MV
    let mvp = pr.copy().mult(mv);

    // 4) Transforme v par MVP → vNDC
    let vNDC = multMatrixVector(mvp, v);

    // 5) NDC → pixels écran
    return p.createVector(
      (vNDC.x * 0.5 + 0.5) * p.width,
      (1 - (vNDC.y * 0.5 + 0.5)) * p.height,
      0
    );
  };

  // Fonction utilitaire pour multiplier matrice 4×4 × vecteur4
  function multMatrixVector(mat, vec) {
    const m = mat.mat4;  // Float32Array[16] en column-major
    const x = vec.x, y = vec.y, z = vec.z, w = vec.w ?? 1;
    const rx = m[0]*x + m[4]*y + m[8]*z  + m[12]*w;
    const ry = m[1]*x + m[5]*y + m[9]*z  + m[13]*w;
    const rz = m[2]*x + m[6]*y + m[10]*z + m[14]*w;
    const rw = m[3]*x + m[7]*y + m[11]*z + m[15]*w;
    // ramène en coordonnées homogènes
    if (Math.abs(rw) > 1e-6) {
      return p.createVector(rx/rw, ry/rw, rz/rw);
    }
    return p.createVector(rx, ry, rz);
  }
}
