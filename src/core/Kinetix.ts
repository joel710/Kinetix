import { PathParser } from '../math/PathParser';
import { Linearizer } from '../math/Linearizer';
import { Geometry } from '../math/Geometry';

export interface KinetixOptions {
  gravity?: { x: number; y: number };
  friction?: number;
  restitution?: number;
  maxBodies?: number;
}

export class Kinetix {
  private container: Element;
  private options: Required<KinetixOptions>;
  private worker: Worker;
  private sab?: SharedArrayBuffer;
  private sharedData: Float32Array;
  private elements: Map<number, { el: SVGElement; centroid: { x: number; y: number } }> = new Map();
  private nextId: number = 0;
  private isRunning: boolean = false;

  private useSAB: boolean = false;
  private isWorkerReady: boolean = false;
  private messageQueue: any[] = [];

  constructor(selector: string | Element, options: KinetixOptions = {}) {
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
    const isCrossOriginIsolated = typeof navigator !== 'undefined' && (navigator as any).crossOriginIsolated === true;
    this.useSAB = hasSharedArrayBuffer && isCrossOriginIsolated;

    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!(el instanceof Element)) {
      throw new Error(`Kinetix: Container not found`);
    }
    this.container = el;
    this.options = {
      gravity: options.gravity || { x: 0, y: 9.81 },
      friction: options.friction ?? 0.5,
      restitution: options.restitution ?? 0.2,
      maxBodies: options.maxBodies ?? 1000,
    };

    if (this.useSAB) {
      this.sab = new SharedArrayBuffer(this.options.maxBodies * 3 * 4);
      this.sharedData = new Float32Array(this.sab);
    } else {
      if (hasSharedArrayBuffer) {
        console.warn('Kinetix: SharedArrayBuffer is available, but the page is not cross-origin isolated. Falling back to message-based sync.');
      } else {
        console.warn('Kinetix: SharedArrayBuffer not available. Falling back to message-based sync.');
      }
      this.sharedData = new Float32Array(this.options.maxBodies * 3);
    }

    // Initialize Worker (Vite-compatible syntax)
    this.worker = new Worker(new URL('../worker/physics.worker.ts', import.meta.url), {
      type: 'module'
    });

    this.worker.onmessage = (e) => {
      if (e.data?.type === 'READY') {
        console.log('Kinetix: Worker signaling READY');
        this.isWorkerReady = true;
        this.init(); // Send INIT
        this.flushQueue();
      } else if (e.data?.type === 'SYNC') {
        this.sharedData.set(e.data.payload);
      }
    };

    this.worker.onerror = (event) => {
      console.error('Kinetix: Worker error', event);
    };

    this.startRenderLoop();
  }

  private init() {
    console.log('Kinetix: Sending INIT to worker');
    this.worker.postMessage({
      type: 'INIT',
      payload: {
        gravity: this.options.gravity,
        sab: this.useSAB ? this.sab : null,
        useSAB: this.useSAB,
        maxBodies: this.options.maxBodies
      }
    });
    this.isRunning = true;
  }

  private flushQueue() {
    console.log(`Kinetix: Flushing ${this.messageQueue.length} queued messages`);
    while (this.messageQueue.length > 0) {
      this.worker.postMessage(this.messageQueue.shift());
    }
  }

  private postToWorker(message: any) {
    if (this.isWorkerReady) {
      this.worker.postMessage(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  private startRenderLoop() {
    const loop = () => {
      if (!this.isRunning) {
        requestAnimationFrame(loop);
        return;
      }
      this.syncDOM();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private syncDOM() {
    this.elements.forEach(({ el, centroid }, id) => {
      const offset = id * 3;
      const x = this.sharedData[offset];
      const y = this.sharedData[offset + 1];
      const rot = (this.sharedData[offset + 2] * 180) / Math.PI;

      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(rot)) {
        return;
      }

      const tx = x - centroid.x;
      const ty = y - centroid.y;

      // The transform is applied relative to the path's original vertex coordinates.
      el.setAttribute('transform', `translate(${tx}, ${ty}) rotate(${rot} ${centroid.x} ${centroid.y})`);
    });
  }

  public register(selector: string, config: any = {}) {
    console.log(`Kinetix: Registering elements for selector "${selector}"`);
    const elements = this.container.querySelectorAll(selector);
    console.log(`Kinetix: Found ${elements.length} elements`);
    elements.forEach(el => {
      if (el instanceof SVGPathElement) {
        this.addBody(el, config);
      } else {
        console.warn('Kinetix: Registered element is not an SVGPathElement', el);
      }
    });
  }

  private addBody(el: SVGPathElement, config: any) {
    const d = el.getAttribute('d');
    if (!d) {
      console.warn('Kinetix: Element has no "d" attribute', el);
      return;
    }

    // Parse initial transform to avoid jumping
    let initialX = 0;
    let initialY = 0;
    const transform = el.getAttribute('transform');
    if (transform) {
      const match = transform.match(/translate\(([^,)]+)[, ]*([^)]+)?\)/);
      if (match) {
        initialX = parseFloat(match[1]);
        initialY = match[2] ? parseFloat(match[2]) : 0;
      }
    }

    const polygons = Linearizer.linearize(PathParser.parse(d));
    console.log(`Kinetix: Path linearized into ${polygons.length} polygons`);
    
    for (const vertices of polygons) {
      if (vertices.length < 3) {
        console.warn('Kinetix: Polygon has fewer than 3 vertices, skipping');
        continue;
      }

      const id = this.nextId++;
      const centroid = Geometry.calculateCentroid(vertices);
      
      // Normalize vertices for Rapier (relative to centroid)
      const flatVertices = vertices.flatMap(v => [v.x - centroid.x, v.y - centroid.y]);

      console.log(`Kinetix: Sending ADD_BODY for id ${id} at (${centroid.x + initialX}, ${centroid.y + initialY})`);
      this.postToWorker({
        type: 'ADD_BODY',
        payload: {
          id,
          vertices: flatVertices,
          config: {
            x: centroid.x + initialX,
            y: centroid.y + initialY,
            isStatic: config.isStatic,
            restitution: config.restitution ?? this.options.restitution,
            friction: config.friction ?? this.options.friction
          }
        }
      });

      this.elements.set(id, { el, centroid });
    }
  }

  public applyForce(selector: string, x: number, y: number) {
    const targetEl = this.container.querySelector(selector);
    this.elements.forEach(({ el }, id) => {
      if (el === targetEl) {
        this.postToWorker({ type: 'APPLY_FORCE', payload: { id, x, y } });
      }
    });
  }
}
