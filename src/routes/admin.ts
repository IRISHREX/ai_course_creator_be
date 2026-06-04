import { Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { body, IdParam, params, query } from "../validation.js";

export const adminRouter = Router();

adminRouter.get("/stats", requireAuth, requireRole("admin", "super_admin"), async (_req, res) => {
  const [users, courses, topics, pyqs] = await Promise.all([
    prisma.user.count(), prisma.course.count(),
    prisma.topic.count(), prisma.coursePyq.count(),
  ]);
  res.json({ users, courses, topics, pyqs });
});

const BackupQuery = z.object({
  format: z.enum(["sql", "json", "dictionary", "pdf", "docs"]).default("json"),
});

type BackupTable = {
  name: string;
  rows: Record<string, unknown>[];
};

const backupTables = [
  { name: "users", columns: ["id", "email", "display_name", "created_at"] },
  { name: "user_roles", columns: ["id", "user_id", "role", "created_at"] },
  { name: "courses", columns: ["id", "slug", "title", "description", "cover_emoji", "order_index", "source_text", "generation_status", "tags", "mindmap", "toc", "created_at", "updated_at"] },
  { name: "topics", columns: ["id", "course_id", "slug", "unit", "order_index", "title", "summary", "content", "translations", "quiz", "mindmap", "visualization", "difficulty_level", "generation_status", "created_at", "updated_at"] },
  { name: "topic_versions", columns: ["id", "topic_id", "title", "summary", "content", "quiz", "mindmap", "visualization", "note", "created_by", "created_at"] },
  { name: "bookmarks", columns: ["id", "user_id", "topic_id", "course_id", "page_index", "word_index", "label", "created_at"] },
  { name: "topic_progress", columns: ["id", "user_id", "topic_id", "viewed", "passed", "attempts", "best_quiz_score", "updated_at"] },
  { name: "course_pyq", columns: ["id", "course_id", "topic_id", "question", "answer", "marks", "year", "source", "ingestion_source", "order_index", "created_at", "updated_at"] },
  { name: "pyq_topics", columns: ["id", "pyq_id", "topic_id", "created_at"] },
] as const;

function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : value;
}

function row(entries: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, toIso(value)]));
}

async function getBackupTables(): Promise<BackupTable[]> {
  const [users, roles, courses, topics, versions, bookmarks, progress, pyqs, pyqTopics] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, email: true, displayName: true, createdAt: true } }),
    prisma.userRole.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.course.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.topic.findMany({ orderBy: [{ courseId: "asc" }, { unit: "asc" }, { orderIndex: "asc" }] }),
    prisma.topicVersion.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.bookmark.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.topicProgress.findMany({ orderBy: { updatedAt: "asc" } }),
    prisma.coursePyq.findMany({ orderBy: [{ courseId: "asc" }, { orderIndex: "asc" }] }),
    prisma.pyqTopic.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return [
    { name: "users", rows: users.map((item) => row({ id: item.id, email: item.email, display_name: item.displayName, created_at: item.createdAt })) },
    { name: "user_roles", rows: roles.map((item) => row({ id: item.id, user_id: item.userId, role: item.role, created_at: item.createdAt })) },
    { name: "courses", rows: courses.map((item) => row({ id: item.id, slug: item.slug, title: item.title, description: item.description, cover_emoji: item.coverEmoji, order_index: item.orderIndex, source_text: item.sourceText, generation_status: item.generationStatus, tags: item.tags, mindmap: item.mindmap, toc: item.toc, created_at: item.createdAt, updated_at: item.updatedAt })) },
    { name: "topics", rows: topics.map((item) => row({ id: item.id, course_id: item.courseId, slug: item.slug, unit: item.unit, order_index: item.orderIndex, title: item.title, summary: item.summary, content: item.content, translations: (item as any).translations || [], quiz: item.quiz, mindmap: item.mindmap, visualization: item.visualization, difficulty_level: item.difficultyLevel, generation_status: item.generationStatus, created_at: item.createdAt, updated_at: item.updatedAt })) },
    { name: "topic_versions", rows: versions.map((item) => row({ id: item.id, topic_id: item.topicId, title: item.title, summary: item.summary, content: item.content, quiz: item.quiz, mindmap: item.mindmap, visualization: item.visualization, note: item.note, created_by: item.createdBy, created_at: item.createdAt })) },
    { name: "bookmarks", rows: bookmarks.map((item) => row({ id: item.id, user_id: item.userId, topic_id: item.topicId, course_id: item.courseId, page_index: item.pageIndex, word_index: item.wordIndex, label: item.label, created_at: item.createdAt })) },
    { name: "topic_progress", rows: progress.map((item) => row({ id: item.id, user_id: item.userId, topic_id: item.topicId, viewed: item.viewed, passed: item.passed, attempts: item.attempts, best_quiz_score: item.bestQuizScore, updated_at: item.updatedAt })) },
    { name: "course_pyq", rows: pyqs.map((item) => row({ id: item.id, course_id: item.courseId, topic_id: item.topicId, question: item.question, answer: item.answer, marks: item.marks, year: item.year, source: item.source, ingestion_source: item.ingestionSource, order_index: item.orderIndex, created_at: item.createdAt, updated_at: item.updatedAt })) },
    { name: "pyq_topics", rows: pyqTopics.map((item) => row({ id: item.id, pyq_id: item.pyqId, topic_id: item.topicId, created_at: item.createdAt })) },
  ];
}

function sqlValue(value: unknown): string {
  if (value === null || typeof value === "undefined") return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `'${text.replace(/'/g, "''")}'`;
}

function buildSql(tables: BackupTable[]) {
  const chunks = [
    "-- AI Course Creator data backup",
    `-- Generated at ${new Date().toISOString()}`,
    "-- Secrets such as password hashes and AI keys are intentionally excluded.",
    "",
    "BEGIN;",
  ];

  for (const table of tables) {
    const meta = backupTables.find((item) => item.name === table.name);
    const columns = meta?.columns || Object.keys(table.rows[0] || {});
    chunks.push("", `-- ${table.name}: ${table.rows.length} row(s)`);
    if (!table.rows.length) continue;
    const columnList = columns.map((column) => `"${column}"`).join(", ");
    for (const item of table.rows) {
      chunks.push(`INSERT INTO "${table.name}" (${columnList}) VALUES (${columns.map((column) => sqlValue(item[column])).join(", ")});`);
    }
  }

  chunks.push("", "COMMIT;", "");
  return chunks.join("\n");
}

function buildDictionary(tables: BackupTable[]) {
  return Object.fromEntries(tables.map((table) => [
    table.name,
    Object.fromEntries(table.rows.map((item, index) => [String(item.id || index), item])),
  ]));
}

function textFromTables(tables: BackupTable[]) {
  return [
    "AI Course Creator Data Backup",
    `Generated: ${new Date().toISOString()}`,
    "Secrets such as password hashes and AI keys are intentionally excluded.",
    "",
    ...tables.flatMap((table) => [
      table.name.toUpperCase(),
      `${table.rows.length} row(s)`,
      ...table.rows.slice(0, 100).map((item) => JSON.stringify(item)),
      table.rows.length > 100 ? `...${table.rows.length - 100} more row(s)` : "",
      "",
    ]),
  ].filter(Boolean).join("\n");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildDocs(tables: BackupTable[]) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Data Backup</title></head><body><pre>${escapeHtml(textFromTables(tables))}</pre></body></html>`;
}

function buildPdf(tables: BackupTable[]) {
  const lines = textFromTables(tables).split("\n").slice(0, 180);
  const escaped = lines.map((line) => line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"));
  const content = ["BT", "/F1 9 Tf", "36 806 Td", "12 TL", ...escaped.map((line) => `(${line.slice(0, 105)}) Tj T*`), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body, "latin1");
}

function sendBackup(res: Response, filename: string, type: string, body: string | Buffer) {
  res.setHeader("Content-Type", type);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(body);
}

adminRouter.get("/backup", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const { format } = query(BackupQuery, req);
  const tables = await getBackupTables();
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const base = `ai_course_creator_backup_${stamp}`;

  if (format === "sql") return sendBackup(res, `${base}.sql`, "application/sql; charset=utf-8", buildSql(tables));
  if (format === "dictionary") return sendBackup(res, `${base}.dictionary.json`, "application/json; charset=utf-8", JSON.stringify({ generatedAt: new Date().toISOString(), tables: buildDictionary(tables) }, null, 2));
  if (format === "pdf") return sendBackup(res, `${base}.pdf`, "application/pdf", buildPdf(tables));
  if (format === "docs") return sendBackup(res, `${base}.doc`, "application/msword; charset=utf-8", buildDocs(tables));
  return sendBackup(res, `${base}.json`, "application/json; charset=utf-8", JSON.stringify({ generatedAt: new Date().toISOString(), tables }, null, 2));
});

adminRouter.get("/users", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { q } = query(z.object({ q: z.string().max(120).optional().default("") }), req);
  const search = q.toLowerCase();
  const users = await prisma.user.findMany({
    where: search ? { OR: [{ email: { contains: search } }, { displayName: { contains: search } }] } : {},
    select: {
      id: true,
      email: true,
      displayName: true,
      createdAt: true,
      roles: { select: { id: true, role: true, createdAt: true, userId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ users });
});

const RoleBody = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "super_admin"]),
  grant: z.boolean(),
});

adminRouter.post("/roles", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { userId, role, grant } = body(RoleBody, req);
  if (grant) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId, role } },
      update: {}, create: { userId, role },
    });
  } else {
    await prisma.userRole.deleteMany({ where: { userId, role } });
  }
  res.json({ ok: true });
});

adminRouter.delete("/users/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { id } = params(IdParam, req);
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});
