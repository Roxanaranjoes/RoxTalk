// This line defines a helper that converts two user ids into a deterministic room identifier.
export const buildRoomId = (userIdA: string, userIdB: string): string => { // This comment declares the function signature.
  // This line sorts the two ids lexicographically to avoid order differences.
  const [first, second] = [userIdA, userIdB].sort(); // This comment ensures the resulting room id is consistent regardless of order.
  // This line returns the formatted room id string.
  return `room:${first}:${second}`; // This comment clarifies the room id prefix and separator used.
}; // This comment closes the buildRoomId helper.
