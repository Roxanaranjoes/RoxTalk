// This line defines the TypeScript interface for a user object sent to clients.
export interface User { // This comment clarifies that User represents the public profile fields.
  // This line stores the database identifier string.
  _id: string; // This comment notes that ids are represented as strings for client compatibility.
  // This line stores the display name of the user.
  name: string; // This comment ensures UI components can show the user's name.
  // This line stores the unique email address.
  email: string; // This comment states the email doubles as a login credential.
  // This line stores the creation timestamp in ISO format.
  createdAt: string; // This comment clarifies dates are serialized as strings for JSON.
} // This comment closes the User interface.

// This line defines the interface for an authenticated user including presence data.
export interface AuthenticatedUser extends User { // This comment states the authenticated user shares the User fields.
  // This line stores a boolean indicating whether the user is currently online.
  isOnline: boolean; // This comment helps the UI badge the local user if desired.
} // This comment closes the AuthenticatedUser interface.

// This line defines the interface for a chat message given to the client.
export interface ChatMessage { // This comment notes that ChatMessage mirrors the database but uses strings for ids.
  // This line stores the unique message identifier.
  _id: string; // This comment ensures React can use the id as a key.
  // This line stores the sender id.
  fromUserId: string; // This comment identifies who authored the message.
  // This line stores the recipient id.
  toUserId: string; // This comment indicates the target user.
  // This line stores the sorted room id derived from both user ids.
  roomId: string; // This comment allows grouping messages inside the conversation.
  // This line stores the textual message content.
  content: string; // This comment clarifies we only support text messages in this MVP.
  // This line stores the creation timestamp string.
  createdAt: string; // This comment ensures we render relative or formatted times.
} // This comment closes the ChatMessage interface.

// This line defines a reusable API response envelope.
export interface ApiResponse<T> { // This comment states the generic type T holds the payload.
  // This line signals whether the request succeeded.
  success: boolean; // This comment ensures consumers check success before reading data.
  // This line optionally stores the data payload.
  data?: T; // This comment clarifies data only appears when success is true.
  // This line optionally stores an error message.
  error?: string; // This comment ensures errors can be surfaced in the UI.
} // This comment closes the ApiResponse interface.

// This line defines the request shape for login submissions.
export interface LoginRequest { // This comment notes these fields are sent from the login page.
  // This line stores the user's email address.
  email: string; // This comment ensures validation enforces email presence.
  // This line stores the user's plain text password.
  password: string; // This comment clarifies the server hashes and compares this value.
} // This comment closes the LoginRequest interface.

// This line defines the request shape for registration submissions.
export interface RegisterRequest { // This comment indicates the register form fields.
  // This line stores the display name.
  name: string; // This comment ensures the server requires a name.
  // This line stores the email address.
  email: string; // This comment ensures uniqueness is enforced server-side.
  // This line stores the plain text password.
  password: string; // This comment clarifies the password is hashed before persistence.
} // This comment closes the RegisterRequest interface.

// This line defines the payload emitted when sending a websocket message.
export interface OutgoingMessagePayload { // This comment states this shape is sent from client to server.
  // This line stores the sender id.
  fromUserId: string; // This comment ensures the server verifies the sender.
  // This line stores the recipient id.
  toUserId: string; // This comment directs the server to the correct conversation.
  // This line stores the textual content.
  content: string; // This comment clarifies the payload is plain text.
} // This comment closes the OutgoingMessagePayload interface.

// This line defines the websocket event names used by the client.
export interface SocketEventMap { // This comment lists the client events and their payloads.
  // This line maps the server event for new messages.
  "message:new": ChatMessage; // This comment ensures handlers know they receive a ChatMessage.
  // This line maps the server event for user presence updates when someone comes online.
  "user:online": { userId: string }; // This comment clarifies the event carries the affected user id.
  // This line maps the server event for user presence updates when someone goes offline.
  "user:offline": { userId: string }; // This comment states the payload mirrors the online event.
  // This line maps the server event for typing indicators.
  "user:typing": { userId: string; isTyping: boolean }; // This comment clarifies we send the user id and typing state.
} // This comment closes the SocketEventMap interface.

// This line defines the shape for the typing indicator state inside context.
export interface TypingState { // This comment explains this map tracks which users are currently typing.
  // This line stores a boolean to indicate whether the remote user is typing.
  [userId: string]: boolean; // This comment ensures lookups are simple by user id key.
} // This comment closes the TypingState interface.

// This line defines the unread counts structure for each conversation.
export interface UnreadCountMap { // This comment clarifies we keep unread totals per user id.
  // This line stores the unread total for a specific user id conversation.
  [userId: string]: number; // This comment communicates the value is the unread message count.
} // This comment closes the UnreadCountMap interface.
