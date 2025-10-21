import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { connectToDatabase } from "../../../lib/mongodb";
import { getAuthenticatedUser } from "../../../lib/auth";
import { StoryModel, type StoryDocument } from "../../../models/Story";
import { UserModel } from "../../../models/User";

const MAX_IMAGE_COUNT = 4;
const MAX_IMAGE_LENGTH = 7_000_000;
const MAX_AUDIO_LENGTH = 12_000_000;

const createStorySchema = z.object({
  content: z.string().max(500).optional(),
  images: z.array(z.string()).max(MAX_IMAGE_COUNT).optional(),
  audio: z.string().optional()
});

const sanitizeImages = (images: string[] = []): string[] => {
  const sanitized: string[] = [];
  for (const item of images) {
    if (typeof item !== "string") {
      continue;
    }
    if (!item.startsWith("data:image/")) {
      continue;
    }
    if (item.length > MAX_IMAGE_LENGTH) {
      continue;
    }
    sanitized.push(item);
    if (sanitized.length >= MAX_IMAGE_COUNT) {
      break;
    }
  }
  return sanitized;
};

const sanitizeAudio = (audio?: string): string => {
  if (!audio) {
    return "";
  }
  if (!audio.startsWith("data:audio/")) {
    return "";
  }
  if (audio.length > MAX_AUDIO_LENGTH) {
    return "";
  }
  return audio;
};

export const storyToPayload = (story: StoryDocument, authorMap: Map<string, { name: string; email: string }>) => {
  const reactionsMap: Record<string, string[]> = {};
  if (story.reactions) {
    const entries = story.reactions instanceof Map ? story.reactions.entries() : Object.entries(story.reactions as unknown as Record<string, string[]>);
    for (const [emoji, userIds] of entries) {
      reactionsMap[emoji] = Array.isArray(userIds) ? userIds.map((id) => String(id)) : [];
    }
  }
  const author = authorMap.get(story.userId) || { name: "Usuario", email: "" };
  return {
    _id: String(story._id),
    userId: story.userId,
    content: story.content,
    images: story.images ?? [],
    audio: story.audio || "",
    reactions: reactionsMap,
    createdAt: story.createdAt.toISOString(),
    expiresAt: story.expiresAt.toISOString(),
    author
  };
};

const storiesHandler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ success: false, error: "Authentication required." });
    return;
  }

  if (req.method === "GET") {
    await connectToDatabase();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await StoryModel.find({ createdAt: { $gte: cutoff } }).sort({ createdAt: -1 });
    const authorIds = Array.from(new Set(stories.map((story) => story.userId)));
    const authors = await UserModel.find({ _id: { $in: authorIds } });
    const authorMap = authors.reduce<Map<string, { name: string; email: string }>>((accumulator, doc) => {
      accumulator.set(String(doc._id), { name: doc.name, email: doc.email });
      return accumulator;
    }, new Map());
    const payload = stories.map((story) => storyToPayload(story as StoryDocument, authorMap));
    res.status(200).json({ success: true, data: payload });
    return;
  }

  if (req.method === "POST") {
    await connectToDatabase();
    const parsed = createStorySchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid story payload.";
      res.status(400).json({ success: false, error: message });
      return;
    }
    const content = (parsed.data.content || "").trim();
    const images = sanitizeImages(parsed.data.images || []);
    const audio = sanitizeAudio(parsed.data.audio);
    if (!content && images.length === 0 && !audio) {
      res.status(400).json({ success: false, error: "Tu historia necesita texto, imagen o nota de voz." });
      return;
    }
    const story = await StoryModel.create({
      userId: String(user._id),
      content,
      images,
      audio
    });
    const authorMap = new Map<string, { name: string; email: string }>();
    authorMap.set(String(user._id), { name: user.name, email: user.email });
    const payload = storyToPayload(story as StoryDocument, authorMap);
    res.status(201).json({ success: true, data: payload });
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ success: false, error: "Method not allowed." });
};

export default storiesHandler;

