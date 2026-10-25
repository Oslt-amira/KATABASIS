import RAPIER from '@dimforge/rapier3d-compat';
let ready: Promise<void> | undefined;
// Rapier's WASM module must initialize once across Strict Mode remounts.
export function initializePhysics() { return ready ??= RAPIER.init(); }
