let broadcaster = null;

export function setLocationBroadcaster(callback) {
  broadcaster = callback;
}

export function broadcastLocationObservation(observation) {
  broadcaster?.(observation);
}
