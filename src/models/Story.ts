// This line imports mongoose helpers to define the story schema.
import mongoose, { Schema, model, models } from "mongoose";

// This interface describes a story document persisted in MongoDB.
export interface StoryDocument extends mongoose.Document {
  userId: string;
  content: string;
  images: string[];
  audio?: string;
  reactions: Record<string, string[]>;
  createdAt: Date;
  expiresAt: Date;
}

const MAX_LIFETIME_SECONDS = 60 * 60 * 24;

// This schema defines the structure of the stories collection.
const storySchema = new Schema<StoryDocument>(
  {
    userId: { type: String, required: true, index: true },
    content: { type: String, default: "" },
    images: { type: [String], default: [] },
    audio: { type: String, default: "" },
    reactions: {
      type: Map,
      of: [String],
      default: {}
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + MAX_LIFETIME_SECONDS * 1000),
      expires: 0
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: true }
  }
);

export const StoryModel = models.Story || model<StoryDocument>("Story", storySchema);
