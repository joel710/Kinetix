import { Kinetix } from './src/core/Kinetix';

const world = new Kinetix('#world', {
  gravity: { x: 0, y: 0.5 },
  maxBodies: 50000 // Ultra boosté pour 50k corps
});

// Performance monitoring
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;
let bodyCount = 0;
let lastSpawnTime = 0;
let physicsUpdateTime = 0;
let renderTime = 0;
let totalPhysicsTime = 0;
let physicsFrameCount = 0;

// UI Elements
const ui = document.querySelector('#ui') as HTMLElement;
const statsDiv = ui.querySelector('.stats') as HTMLElement;

// Enhanced UI with performance metrics
statsDiv.innerHTML = `
  <h1>Kinetix Ultra Engine</h1>
  <div class="metrics">
    <p><strong>FPS:</strong> <span id="fps">0</span></p>
    <p><strong>Bodies:</strong> <span id="bodies">0</span></p>
    <p><strong>Memory:</strong> <span id="memory">0 MB</span></p>
    <p><strong>Spawn Rate:</strong> <span id="spawn-rate">0/sec</span></p>
    <p><strong>Physics Time:</strong> <span id="physics-time">0 ms</span></p>
  </div>
  <div class="btn-container">
    <button id="spawn-massive">Spawn 1000 Shapes</button>
    <button id="spawn-complex">Spawn Complex</button>
    <button id="blast-nuclear">Nuclear Blast!</button>
    <button id="clear-all">Clear All</button>
    <button id="stress-test">Stress Test</button>
  </div>
`;

// Performance monitoring function
function updatePerformanceMetrics() {
  const now = performance.now();
  frameCount++;

  if (now - lastTime >= 1000) {
    fps = Math.round((frameCount * 1000) / (now - lastTime));
    const avgPhysicsTime = physicsFrameCount > 0 ? totalPhysicsTime / physicsFrameCount : 0;

    frameCount = 0;
    lastTime = now;
    physicsFrameCount = 0;
    totalPhysicsTime = 0;

    // Update UI
    (document.getElementById('fps') as HTMLElement).textContent = fps.toString();
    (document.getElementById('bodies') as HTMLElement).textContent = bodyCount.toString();

    // Memory usage (if available)
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      const usedMB = Math.round(mem.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(mem.totalJSHeapSize / 1024 / 1024);
      (document.getElementById('memory') as HTMLElement).textContent = `${usedMB}/${totalMB} MB`;
    }

    // Spawn rate
    const spawnRateValue = Math.round(bodyCount / ((now - lastSpawnTime) / 1000));
    (document.getElementById('spawn-rate') as HTMLElement).textContent = `${spawnRateValue}/sec`;

    // Physics performance
    (document.getElementById('physics-time') as HTMLElement).textContent = `${avgPhysicsTime.toFixed(2)} ms`;
  }

  requestAnimationFrame(updatePerformanceMetrics);
}

// Register static obstacles with complex shapes
world.register('.obstacle', { isStatic: true });

// Advanced shape generators
const advancedShapes = [
  // Ultra complex star
  "M 50 0 L 61 35 L 98 35 L 68 57 L 79 91 L 50 70 L 21 91 L 32 57 L 2 35 L 39 35 Z",
  // Gear-like shape
  "M 0 0 L 20 0 L 20 10 L 30 10 L 30 20 L 20 20 L 20 30 L 0 30 L 0 20 L -10 20 L -10 10 L 0 10 Z",
  // Arrow
  "M 0 0 L 30 15 L 0 30 L 10 15 Z",
  // Hexagon
  "M 25 0 L 50 12.5 L 50 37.5 L 25 50 L 0 37.5 L 0 12.5 Z",
  // Complex polygon
  "M 0 0 L 40 0 L 40 10 L 50 10 L 50 20 L 40 20 L 40 30 L 20 30 L 20 40 L 0 40 L 0 30 L -10 30 L -10 20 L 0 20 L 0 10 L -10 10 L -10 0 Z"
];

// Spawn massive amounts of shapes
function spawnMassiveShapes(count: number = 1000) {
  lastSpawnTime = performance.now();
  const startTime = performance.now();

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const d = advancedShapes[Math.floor(Math.random() * advancedShapes.length)];
      const x = Math.random() * 800 + 50;
      const y = Math.random() * 200 - 250;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("class", "physic");
      path.setAttribute("id", `shape-${Math.random().toString(36).substr(2, 9)}`);

      path.setAttribute("transform", `translate(${x}, ${y}) scale(${0.5 + Math.random() * 1.5})`);

      document.querySelector('#world')!.appendChild(path);

      world.register(`#${path.id}`, {
        restitution: 0.8 + Math.random() * 0.2,
        friction: 0.1 + Math.random() * 0.3
      });

      bodyCount++;
    }, i * 2); // Stagger spawns to avoid blocking
  }

  console.log(`Spawned ${count} shapes in ${performance.now() - startTime}ms`);
}

// Spawn complex interconnected structures
function spawnComplexStructure() {
  const centerX = 500;
  const centerY = 100;

  // Create a complex bridge structure
  for (let i = 0; i < 20; i++) {
    const x = centerX - 200 + i * 20;
    const y = centerY + Math.sin(i * 0.5) * 30;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M 0 0 L 15 0 L 15 8 L 0 8 Z");
    path.setAttribute("class", "physic");
    path.setAttribute("id", `bridge-${i}`);

    path.setAttribute("transform", `translate(${x}, ${y})`);

    document.querySelector('#world')!.appendChild(path);
    world.register(`#${path.id}`, {
      restitution: 0.9,
      friction: 0.8
    });
    bodyCount++;
  }

  // Add connecting elements
  for (let i = 0; i < 15; i++) {
    const x = centerX - 150 + i * 20;
    const y = centerY - 50;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M 0 0 L 10 0 L 10 40 L 0 40 Z");
    path.setAttribute("class", "physic");
    path.setAttribute("id", `support-${i}`);

    path.setAttribute("transform", `translate(${x}, ${y})`);

    document.querySelector('#world')!.appendChild(path);
    world.register(`#${path.id}`, {
      restitution: 0.7,
      friction: 0.9
    });
    bodyCount++;
  }
}

// Particle Pool System
class ParticlePool {
  private pool: SVGCircleElement[] = [];
  private active: SVGCircleElement[] = [];
  private container: SVGElement;

  constructor(containerSelector: string) {
    this.container = document.querySelector(containerSelector) as SVGElement;
  }

  acquire(x: number, y: number, r: string, color: string, className: string): SVGCircleElement {
    let el = this.pool.pop();
    if (!el) {
      el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    }
    el.setAttribute("cx", x.toString());
    el.setAttribute("cy", y.toString());
    el.setAttribute("r", r);
    el.setAttribute("fill", color);
    el.setAttribute("class", className);
    el.style.display = 'block';
    
    if (!el.parentNode) {
      this.container.appendChild(el);
    }
    this.active.push(el);
    return el;
  }

  release(el: SVGCircleElement) {
    el.style.display = 'none';
    const index = this.active.indexOf(el);
    if (index !== -1) this.active.splice(index, 1);
    this.pool.push(el);
  }

  releaseAll(className?: string) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const el = this.active[i];
      if (!className || el.classList.contains(className)) {
        this.release(el);
      }
    }
  }
}

const particlePool = new ParticlePool('#world');

// Nuclear blast - optimized to avoid DOM Thrashing
function nuclearBlast() {
  const blastX = 500;
  const blastY = 500;
  const physicsStart = performance.now();
  
  // 1. Batch read positions (One reflow)
  const elements = document.querySelectorAll('.physic');
  const bodyData = Array.from(elements).map(el => {
    const rect = el.getBoundingClientRect();
    return {
      id: el.id,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2
    };
  });

  // 2. Batch apply forces (No reflows)
  bodyData.forEach((data, index) => {
    setTimeout(() => {
      const dx = data.centerX - blastX;
      const dy = data.centerY - blastY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const force = Math.max(2000 / (distance + 50), 20);
      const angle = Math.atan2(dy, dx);

      const forceX = Math.cos(angle) * force * (Math.random() * 0.5 + 0.75);
      const forceY = Math.sin(angle) * force * (Math.random() * 0.5 + 0.75) - 200;

      world.applyForce(`#${data.id}`, forceX, forceY);

      if (index % 10 === 0) {
        createExplosionParticles(data.centerX, data.centerY, 3);
      }
    }, index * 2);
  });

  physicsFrameCount++;
  totalPhysicsTime += (performance.now() - physicsStart);
  audioEngine.playExplosionSound();
}

// Optimized Trail System using Pool
const trailParticles: Map<string, { x: number; y: number; life: number }[]> = new Map();

function updateTrailParticles() {
  particlePool.releaseAll('trail-particle');

  trailParticles.forEach((particles, id) => {
    const el = document.getElementById(id);
    if (!el) return;

    // Use getAttribute directly or better, get data from Kinetix if available
    const transform = el.getAttribute('transform');
    if (transform) {
      const match = transform.match(/translate\(([^, )]+)[, ]+([^)]+)\)/);
      if (match) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);

        particles.push({ x, y, life: 1.0 });
        if (particles.length > 8) particles.shift();
      }
    }

    particles.forEach((p, i) => {
      p.life -= 0.1;
      if (p.life > 0) {
        particlePool.acquire(p.x, p.y, "2", `rgba(56, 189, 248, ${p.life})`, `trail-${id} trail-particle`);
      }
    });
  });

  requestAnimationFrame(updateTrailParticles);
}

// Enable trails for fast-moving objects
function enableTrailsForFastObjects() {
  document.querySelectorAll('.physic').forEach(el => {
    const id = el.id;
    if (!trailParticles.has(id)) {
      trailParticles.set(id, []);
    }
  });
}

// Collision particle system
function createCollisionParticles(x: number, y: number, intensity: number = 1) {
  const particleCount = Math.floor(intensity * 8);
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    particle.setAttribute("cx", x.toString());
    particle.setAttribute("cy", y.toString());
    particle.setAttribute("r", (1 + Math.random() * 2).toString());
    particle.setAttribute("fill", "#f59e0b");
    particle.setAttribute("class", "collision-particle");

    document.querySelector('#world')!.appendChild(particle);

    // Animate particle
    const angle = Math.random() * Math.PI * 2;
    const velocity = 20 + Math.random() * 40;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;

    let px = x;
    let py = y;
    let life = 30 + Math.random() * 20;

    const animate = () => {
      px += vx * 0.1;
      py += vy * 0.1 + 0.3; // gravity
      life--;

      particle.setAttribute("cx", px.toString());
      particle.setAttribute("cy", py.toString());
      particle.setAttribute("opacity", (life / 50).toString());

      if (life > 0) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
      }
    };

    requestAnimationFrame(animate);
  }
}

// Procedural audio system
class AudioEngine {
  private audioContext: AudioContext | null = null;
  private oscillators: Map<string, OscillatorNode> = new Map();

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  playCollisionSound(x: number, y: number, intensity: number = 1) {
    if (!this.audioContext) return;

    // Create oscillator for collision sound
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Frequency based on position (higher pitch for higher positions)
    const frequency = 200 + (y / 10) + (Math.random() * 100);
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    // Volume based on intensity
    gainNode.gain.setValueAtTime(intensity * 0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }

  playExplosionSound() {
    if (!this.audioContext) return;

    // Create explosion sound with multiple oscillators
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        const frequency = 100 + Math.random() * 200;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext!.currentTime);

        gainNode.gain.setValueAtTime(0.3, this.audioContext!.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);

        oscillator.start();
        oscillator.stop(this.audioContext!.currentTime + 0.5);
      }, i * 20);
    }
  }
}

const audioEngine = new AudioEngine();

function updateCamera() {
  // Find the center of mass of all physics objects
  let totalX = 0;
  let totalY = 0;
  let count = 0;

  document.querySelectorAll('.physic').forEach(el => {
    const transform = el.getAttribute('transform');
    if (transform) {
      const match = transform.match(/translate\(([^,)]+)[, ]*([^)]+)\)/);
      if (match) {
        totalX += parseFloat(match[1]);
        totalY += parseFloat(match[2]);
        count++;
      }
    }
  });

  if (count > 0) {
    cameraTargetX = totalX / count - 500; // Center on 500px
    cameraTargetY = totalY / count - 500; // Center on 500px
  }

  // Smooth camera movement
  cameraX += (cameraTargetX - cameraX) * cameraSmoothness;
  cameraY += (cameraTargetY - cameraY) * cameraSmoothness;

  // Apply camera transform to the world
  const world = document.querySelector('#world') as SVGElement;
  if (world && (Math.abs(cameraX) > 10 || Math.abs(cameraY) > 10)) {
    world.style.transform = `translate(${-cameraX * 0.1}px, ${-cameraY * 0.1}px)`;
  }

  requestAnimationFrame(updateCamera);
}

// Clear all dynamic bodies
function clearAll() {
  document.querySelectorAll('.physic').forEach(el => el.remove());
  bodyCount = 0;
  (document.getElementById('bodies') as HTMLElement).textContent = '0';
}

// Stress test - continuous spawning
let stressTestActive = false;
function stressTest() {
  if (stressTestActive) {
    stressTestActive = false;
    return;
  }

  stressTestActive = true;
  const stressInterval = setInterval(() => {
    if (!stressTestActive || bodyCount > 10000) {
      clearInterval(stressInterval);
      return;
    }
    spawnMassiveShapes(100);
  }, 500);
}

// Event listeners for collision
world.on('collision', (payload: { id1: number, id2: number }) => {
  // Use the shared data to get collision position
  const offset1 = payload.id1 * 3;
  const x = (world as any).sharedData[offset1];
  const y = (world as any).sharedData[offset1 + 1];
  
  if (Number.isFinite(x) && Number.isFinite(y)) {
    createCollisionParticles(x, y, 1.0);
    audioEngine.playCollisionSound(x, y, 0.5);
  }
});

// Auto-spawn some initial shapes
setTimeout(() => {
  spawnMassiveShapes(500);
  setTimeout(spawnComplexStructure, 2000);
  setTimeout(enableTrailsForFastObjects, 3000);
}, 1000);
