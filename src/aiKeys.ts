import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { prisma } from "./db.js";
import { env } from "./env.js";

const ALGORITHM = "aes-256-gcm";
function encryptionKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

const PRIMARY_KEY = encryptionKey(env.AI_KEY_ENCRYPTION_SECRET);
const DECRYPTION_KEYS = [
  env.AI_KEY_ENCRYPTION_SECRET,
  ...env.AI_KEY_LEGACY_SECRETS,
]
  .filter((secret, index, secrets) => secrets.indexOf(secret) === index)
  .map(encryptionKey);

export const AI_KEY_DECRYPTION_MESSAGE =
  "Saved Gemini API key cannot be decrypted. Check AI_KEY_ENCRYPTION_SECRET or add the old secret to AI_KEY_LEGACY_SECRETS.";

export class AiKeyDecryptionError extends Error {
  constructor(message = AI_KEY_DECRYPTION_MESSAGE) {
    super(message);
    this.name = "AiKeyDecryptionError";
  }
}

export function isAiKeyDecryptionError(error: unknown): error is AiKeyDecryptionError {
  return error instanceof AiKeyDecryptionError;
}

export function encryptApiKey(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, PRIMARY_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptApiKey(value: string) {
  try {
    const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
    if (!ivRaw || !tagRaw || !encryptedRaw) throw new AiKeyDecryptionError();
    const iv = Buffer.from(ivRaw, "base64");
    const tag = Buffer.from(tagRaw, "base64");
    const encrypted = Buffer.from(encryptedRaw, "base64");
    if (iv.length !== 12 || tag.length !== 16 || !encrypted.length) throw new AiKeyDecryptionError();

    for (const key of DECRYPTION_KEYS) {
      try {
        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([
          decipher.update(encrypted),
          decipher.final(),
        ]);
        return decrypted.toString("utf8");
      } catch {
        // Try the next configured legacy key.
      }
    }
    throw new AiKeyDecryptionError();
  } catch (error) {
    if (isAiKeyDecryptionError(error)) throw error;
    throw new AiKeyDecryptionError();
  }
}

export type DecryptedAiKey = {
  id: string;
  provider: string;
  keyPreview: string | null;
  apiKey: string;
};

export async function getUserAiKeys(userId: string): Promise<DecryptedAiKey[]> {
  const rows = await prisma.userAiKey.findMany({
    where: { userId, status: "active" },
    orderBy: [{ updatedAt: "asc" }],
  });
  const keys: DecryptedAiKey[] = [];
  for (const row of rows) {
    try {
      keys.push({
        id: row.id,
        provider: row.provider,
        keyPreview: row.keyPreview,
        apiKey: decryptApiKey(row.encryptedKey),
      });
    } catch (error) {
      if (!isAiKeyDecryptionError(error)) throw error;
    }
  }
  return keys;
}

async function ensureMultipleAiKeysAllowed() {
  await prisma.$executeRawUnsafe(
    "CREATE INDEX `user_ai_keys_user_id_status_updated_at_idx` ON `user_ai_keys` (`user_id`, `status`, `updated_at`)",
  ).catch(() => undefined);
  await prisma.$executeRawUnsafe("DROP INDEX `user_ai_keys_user_id_key` ON `user_ai_keys`").catch(() => undefined);
}

function isOldSingleKeyConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002" &&
    JSON.stringify((error as { meta?: unknown }).meta || {}).includes("user_ai_keys_user_id_key")
  );
}

async function nextKeyLabel(userId: string, provider: string) {
  const count = await prisma.userAiKey.count({ where: { userId, provider } });
  return `token${count + 1} ${new Date().toISOString().slice(0, 10)}`;
}

export async function saveUserAiKey(userId: string, apiKey: string, provider = "google", alias = "") {
  const trimmed = apiKey.trim();
  const keyPreview = alias.trim() || await nextKeyLabel(userId, provider);
  const data = {
    userId,
    provider,
    encryptedKey: encryptApiKey(trimmed),
    keyPreview,
    status: "active",
    lastError: null,
  };
  const select = { id: true, provider: true, keyPreview: true, status: true, lastError: true, updatedAt: true };
  try {
    return await prisma.userAiKey.create({ data, select });
  } catch (error) {
    if (!isOldSingleKeyConstraintError(error)) throw error;
    await ensureMultipleAiKeysAllowed();
    return prisma.userAiKey.create({ data, select });
  }
}

export async function markUserAiKeyLimited(keyId: string, message: string) {
  await prisma.userAiKey.update({
    where: { id: keyId },
    data: { status: "limited", lastError: message },
  });
}
