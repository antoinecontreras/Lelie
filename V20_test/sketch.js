function setup() {
  createCanvas(window.innerWidth, window.innerHeight, WEBGL);
  createCamera();
  let foxy =  radians(height / 16.27);
  perspective(foxy, width / height, 0.1, 50000);
 frameRate(10);
  noLoop();
}

function draw() {
  background(220);
  // déplacer l’origine du centre vers le coin supérieur gauche
  noFill();
  stroke(25);
  strokeWeight(0.9);


   const of = computeOfEase(width, 1.12);
   console.log(of, width)
  push();
    translate(-width/2, -height/4, 0);
    rect(0, 0, of, height/2);
  pop();
  
  translate(-width/2, -height/2);
  
let axis = createVector(0, 1, 0);
  rotate(HALF_PI, axis);


  noStroke();
  fill(0,0,255)
  rect(0, 0, width, height);
}
function windowResized(){

    let foxy =  radians(height / 16.27);
  perspective(foxy, width / height, 0.1, 50000);
  resizeCanvas(window.innerWidth, window.innerHeight);

}

function computeOfEase(w, exponent = 1.9) {
   const inMin   = 300,  outMin =  40;
  const midIn   = 514,  outMid = 100;
  const inMax   = 1995, outMax = 712;
  if (w < midIn) {
    // 1er segment 300→514 → 40→100
    let t = (w - inMin) / (midIn - inMin);
    // on laisse t libre : pour w<inMin t<0 → signed ease si besoin
    let tt = t < 0
      ? -pow(-t, exponent)
      :  pow(t, exponent);
    return lerp(outMin, outMid, tt);
  } else {
    // 2e segment 514→1526 → 100→500
    let t = (w - midIn) / (inMax - midIn);
    // **NE PAS** clamp : t>1 → extrapolation beyond outMax
    let tt = pow(t, exponent);
    return lerp(outMid, outMax, tt);
  }
}