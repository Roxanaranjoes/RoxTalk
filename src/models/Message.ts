// This line imports mongoose utilities to define the message schema.
import mongoose, { Schema, model, models } from "mongoose"; // This comment explains we use Schema for structure and model/models for model reuse.

// This line defines the TypeScript interface for a chat message document.
export interface MessageDocument extends mongoose.Document { // This comment clarifies the interface extends mongoose documents.
  // This line stores the sender user id.
  fromUserId: string; // This comment ensures we know who sent the message.
  // This line stores the recipient user id.
  toUserId: string; // This comment indicates who receives the message.
  // This line stores the actual message text content.
  content: string; // This comment clarifies we keep text even when photos are attached.
  // This line stores the collection of attachment URLs or data strings.
  attachments: string[]; // This comment enables photo messages by keeping base64 strings or URLs.
  // This line stores the derived room identifier for quick lookups.
  roomId: string; // This comment states we persist a deterministic room id.
  // This line stores the timestamp when the message was created.
  createdAt: Date; // This comment indicates mongoose manages this automatically.
  // This line stores the timestamp when the message was last updated.
  updatedAt: Date; // This comment is included because timestamps option adds it.
} // This comment closes the MessageDocument interface.

// This line sets up the schema describing each message field.
const messageSchema = new Schema<MessageDocument>( // This comment highlights the schema uses TypeScript generics.
  { // This comment opens the fields block.
    // This line defines the sender field as a required string.
    fromUserId: { type: String, required: true }, // This comment ensures mongoose enforces the sender id.
    // This line defines the recipient field as a required string.
    toUserId: { type: String, required: true }, // This comment ensures the message has a target user.
    // This line defines the message content field.
    content: { type: String, default: "" }, // This comment allows empty text when only photos are sent.
    // This line defines the attachments array with a default of an empty list.
    attachments: { type: [String], default: [] }, // This comment keeps serialized image data or URLs.
    // This line defines the deterministic room identifier used for grouping.
    roomId: { type: String, required: true, index: true }, // This comment adds an index for faster room queries.
  }, // This comment closes the fields block.
  { // This comment opens the schema options block.
    // This line enables automatic timestamp management.
    timestamps: true, // This comment ensures createdAt and updatedAt fields exist.
  } // This comment closes the options block.
); // This comment concludes the schema creation.

// This line creates or reuses the Message model to avoid recompilation during development.
export const MessageModel = models.Message || model<MessageDocument>("Message", messageSchema); // This comment ensures a single model definition across reloads.
