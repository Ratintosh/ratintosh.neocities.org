

console.clear();

const friction = -0.5;

const ball = document.querySelector(".ball");
const ballProps = gsap.getProperty(ball);
const radius = ball.getBoundingClientRect().width / 2;
const tracker = InertiaPlugin.track(ball, "x,y")[0];
const bumperSound = new Audio("/img/bumper.mp3");
bumperSound.preload = "auto";
const maxConcurrentBumps = 8;
let activeBumps = 0;

let vw = window.innerWidth;
let vh = window.innerHeight;

gsap.defaults({
  overwrite: true
});

gsap.set(ball, {
  xPercent: -50,
  yPercent: -50,
  x: radius,
  y: radius
});

const draggable = new Draggable(ball, {
  bounds: window,
  onPress() {
    gsap.killTweensOf(ball);
    this.update();
  },
  onDragEnd: animateBounce,
  onDragEndParams: []
});

window.addEventListener("resize", () => {
  vw = window.innerWidth;
  vh = window.innerHeight;
});

function playBumper() {
  if (activeBumps >= maxConcurrentBumps) return;

  const sound = bumperSound.cloneNode();
  activeBumps += 1;

  const cleanup = () => {
    activeBumps = Math.max(0, activeBumps - 1);
    sound.removeEventListener("ended", cleanup);
    sound.removeEventListener("error", cleanup);
  };

  sound.addEventListener("ended", cleanup);
  sound.addEventListener("error", cleanup);
  sound.play().catch(cleanup);
}

function animateBounce(x = "+=0", y = "+=0", vx = "auto", vy = "auto") {
    
  gsap.fromTo(ball, { x, y }, {
    inertia: {
      x: vx,
      y: vy,
    },
    onUpdate: checkBounds
  });  
}

function checkBounds() {
  
  let r = radius;    
  let x = ballProps("x");
  let y = ballProps("y");
  let vx = tracker.get("x");
  let vy = tracker.get("y");
  let xPos = x;
  let yPos = y;

  let hitting = false;

  if (x + r > vw) {
    xPos = vw - r;
    vx *= friction;
    hitting = true;

  } else if (x - r < 0) {
    xPos = r;
    vx *= friction;
    hitting = true;
  }

  if (y + r > vh) {
    yPos = vh - r;
    vy *= friction;
    hitting = true;

  } else if (y - r < 0) {
    yPos = r;
    vy *= friction;
    hitting = true;
  }

  if (hitting) {
    playBumper();
    animateBounce(xPos, yPos, vx, vy);
  } 
}

