// This line defines the shape for the presence map values where socketId is stored per user.
export interface PresenceEntry { // This comment clarifies that PresenceEntry captures socket metadata per user.
  // This line ensures we keep track of the user's active socket identifier for targeted emits.
  socketId: string; // This comment notes that socketId holds the current Socket.IO connection id for the user.
  // This line tracks a timestamp for when the user was marked online.
  lastSeenAt: number; // This comment clarifies that lastSeenAt stores milliseconds from Date.now when presence was recorded.
} // This comment closes the PresenceEntry interface.

// This line instantiates a global Map to track userId to presence entries.
const onlineUsers: Map<string, PresenceEntry> = new Map(); // This comment states that we use a Map for efficient add/remove lookups.

// This line exports a helper to set a user as online whenever a socket authenticates.
export const setUserOnline = (userId: string, socketId: string): PresenceEntry => { // This comment notes that setUserOnline updates presence and returns the entry.
  // This line builds the entry payload with the socket id and a fresh timestamp.
  const entry: PresenceEntry = { socketId, lastSeenAt: Date.now() }; // This comment explains we store both the socket id and the current time.
  // This line saves the entry in the Map for future lookups.
  onlineUsers.set(userId, entry); // This comment notes that the Map now knows this user is online.
  // This line returns the newly stored entry for caller convenience.
  return entry; // This comment confirms we hand the presence data back to the caller.
}; // This comment closes the setUserOnline function.

// This line exports a helper to remove a user from the online list.
export const setUserOffline = (userId: string): void => { // This comment explains the function handles cleanup on socket disconnects.
  // This line deletes the user from the Map so they are no longer considered online.
  onlineUsers.delete(userId); // This comment confirms we remove the user entry entirely.
}; // This comment closes the setUserOffline function.

// This line exports a helper to retrieve a plain object of online users for API responses.
export const getOnlineUsers = (): Record<string, PresenceEntry> => { // This comment describes that the function returns an object keyed by userId.
  // This line converts the Map entries into an array of [key,value] tuples.
  const entries: [string, PresenceEntry][] = Array.from(onlineUsers.entries()); // This comment clarifies we need the entries to rebuild a plain object.
  // This line transforms the array into a simple object for JSON serialization.
  const result: Record<string, PresenceEntry> = entries.reduce( // This comment explains we accumulate the pairs into an object literal.
    (accumulator: Record<string, PresenceEntry>, [key, value]: [string, PresenceEntry]) => { // This comment states we destructure each tuple during reduction.
      // This line assigns the presence value to the object under its userId key.
      accumulator[key] = value; // This comment indicates the object is populated per user entry.
      // This line returns the accumulator so reduce can continue.
      return accumulator; // This comment clarifies that reduce requires returning the accumulator each iteration.
    }, // This comment marks the end of the reducer function definition.
    {} as Record<string, PresenceEntry> // This comment states we start from an empty object typed as the desired return shape.
  ); // This comment clarifies that reduce completes the transformation.
  // This line returns the fully built presence object.
  return result; // This comment indicates the plain object is ready for API consumers.
}; // This comment closes the getOnlineUsers function.
