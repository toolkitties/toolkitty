type ResolveFn = () => void;
type RejectFn = (err: unknown) => void;

// Map to store promises and their resolve and reject functions.
const promiseMap: Map<
  string,
  { promise: Promise<void>; resolve: ResolveFn; reject: RejectFn }
> = new Map();

// Backend messages can be processed before publish_persisted returns the
// operation id. Remember recent results so promiseResult cannot miss them.
// Bound the cache because responses from other peers also pass through here.
const completedResults = new Map<
  string,
  { error?: unknown; rejected: boolean }
>();
const MAX_COMPLETED_RESULTS = 512;

function rememberResult(
  id: string,
  result: { error?: unknown; rejected: boolean },
) {
  completedResults.set(id, result);
  if (completedResults.size > MAX_COMPLETED_RESULTS) {
    completedResults.delete(completedResults.keys().next().value!);
  }
}

/**
 * Create and return a promise which is assigned an id and returns a result
 * when another method calls the "resolvePromise" or "rejectPromise" methods
 * with the same identifier.
 *
 * This helper method can be used to await the result in one part of the
 * application which might be finished somewhere else.
 */
export function promiseResult(id: string): Promise<void> {
  const completed = completedResults.get(id);
  if (completed) {
    completedResults.delete(id);
    return completed.rejected
      ? Promise.reject(completed.error)
      : Promise.resolve();
  }

  const pending = promiseMap.get(id);
  if (pending) return pending.promise;

  let resolveFn: ResolveFn;
  let rejectFn: RejectFn;

  const promise = new Promise<void>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  promiseMap.set(id, {
    promise,
    resolve: resolveFn!,
    reject: rejectFn!,
  });

  return promise;
}

/**
 * Resolve the promise with the given id.
 */
export function resolvePromise(id: string): void {
  const task = promiseMap.get(id);
  if (task) {
    task.resolve();
    promiseMap.delete(id);
  } else {
    rememberResult(id, { rejected: false });
  }
}

/**
 * Reject the promise with the given id including an optional error value.
 */
export function rejectPromise(id: string, err: unknown): void {
  const task = promiseMap.get(id);
  if (task) {
    task.reject(err);
    promiseMap.delete(id);
  } else {
    rememberResult(id, { rejected: true, error: err });
  }
}
