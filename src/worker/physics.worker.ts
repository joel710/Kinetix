import * as RAPIER from '@dimforge/rapier2d';

let world: RAPIER.World;
let bodies: Map<number, RAPIER.RigidBody> = new Map();
let eventQueue: RAPIER.EventQueue;
let sharedBuffer: Float32Array;
let useSAB: boolean = false;

// Air resistance coefficient
const AIR_DRAG = 0.01;

let initialized = false;
const messageQueue: any[] = [];

console.log('Worker: Script loaded');
self.postMessage({ type: 'READY' });

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (!initialized && type !== 'INIT') {
    messageQueue.push(e.data);
    return;
  }

  switch (type) {
    case 'INIT':
      try {
        await RAPIER.init();
        eventQueue = new RAPIER.EventQueue(true);
        world = new RAPIER.World(new RAPIER.Vector2(payload.gravity.x, payload.gravity.y));
        useSAB = payload.useSAB && payload.sab != null;
        sharedBuffer = useSAB && payload.sab
          ? new Float32Array(payload.sab)
          : new Float32Array(payload.maxBodies * 3);
        initialized = true;
        
        // Process queued messages
        while (messageQueue.length > 0) {
          await handleMessage(messageQueue.shift());
        }
        tick();
      } catch (err) {
        console.error('Worker: Initialization failed', err);
      }
      break;

    default:
      await handleMessage(e.data);
      break;
  }
};

async function handleMessage(data: any) {
  const { type, payload } = data;
  
  switch (type) {
    case 'ADD_BODY':
      const { id, vertices, config } = payload;
      const bodyDesc = config.isStatic 
        ? RAPIER.RigidBodyDesc.fixed() 
        : RAPIER.RigidBodyDesc.dynamic();
      
      bodyDesc.setTranslation(config.x, config.y);
      bodyDesc.setLinearDamping(AIR_DRAG);
      bodyDesc.setAngularDamping(AIR_DRAG);

      const body = world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.convexHull(new Float32Array(vertices));
      
      if (colliderDesc) {
        colliderDesc.setRestitution(config.restitution ?? 0.5);
        colliderDesc.setFriction(config.friction ?? 0.5);
        colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
        world.createCollider(colliderDesc, body);
      }
      
      bodies.set(id, body);
      break;

    case 'APPLY_FORCE':
      const targetBody = bodies.get(payload.id);
      if (targetBody) {
        targetBody.applyImpulse(new RAPIER.Vector2(payload.x, payload.y), true);
      }
      break;
  }
}

function tick() {
  if (!world) return;
  
  world.step(eventQueue);

  // Handle collision events
  eventQueue.drainCollisionEvents((handle1, handle2, started) => {
    if (started) {
      let id1 = -1, id2 = -1;
      // Note: In production, we should use a Map for handle -> id mapping
      for (const [id, body] of bodies) {
        if (body.handle === handle1) id1 = id;
        if (body.handle === handle2) id2 = id;
        if (id1 !== -1 && id2 !== -1) break;
      }
      
      if (id1 !== -1 && id2 !== -1) {
        self.postMessage({ type: 'COLLISION', payload: { id1, id2 } });
      }
    }
  });

  // Sync state
  for (const [id, body] of bodies) {
    if (body.isSleeping()) continue;
    const offset = id * 3;
    const pos = body.translation();
    const rot = body.rotation();
    sharedBuffer[offset] = pos.x;
    sharedBuffer[offset + 1] = pos.y;
    sharedBuffer[offset + 2] = rot;
  }

  if (!useSAB) {
    self.postMessage({ type: 'SYNC', payload: sharedBuffer });
  }

  setTimeout(tick, 16);
}
