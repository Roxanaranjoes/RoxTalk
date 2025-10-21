import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { connectToDatabase } from "../../../lib/mongodb";
import { getAuthenticatedUser } from "../../../lib/auth";
import { StoryModel, type StoryDocument } from "../../../models/Story";
import { UserModel } from "../../../models/User";
import { storyToPayload } from "./index";

const allowedEmojis = ["??", "??", "??", "??", "??"];

const reactionSchema = z.object({
  storyId: z.string().min(1),
  emoji: z.string().min(1)
});

const cutoffMs = 24 * 60 * 60 * 1000;

const reactHandler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Method not allowed." });
    return;
  }
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ success: false, error: "Authentication required." });
    return;
  }
  const parsed = reactionSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Invalid reaction payload.";
    res.status(400).json({ success: false, error: message });
    return;
  }
  const emoji = parsed.data.emoji;
  if (!allowedEmojis.includes(emoji)) {
    res.status(400).json({ success: false, error: "Emoji de reaccion no permitido." });
    return;
  }
  await connectToDatabase();
  const story = await StoryModel.findById(parsed.data.storyId);
  if (!story) {
    res.status(404).json({ success: false, error: "La historia ya no esta disponible." });
    return;
  }
  const isExpired = story.createdAt.getTime() < Date.now() - cutoffMs;
  if (isExpired) {
    await story.deleteOne();
    res.status(410).json({ success: false, error: "La historia expiro." });
    return;
  }
  const userId = String(user._id);
  const currentMap = story.reactions instanceof Map ? new Map<string, string[]>(story.reactions) : new Map<string, string[]>();
  if (!(story.reactions instanceof Map) && story.reactions) {
    Object.entries(story.reactions as Record<string, string[]>).forEach(([key, value]) => {
      currentMap.set(key, Array.isArray(value) ? value.map((entry) => String(entry)) : []);
    });
  }
  const hadEmojiBefore = currentMap.get(emoji)?.includes(userId) ?? false;
  for (const [key, ids] of currentMap.entries()) {
    const filtered = (ids || []).filter((id) => id !== userId);
    if (filtered.length === 0) {
      currentMap.delete(key);
    } else {
      currentMap.set(key, filtered);
    }
  }
  if (!hadEmojiBefore) {
    const updatedList = currentMap.get(emoji) ?? [];
    updatedList.push(userId);
    currentMap.set(emoji, updatedList);
  }
  story.reactions = currentMap;
  await story.save();
  const authorDoc = await UserModel.findById(story.userId);
  const authorMap = new Map<string, { name: string; email: string }>();
  if (authorDoc) {
    authorMap.set(String(authorDoc._id), { name: authorDoc.name, email: authorDoc.email });
  }
  const payload = storyToPayload(story as StoryDocument, authorMap);
  res.status(200).json({ success: true, data: payload });
};

export default reactHandler;
