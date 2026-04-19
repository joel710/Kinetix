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
  private elements: Map<number, { 
    el: SVGElement; 
    centroid: { x: number; y: number }; 
    lastX?: number; 
    lastY?: number; 
    lastRot?: number;
    isVisible?: boolean;
  }> = new Map();
  private nextId: number = 0;
  private isRunning: boolean = false;
  private listeners: Map<string, Set<Function>> = new Map();

  private useSAB: boolean = false;
  private isWorkerReady: boolean = false;
  private messageQueue: any[] = [];
  
  // Viewport tracking for spatial culling
  private viewport = { x: 0, y: 0, w: 1000, h: 1000 };

  constructor(selector: string | Element, options: KinetixOptions = {}) {
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
    const isCrossOriginIsolated = typeof navigator !== 'undefined' && (navigator as any).crossOriginIsolated === true;
    this.useSAB = hasSharedArrayBuffer && isCrossOriginIsolated;

    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!(el instanceof Element)) throw new Error(`Kinetix: Container not found`);
    this.container = el;
    
    // Initial viewport update
    this.updateViewport();

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
      this.sharedData = new Float32Array(this.options.maxBodies * 3);
    }

    this.worker = new Worker(new URL('../worker/physics.worker.ts', import.meta.url), { type: 'module' });

    this.worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'READY') {
        this.isWorkerReady = true;
        this.init();
        this.flushQueue();
      } else if (type === 'SYNC') {
        this.sharedData.set(payload);
      } else if (type === 'COLLISION') {
        this.emit('collision', payload);
      }
    };

    this.startRenderLoop();
    
    // Update viewport on resize
    window.addEventListener('resize', () => this.updateViewport());
  }

  private updateViewport() {
    const rect = this.container.getBoundingClientRect();
    this.viewport = { x: 0, y: 0, w: rect.width || 1000, h: rect.height || 1000 };
  }

  public on(event: string, callback: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  private syncDOM() {
    const threshold = 0.01; // Movement threshold for dirty tracking
    const margin = 100; // Margin for spatial culling
    
    this.elements.forEach((data, id) => {
      const offset = id * 3;
      const x = this.sharedData[offset];
      const y = this.sharedData[offset + 1];
      const rot = this.sharedData[offset + 2];

      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      // Spatial Culling: Skip if far outside viewport
      const isVisible = x > -margin && x < this.viewport.w + margin && 
                        y > -margin && y < this.viewport.h + margin;
      
      if (!isVisible) {
        if (data.isVisible !== false) {
          data.el.style.display = 'none';
          data.isVisible = false;
        }
        return;
      }
      
      if (data.isVisible === false) {
        data.el.style.display = 'block';
        data.isVisible = true;
      }

      // Dirty Tracking: Skip if movement is negligible
      if (data.lastX !== undefined && 
          Math.abs(x - data.lastX) < threshold && 
          Math.abs(y - data.lastY) < threshold && 
          Math.abs(rot - data.lastRot!) < threshold) {
        return;
      }

      const tx = x - data.centroid.x;
      const ty = y - data.centroid.y;

      (data.el as any).style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}rad)`;
      (data.el as any).style.transformOrigin = `${data.centroid.x}px ${data.centroid.y}px`;
      
      data.lastX = x;
      data.lastY = y;
      data.lastRot = rot;
    });
  }

  public register(selector: string, config: any = {}) {
    const elements = this.container.querySelectorAll(selector);
    elements.forEach(el => {
      if (el instanceof SVGPathElement) {
        this.addBody(el, config);
      }
    });
  }

  private addBody(el: SVGPathElement, config: any) {
    const d = el.getAttribute('d');
    if (!d) return;

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
    
    for (const vertices of polygons) {
      if (vertices.length < 3) continue;

      const id = this.nextId++;
      const centroid = Geometry.calculateCentroid(vertices);
      
      // Normalize vertices for Rapier (relative to centroid)
      const flatVertices = vertices.flatMap(v => [v.x - centroid.x, v.y - centroid.y]);

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
      
      // Pre-set some styles for performance
      el.style.willChange = 'transform';
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
