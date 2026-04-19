import * as RAPIER from '@dimforge/rapier2d';

let world: RAPIER.World;
let bodies: Map<number, RAPIER.RigidBody> = new Map();
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
  console.log(`Worker: Received message ${type}`, payload);

  if (!initialized && type !== 'INIT') {
    console.log(`Worker: Queuing message ${type}`);
    messageQueue.push(e.data);
    return;
  }

  switch (type) {
    case 'INIT':
      try {
        console.log('Worker: Initializing Rapier...');
        await RAPIER.init();
        console.log('Worker: Rapier initialized successfully');
        
        world = new RAPIER.World(new RAPIER.Vector2(payload.gravity.x, payload.gravity.y));
        useSAB = payload.useSAB;
        sharedBuffer = useSAB ? new Float32Array(payload.sab) : new Float32Array(payload.maxBodies * 3);
        initialized = true;
        
        console.log(`Worker: Setup complete, useSAB: ${useSAB}`);

        // Process queued messages
        while (messageQueue.length > 0) {
          const queuedData = messageQueue.shift()!;
          console.log(`Worker: Processing queued message ${queuedData.type}`);
          await handleMessage(queuedData);
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
        world.createCollider(colliderDesc, body);
      }
      
      bodies.set(id, body);
      console.log(`Worker: Added body ${id}, total bodies: ${bodies.size}`);
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
  
  world.step();

  // Sync state
  bodies.forEach((body, id) => {
    const pos = body.translation();
    const rot = body.rotation();
    const offset = id * 3;
    sharedBuffer[offset] = pos.x;
    sharedBuffer[offset + 1] = pos.y;
    sharedBuffer[offset + 2] = rot;
  });

  if (!useSAB) {
    self.postMessage({ type: 'SYNC', payload: sharedBuffer });
  }

  setTimeout(tick, 16);
}
