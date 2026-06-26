import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { signToken, requireAuth, AuthedRequest } from "../auth.js";
import { env } from "../env.js";
import { HttpError } from "../http.js";
import { body } from "../validation.js";

export const authRouter = Router();

authRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  next();
});

const Creds = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  displayName: z.string().min(1).max(120).optional(),
});

async function ensureBootstrapRoles(userId: string, email: string) {
  const roles = [{ userId, role: "user" }, ...(env.SUPER_ADMIN_EMAILS.includes(email)
    ? [{ userId, role: "admin" }, { userId, role: "super_admin" }]
    : [])];

  await prisma.userRole.createMany({
    data: roles,
    skipDuplicates: true,
  });
}

authRouter.post("/signup", async (req, res) => {
  const { email, password, displayName } = body(Creds, req);
  const lower = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (existing) throw new HttpError(409, "Email already in use", "EMAIL_IN_USE");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: lower,
      passwordHash,
      displayName: displayName || lower.split("@")[0],
      roles: { create: [{ role: "user" }] },
    },
  });

  await ensureBootstrapRoles(user.id, lower);

  const token = signToken({ sub: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName } });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = body(Creds.pick({ email: true, password: true }), req);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");

  const passwordHash = typeof user.passwordHash === "string" ? user.passwordHash : String(user.passwordHash ?? "");
  const ok = await bcrypt.compare(password, passwordHash);
  if (!ok) throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");

  await ensureBootstrapRoles(user.id, user.email);

  const token = signToken({ sub: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName } });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, displayName: true, createdAt: true },
  });
  res.json({ user, roles: req.user!.roles });
});

authRouter.patch("/me", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = body(z.object({ displayName: z.string().min(1).max(120) }), req);
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { displayName: parsed.displayName },
    select: { id: true, email: true, displayName: true, createdAt: true },
  });
  res.json({ user, roles: req.user!.roles });
});
