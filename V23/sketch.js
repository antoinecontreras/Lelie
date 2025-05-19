p5.disableFriendlyErrors = true;

let graphics;
let values;

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);

  values = {
    w: width / 2,
    h: height / 2,
  };

  graphics = createGraphics(width / 2, height, WEBGL);
  graphics.createCamera();
  graphics.perspective(
    PI/3,
    graphics.width / graphics.height,
    0.1,
    50000
  );

  addScreenPositionFunction(graphics);

  rectMode(CENTER);
  graphics.rectMode(CENTER);
  graphics.translate(-width/4, 0, 0);
  graphics.rotateY(PI * -1.5);
  noLoop();
}

function draw() {
  background(220);
  graphics.clear();

  graphics.rect(0, 0, values.w, values.h);
  // Adjust the x position to exactly match the left edge
  image(graphics, 0, 0);

  push();
  translate(width/4, height / 2);

  const points = [
    graphics.screenPosition(values.w / 2, -values.h / 2, 0),
    graphics.screenPosition(values.w / 2, values.h / 2, 0),
    graphics.screenPosition(-values.w / 2, values.h / 2, 0),
    graphics.screenPosition(-values.w / 2, -values.h / 2, 0),
  ];

  fill(0, 0, 255);
  points.forEach((point) => square(point.x, point.y, 10));

  const polyPoints = points.map((point) => ({ x: point.x, y: point.y }));
  const inside = collidePointPoly(
    mouseX - width/4,
    mouseY - height / 2,
    polyPoints
  );

  console.log(`Click is ${inside ? "inside" : "outside"}!`);
  pop();
}
