import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { getAuthenticatedUser } from "../../../lib/auth";

const MAX_AVATAR_LENGTH = 7_000_000;

const updateSchema = z.object({
  location: z.string().max(120, "La ubicacion debe tener 120 caracteres o menos.").optional(),
  bio: z.string().max(600, "La biografia debe tener 600 caracteres o menos.").optional(),
  avatar: z.string().max(MAX_AVATAR_LENGTH, "La imagen es demasiado grande.").optional()
});

const sanitizeAvatar = (value?: string): { ok: boolean; data: string; error?: string } => {
  if (typeof value !== "string") {
    return { ok: true, data: "" };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: true, data: "" };
  }
  if (!trimmed.startsWith("data:image/")) {
    return { ok: false, data: "", error: "La imagen debe estar en formato base64 valido." };
  }
  return { ok: true, data: trimmed };
};

const meHandler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ success: false, error: "Authentication required." });
    return;
  }
  if (req.method === "GET") {
    res.status(200).json({
      success: true,
      data: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        location: user.location ?? "",
        bio: user.bio ?? "",
        avatar: user.avatar ?? "",
        createdAt: user.createdAt.toISOString(),
        isOnline: true
      }
    });
    return;
  }
  if (req.method === "PUT") {
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      const message = parseResult.error.errors[0]?.message || "Datos de perfil invalidos.";
      res.status(400).json({ success: false, error: message });
      return;
    }
    const { location = "", bio = "", avatar } = parseResult.data;
    const avatarResult = sanitizeAvatar(avatar);
    if (!avatarResult.ok) {
      res.status(400).json({ success: false, error: avatarResult.error || "La imagen no es valida." });
      return;
    }
    user.location = location.trim();
    user.bio = bio.trim();
    user.avatar = avatarResult.data;
    await user.save();
    res.status(200).json({
      success: true,
      data: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        location: user.location ?? "",
        bio: user.bio ?? "",
        avatar: user.avatar ?? "",
        createdAt: user.createdAt.toISOString(),
        isOnline: true
      }
    });
    return;
  }
  res.setHeader("Allow", "GET, PUT");
  res.status(405).json({ success: false, error: "Method not allowed." });
};

export default meHandler;
