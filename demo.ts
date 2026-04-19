import { Kinetix } from './src/core/Kinetix';

const world = new Kinetix('#world', {
  gravity: { x: 0, y: 0.5 },
  maxBodies: 2000
});

// Register static obstacles
world.register('.obstacle', { isStatic: true });

const svgContainer = document.querySelector('#world')!;

const shapes = [
  // Triangle
  "M 0 0 L 40 0 L 20 40 Z",
  // Square
  "M 0 0 L 30 0 L 30 30 L 0 30 Z",
  // Complex "L" shape
  "M 0 0 L 40 0 L 40 20 L 20 20 L 20 60 L 0 60 Z",
  // Star-like shape (concave, will be convex-hulled for now)
  "M 25 0 L 31 18 L 50 18 L 35 29 L 40 47 L 25 36 L 10 47 L 15 29 L 0 18 L 19 18 Z"
];

function spawnShape() {
  const d = shapes[Math.floor(Math.random() * shapes.length)];
  const x = 400 + Math.random() * 200;
  const y = -100;
  
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("class", "physic");
  path.setAttribute("id", `shape-${Math.random().toString(36).substr(2, 9)}`);
  
  // Initial position via transform attribute before physics takes over
  path.setAttribute("transform", `translate(${x}, ${y})`);
  
  svgContainer.appendChild(path);
  
  // Register the new element
  world.register(`#${path.id}`, {
    restitution: 0.6,
    friction: 0.3
  });
}

// UI Controls
document.querySelector('#spawn')?.addEventListener('click', () => {
  for(let i = 0; i < 10; i++) {
    setTimeout(spawnShape, i * 100);
  }
});

document.querySelector('#blast')?.addEventListener('click', () => {
  // Apply a random explosion force to all dynamic elements
  document.querySelectorAll('.physic').forEach((el) => {
    const forceX = (Math.random() - 0.5) * 50;
    const forceY = -Math.random() * 50;
    world.applyForce(`#${el.id}`, forceX, forceY);
  });
});

// Auto-spawn some initial shapes
setTimeout(() => {
  for(let i = 0; i < 5; i++) spawnShape();
}, 1000);
