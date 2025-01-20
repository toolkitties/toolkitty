// Create a Map to store promises and their resolve functions
const promiseMap: Map<string, { promise: Promise<void>; resolve: () => void }> =
  new Map();

export function addPromise(taskId: string): Promise<void> {
  // Create a new promise and store its resolve function
  let resolveFunction: () => void;
  const promise = new Promise<void>((resolve) => {
    resolveFunction = resolve;
  });

  promiseMap.set(taskId, { promise, resolve: resolveFunction! });

  return promise;
}

// Function to manually resolve a promise in the Map
export function resolvePromise(taskId: string): void {
  const task = promiseMap.get(taskId);
  if (task) {
    task.resolve();
  }
}
