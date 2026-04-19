# Skill: Performance Engineering (WebGPU & Workers)

## 1. Web Workers Architecture
- **Off-main-thread Physics**: Run the physics loop in a dedicated Worker.
- **Message Passing**: Use `SharedArrayBuffer` for zero-copy state synchronization if available, otherwise use `Transferable Objects`.

## 2. WebGPU Compute Shaders
- **Spatial Hashing**: Partition space into a grid on the GPU to achieve $O(n)$ collision detection.
- **WGSL Snippet**: Use `atomicAdd` to populate grid cells.
- **Avoid Readbacks**: Keep position data in GPU buffers and use them directly for rendering via `vertex_buffer`.

## 3. Frame Synchronization
- **Interpolation**: $State_{render} = State_{prev} \times (1 - \alpha) + State_{curr} \times \alpha$
- $\alpha$ is the remainder of (currentTime - lastPhysicsUpdate) / fixedTimeStep.
