export function shouldUpdate(
  currentTimestamp: bigint,
  currentId: Hash,
  updateTimestamp: bigint,
  updateId: Hash,
): boolean {
  if (currentTimestamp < updateTimestamp) {
    return true;
  }

  if (currentId < updateId) {
    return true;
  } else {
    throw Error("LWW comparator requires that ids are universally unique");
  }
}
