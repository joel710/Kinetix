import RAPIER from '@dimforge/rapier2d';
import { Point } from '../math/Linearizer';
import { Geometry } from '../math/Geometry';

export class PhysicsWorld {
  private world: RAPIER.World;
  private bodies: Map<SVGElement, RAPIER.RigidBody> = new Map();

  constructor(gravity = { x: 0, y: 9.81 }) {
    this.world = new RAPIER.World(new RAPIER.Vector2(gravity.x, gravity.y));
  }

  /**
   * Creates a rigid body from linearized SVG vertices.
   * Handles convex decomposition implicitly via Rapier's polyline/convex hull features.
   */
  public createBodyFromVertices(
    el: SVGElement,
    vertices: Point[],
    options: { isStatic?: boolean; restitution?: number; friction?: number } = {}
  ): RAPIER.RigidBody {
    // 1. Calculate physical center (centroid)
    const centroid = Geometry.calculateCentroid(vertices);
    
    // 2. Normalize vertices relative to centroid for Rapier
    const normalizedVertices = new Float32Array(vertices.length * 2);
    for (let i = 0; i < vertices.length; i++) {
      normalizedVertices[i * 2] = vertices[i].x - centroid.x;
      normalizedVertices[i * 2 + 1] = vertices[i].y - centroid.y;
    }

    // 3. Define Rigid Body
    const bodyDesc = options.isStatic 
      ? RAPIER.RigidBodyDesc.fixed() 
      : RAPIER.RigidBodyDesc.dynamic();
    
    // Set initial position to the centroid's world position
    bodyDesc.setTranslation(centroid.x, centroid.y);
    const body = this.world.createRigidBody(bodyDesc);

    // 4. Create Collider (Convex Hull for stability)
    // For more complex concave shapes, we would use convexDecomposition here.
    const colliderDesc = RAPIER.ColliderDesc.convexHull(normalizedVertices);
    if (colliderDesc) {
      colliderDesc.setRestitution(options.restitution ?? 0.5);
      colliderDesc.setFriction(options.friction ?? 0.5);
      this.world.createCollider(colliderDesc, body);
    }

    this.bodies.set(el, body);
    return body;
  }

  /**
   * Advances the simulation by one time step.
   */
  public step() {
    this.world.step();
  }

  /**
   * Synchronizes SVG elements with their physical counterparts.
   */
  public sync(onSync?: (el: SVGElement, pos: { x: number; y: number }, angle: number) => void) {
    this.bodies.forEach((body, el) => {
      const translation = body.translation();
      const rotation = body.rotation();
      
      // Update DOM element via CSS transform for maximum performance
      // We use translate3d to trigger GPU acceleration
      el.style.transform = `translate3d(${translation.x}px, ${translation.y}px, 0) rotate(${rotation}rad)`;
      
      if (onSync) onSync(el, translation, rotation);
    });
  }

  public getRawWorld(): RAPIER.World {
    return this.world;
  }
}
