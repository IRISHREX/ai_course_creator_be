import { Router } from "express";
import { z } from "zod";
import { UserAiKey } from "../models/UserAiKey.js";
import { requireAuth, requireRole, AuthedRequest } from "../auth.js";
import { decryptApiKey, isAiKeyDecryptionError, saveUserAiKey } from "../aiKeys.js";
import { body, query } from "../validation.js";

export const aiKeysRouter = Router();

const SaveKey = z.object({
  apiKey: z.string().min(10).max(500),
  provider: z.string().default("google"),
  alias: z.string().trim().max(80).optional().default(""),
});

const adminOnly = [requireAuth, requireRole("admin", "super_admin")] as const;

async function checkGeminiKey(apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Reply with exactly: OK" }] }],
      generationConfig: { maxOutputTokens: 4, temperature: 0 },
    }),
  }).finally(() => clearTimeout(timeout));
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const message = data?.error?.message || data?.error || "Gemini key check failed";
    const status = r.status === 429 ? "limited" : "invalid";
    return { ok: false, status, httpStatus: r.status, message: String(message) };
  }
  return {
    ok: true,
    status: "active",
    httpStatus: r.status,
    message: "Gemini key is active",
    usage: data?.usageMetadata,
  };
}

aiKeysRouter.get("/", ...adminOnly, async (req: AuthedRequest, res) => {
  const keys = await UserAiKey.find({ userId: req.user!.id })
    .sort({ status: 1, updatedAt: 1 })
    .select("id provider keyPreview status lastError updatedAt");
  res.json({ key: keys[0] ?? null, keys });
});

aiKeysRouter.post("/", ...adminOnly, async (req: AuthedRequest, res) => {
  const parsed = body(SaveKey, req);
  const key = await saveUserAiKey(req.user!.id, parsed.apiKey, parsed.provider, parsed.alias);
  res.json({ key });
});

aiKeysRouter.post("/check", ...adminOnly, async (req: AuthedRequest, res) => {
  const keys = await UserAiKey.find({ userId: req.user!.id }).sort({ updatedAt: 1 });
  if (!keys.length) return res.status(404).json({ error: "No Gemini API key saved" });

  const checks = [];
  for (const key of keys) {
    let result: Awaited<ReturnType<typeof checkGeminiKey>>;
    let canPersistResult = true;
    try {
      result = await checkGeminiKey(decryptApiKey(key.encryptedKey));
    } catch (error) {
      if (!isAiKeyDecryptionError(error)) throw error;
      canPersistResult = false;
      result = {
        ok: false,
        status: key.status,
        httpStatus: 400,
        message: error.message,
      };
    }
    if (canPersistResult) {
      await UserAiKey.findByIdAndUpdate(
        key._id,
        {
          status: result.status,
          lastError: result.ok ? null : result.message,
        }
      );
    }
    checks.push({ id: key._id, keyPreview: key.keyPreview, ...result });
  }
  res.json({ check: checks[0], checks });
});

aiKeysRouter.delete("/", ...adminOnly, async (req: AuthedRequest, res) => {
  const { id } = query(z.object({ id: z.string().optional() }), req);
  const filter = { userId: req.user!.id, ...(id ? { _id: id } : {}) };
  await UserAiKey.deleteMany(filter);
  res.json({ ok: true });
});
