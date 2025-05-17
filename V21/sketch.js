// p5.disableFriendlyErrors = true;

// A graphics object for the 3D content.
let graphics;

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);

  // Creates an invisible WEBGL graphics object ...
  graphics = createGraphics(width/2, height, WEBGL);
  graphics.createCamera(),
    // c.cam.perspective(c.foxy, p.width / p.height, 0.1, 50000);
    graphics.perspective(radians(height / 16.27), width / height, 0.1, 50000);
  // ... and applies the screenPosition function to it.
  addScreenPositionFunction(graphics);

  fill(0, 0, 255);
  rectMode(CENTER);
  graphics.rectMode(CENTER);
}

function draw() {
  background(220);

  // Apply some transformations to the 3D world.
  graphics.clear();
  graphics.rotateX(0.01);
  
  
  graphics.square(0, 0, 200);
  
  // Draw 3D graphics to the visible canvas.
  image(graphics, 0, 0);

  push();
  translate(width / 4, height / 2);
  const gPoint = graphics.screenPosition(100, -100, 0);
  const gPoint1 = graphics.screenPosition(100, 100, 0);
  const gPoint2 = graphics.screenPosition(-100, 100, 0);
  const gPoint3 = graphics.screenPosition(-100, -100, 0);
  square(gPoint.x, gPoint.y, 10);
  square(gPoint1.x, gPoint1.y, 10);
  square(gPoint2.x, gPoint2.y, 10);
  square(gPoint3.x, gPoint3.y, 10);

  pop();
}
function windowResized() {
  resizeCanvas(window.innerWidth, window.innerHeight);
  graphics = createGraphics(window.innerWidth, window.innerHeight, WEBGL);
  addScreenPositionFunction(graphics);
  graphics.rectMode(CENTER);
  redraw();
}
