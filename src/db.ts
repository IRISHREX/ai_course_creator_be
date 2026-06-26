import mongoose, { Schema, Types } from "mongoose";
import { randomUUID } from "node:crypto";
import { env } from "./env.js";

type AnyRecord = Record<string, any>;

const jsonDefault = (value: unknown) => () => structuredClone(value);
const id = () => randomUUID();
const relationIdKeys = new Set(["id", "_id", "courseId", "topicId", "userId", "pyqId", "createdBy"]);

const baseOptions = {
  id: false,
  versionKey: false as false,
  timestamps: false,
  toJSON: { virtuals: false },
  toObject: { virtuals: false },
};

const userSchema = new Schema({
  _id: { type: Schema.Types.Mixed, default: id },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  displayName: String,
  createdAt: { type: Date, default: Date.now },
}, baseOptions);

const userAiKeySchema = new Schema({
  _id: { type: Schema.Types.Mixed, default: id },
  userId: { type: Schema.Types.Mixed, required: true, index: true },
  provider: { type: String, default: "google" },
  encryptedKey: { type: String, required: true },
  keyPreview: String,
  status: { type: String, default: "active", index: true },
  lastError: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { ...baseOptions, timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } });

const userRoleSchema = new Schema({
  _id: { type: Schema.Types.Mixed, default: id },
  userId: { type: Schema.Types.Mixed, required: true, index: true },
  role: { type: String, required: true, enum: ["user", "admin", "super_admin"] },
  createdAt: { type: Date, default: Date.now },
}, baseOptions);
userRoleSchema.index({ userId: 1, role: 1 }, { unique: true });

const courseSchema = new Schema({
  _id: { type: Schema.Types.Mixed, default: id },
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  coverEmoji: { type: String, default: "\uD83D\uDCE1" },
  orderIndex: { type: Number, default: 0 },
  sourceText: String,
  generationStatus: { type: String, default: "ready" },
  tags: { type: Schema.Types.Mixed, default: jsonDefault([]) },
  mindmap: Schema.Types.Mixed,
  toc: { type: Schema.Types.Mixed, default: jsonDefault([]) },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { ...baseOptions, timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } });

const topicSchema = new Schema({
  _id: { type: Schema.Types.Mixed, default: id },
  courseId: { type: Schema.Types.Mixed, required: true, index: true },
  slug: { type: String, required: true, unique: true },
  unit: { type: Number, required: true },
  orderIndex: { type: Number, required: true },
  title: { type: String, required: true },
  summary: { type: String, default: "" },
  content: { type: Schema.Types.Mixed, default: jsonDefault([]) },
  translations: { type: Schema.Types.Mixed, default: jsonDefault([]) },
  quiz: { type: Schema.Types.Mixed, default: jsonDefault([]) },
  mindmap: Schema.Types.Mixed,
  visualization: String,
  difficultyLevel: { type: Number, default: 5 },
  generationStatus: { type: String, default: "ready" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { ...baseOptions, timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } });

const topicVersionSchema = new Schema({
  _id: { type: Schema.Types.Mixed, default: id },
  topicId: { type: Schema.Types.Mixed, required: true, index: true },
  title: { type: String, required: true },
  summary: { type: String, default: "" },
  content: { type: Schema.Types.Mixed, default: jsonDefault([]) },
  quiz: { type: Schema.Types.Mixed, default: jsonDefault([]) },
  mindmap: Schema.Types.Mixed,
  visualization: String,
  note: String,
  createdBy: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
}, baseOptions);

const bookmarkSchema = new Schema({
  _id: { type: Schema.Types.Mixed, default: id },
  userId: { type: Schema.Types.Mixed, required: true, index: true },
  topicId: { type: Schema.Types.Mixed, required: true, index: true },
  courseId: { type: Schema.Types.Mixed, required: true, index: true },
  pageIndex: { type: Number, default: 0 },
  wordIndex: { type: Number, default: 0 },
  label: String,
  createdAt: { type: Date, default: Date.now },
}, baseOptions);

const topicProgressSchema = new Schema({
  _id: { type: Schema.Types.Mixed, default: id },
  userId: { type: Schema.Types.Mixed, required: true, index: true },
  topicId: { type: Schema.Types.Mixed, required: true, index: true },
  viewed: { type: Boolean, default: false },
  passed: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  bestQuizScore: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
}, { ...baseOptions, timestamps: { createdAt: false, updatedAt: "updatedAt" } });
topicProgressSchema.index({ userId: 1, topicId: 1 }, { unique: true });

const coursePyqSchema = new Schema({
  _id: { type: Schema.Types.Mixed, default: id },
  courseId: { type: Schema.Types.Mixed, required: true, index: true },
  topicId: Schema.Types.Mixed,
  question: { type: String, required: true },
  answer: { type: String, default: "" },
  marks: Number,
  year: Number,
  source: String,
  ingestionSource: { type: String, default: "manual" },
  orderIndex: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { ...baseOptions, timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } });

const pyqTopicSchema = new Schema({
  _id: { type: Schema.Types.Mixed, default: id },
  pyqId: { type: Schema.Types.Mixed, required: true, index: true },
  topicId: { type: Schema.Types.Mixed, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
}, baseOptions);
pyqTopicSchema.index({ pyqId: 1, topicId: 1 }, { unique: true });

const models: Record<string, any> = {
  user: mongoose.model("User", userSchema, "users"),
  userAiKey: mongoose.model("UserAiKey", userAiKeySchema, "user_ai_keys"),
  userRole: mongoose.model("UserRole", userRoleSchema, "user_roles"),
  course: mongoose.model("Course", courseSchema, "courses"),
  topic: mongoose.model("Topic", topicSchema, "topics"),
  topicVersion: mongoose.model("TopicVersion", topicVersionSchema, "topic_versions"),
  bookmark: mongoose.model("Bookmark", bookmarkSchema, "bookmarks"),
  topicProgress: mongoose.model("TopicProgress", topicProgressSchema, "topic_progress"),
  coursePyq: mongoose.model("CoursePyq", coursePyqSchema, "course_pyq"),
  pyqTopic: mongoose.model("PyqTopic", pyqTopicSchema, "pyq_topics"),
};

function plain(value: any): any {
  if (!value) return value;
  const item = typeof value.toObject === "function" ? value.toObject() : { ...value };
  item.id = item.id || (item._id != null ? String(item._id) : item._id);
  delete item._id;
  delete item.__v;
  return item;
}

function idCandidates(value: unknown) {
  if (typeof value !== "string") return [value];
  if (!Types.ObjectId.isValid(value)) return [value];
  return [value, new Types.ObjectId(value)];
}

function idCriteria(value: unknown) {
  const candidates = idCandidates(value);
  return candidates.length === 1 ? candidates[0] : { $in: candidates };
}

async function findRawById(model: any, value: unknown) {
  return model.collection.findOne({ _id: idCriteria(value) });
}

function selectFields(item: AnyRecord | null, select?: AnyRecord) {
  if (!item) return item;
  if (!select) return item;
  const selected: AnyRecord = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled === true) selected[key] = item[key];
  }
  return selected;
}

function sanitizeData<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => sanitizeData(item)) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, sanitizeData(entry)])
  ) as T;
}

function mongoWhere(where: AnyRecord = {}): AnyRecord {
  const query: AnyRecord = {};
  for (const [key, value] of Object.entries(where)) {
    const targetKey = key === "id" ? "_id" : key;

    if (key === "OR" && Array.isArray(value)) {
      query.$or = value.map(mongoWhere);
    } else if (value && typeof value === "object" && "contains" in value) {
      query[targetKey] = { $regex: String(value.contains).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    } else if (value && typeof value === "object" && "in" in value && Array.isArray(value.in)) {
      query[targetKey] = { $in: relationIdKeys.has(key) ? value.in.flatMap(idCandidates) : value.in };
    } else if (key !== "topicLinks" && key !== "pyq") {
      query[targetKey] = relationIdKeys.has(key) ? idCriteria(value) : value;
    }
  }
  return query;
}

function sortBy(orderBy?: AnyRecord | AnyRecord[]) {
  const entries = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  return Object.fromEntries(entries.flatMap((item) => Object.entries(item).map(([key, value]) => [key, value === "desc" ? -1 : 1])));
}

async function relationFilteredIds(modelName: string, where: AnyRecord = {}) {
  if (modelName === "coursePyq" && where.topicLinks?.some?.topicId) {
    const links = await models.pyqTopic.find({ topicId: idCriteria(where.topicLinks.some.topicId) }).lean();
    return links.map((link: AnyRecord) => link.pyqId);
  }
  if (modelName === "pyqTopic" && where.pyq?.courseId) {
    const pyqs = await models.coursePyq.find({ courseId: idCriteria(where.pyq.courseId) }, { _id: 1 }).lean();
    return pyqs.map((pyq: AnyRecord) => pyq._id);
  }
  return null;
}

async function includeRelations(modelName: string, items: AnyRecord[], include?: AnyRecord, select?: AnyRecord) {
  if (!items.length) return items;

  const relationSelect = { ...select };
  for (const key of Object.keys(relationSelect)) {
    if (relationSelect[key] !== true) delete relationSelect[key];
  }

  let out: AnyRecord[] = items.map((item) => selectFields(item, Object.keys(relationSelect).length ? relationSelect : undefined) as AnyRecord);

  if ((select?.roles || include?.roles) && modelName === "user") {
    const ids = items.map((item) => item.id);
    const roles = (await models.userRole.find({ userId: { $in: ids.flatMap(idCandidates) } }).lean()).map(plain);
    out = out.map((item) => ({ ...item, roles: roles.filter((role: any) => role.userId === item.id) }));
  }

  if (include?.topicLinks && modelName === "coursePyq") {
    const ids = items.map((item) => item.id);
    const links = (await models.pyqTopic.find({ pyqId: { $in: ids.flatMap(idCandidates) } }).sort({ createdAt: 1 }).lean()).map(plain);
    let topics: AnyRecord[] = [];
    if (include.topicLinks.include?.topic) {
      topics = (await models.topic.find({ _id: { $in: links.flatMap((link: any) => idCandidates(link.topicId)) } }).lean()).map(plain);
    }
    out = out.map((item) => ({
      ...item,
      topicLinks: links.filter((link: any) => link.pyqId === item.id).map((link: any) => ({
        ...link,
        ...(include.topicLinks.include?.topic
          ? { topic: selectFields(topics.find((topic: any) => topic.id === link.topicId) || null, include.topicLinks.include.topic.select) }
          : {}),
      })),
    }));
  }

  if (include?.pyq && modelName === "pyqTopic") {
    const pyqs = (await models.coursePyq.find({ _id: { $in: items.flatMap((item) => idCandidates(item.pyqId)) } }).lean()).map(plain);
    out = out.map((item) => ({ ...item, pyq: pyqs.find((pyq: any) => pyq.id === item.pyqId) || null }));
  }

  return out;
}

async function cascadeDelete(modelName: string, idValue: string) {
  if (modelName === "user") {
    await Promise.all([
      models.userRole.deleteMany({ userId: idCriteria(idValue) }),
      models.userAiKey.deleteMany({ userId: idCriteria(idValue) }),
      models.bookmark.deleteMany({ userId: idCriteria(idValue) }),
      models.topicProgress.deleteMany({ userId: idCriteria(idValue) }),
    ]);
  }
  if (modelName === "course") {
    const topics = await models.topic.find({ courseId: idCriteria(idValue) }, { _id: 1 }).lean();
    const pyqs = await models.coursePyq.find({ courseId: idCriteria(idValue) }, { _id: 1 }).lean();
    await Promise.all([
      models.topic.deleteMany({ courseId: idCriteria(idValue) }),
      models.coursePyq.deleteMany({ courseId: idCriteria(idValue) }),
      models.topicVersion.deleteMany({ topicId: { $in: topics.map((topic: AnyRecord) => topic._id) } }),
      models.bookmark.deleteMany({ courseId: idCriteria(idValue) }),
      models.topicProgress.deleteMany({ topicId: { $in: topics.map((topic: AnyRecord) => topic._id) } }),
      models.pyqTopic.deleteMany({ $or: [{ topicId: { $in: topics.map((topic: AnyRecord) => topic._id) } }, { pyqId: { $in: pyqs.map((pyq: AnyRecord) => pyq._id) } }] }),
    ]);
  }
  if (modelName === "topic") {
    await Promise.all([
      models.topicVersion.deleteMany({ topicId: idCriteria(idValue) }),
      models.bookmark.deleteMany({ topicId: idCriteria(idValue) }),
      models.topicProgress.deleteMany({ topicId: idCriteria(idValue) }),
      models.pyqTopic.deleteMany({ topicId: idCriteria(idValue) }),
    ]);
  }
  if (modelName === "coursePyq") {
    await models.pyqTopic.deleteMany({ pyqId: idCriteria(idValue) });
  }
}

function notFound() {
  throw new Error("Not found");
}

function delegate(modelName: string) {
  const model = models[modelName];

  return {
    async findMany(args: AnyRecord = {}) {
      const where = { ...(args.where || {}) };
      const relatedIds = await relationFilteredIds(modelName, where);
      delete where.topicLinks;
      delete where.pyq;
      const criteria = mongoWhere(where);
      if (relatedIds) {
        if (modelName === "coursePyq") criteria._id = { $in: relatedIds };
        if (modelName === "pyqTopic") criteria.pyqId = { $in: relatedIds };
      }
      const query = model.find(criteria).sort(sortBy(args.orderBy));
      if (args.take) query.limit(args.take);
      const items = (await query.lean()).map(plain);
      return includeRelations(modelName, items, args.include, args.select);
    },
    async findUnique(args: AnyRecord) {
      const where = args.where || {};
      const [key, value] = Object.entries(where)[0] || [];
      if (!key) return null;
      const found = key === "id"
        ? await findRawById(model, value)
        : await model.findOne({ [key]: value }).lean();
      if (!found) return null;
      return (await includeRelations(modelName, [plain(found)], args.include, args.select))[0];
    },
    async create(args: AnyRecord) {
      const data = sanitizeData({ ...(args.data || {}) });
      const nestedRoles = data.roles?.create || [];
      const nestedTopicLinks = data.topicLinks?.create || [];
      delete data.roles;
      delete data.topicLinks;
      const created = plain(await model.create(data));
      if (modelName === "user" && nestedRoles.length) {
        await models.userRole.insertMany(nestedRoles.map((role: AnyRecord) => ({ ...role, userId: created.id })), { ordered: false }).catch(() => undefined);
      }
      if (modelName === "coursePyq" && nestedTopicLinks.length) {
        await models.pyqTopic.insertMany(nestedTopicLinks.map((link: AnyRecord) => ({ ...link, pyqId: created.id })), { ordered: false }).catch(() => undefined);
      }
      return selectFields(created, args.select);
    },
    async createMany(args: AnyRecord) {
      const data = Array.isArray(args.data) ? args.data : [];
      let count = 0;
      for (const item of data) {
        try {
          await model.create(item);
          count += 1;
        } catch (error: any) {
          if (!args.skipDuplicates || error?.code !== 11000) throw error;
        }
      }
      return { count };
    },
    async update(args: AnyRecord) {
      let updated: AnyRecord | null = null;
      if (args.where?.id) {
        const existing = await findRawById(model, args.where.id);
        if (!existing) notFound();
        await model.collection.updateOne({ _id: existing._id }, { $set: sanitizeData(args.data || {}) });
        updated = await model.collection.findOne({ _id: existing._id });
      } else {
        updated = await model.findOneAndUpdate(mongoWhere(args.where), { $set: sanitizeData(args.data || {}) }, { new: true, runValidators: true }).lean();
      }
      if (!updated) notFound();
      return selectFields(plain(updated), args.select);
    },
    async delete(args: AnyRecord) {
      const found = args.where?.id
        ? await findRawById(model, args.where.id)
        : await model.findOne(mongoWhere(args.where)).lean();
      if (!found) notFound();
      const item = plain(found);
      await model.collection.deleteOne({ _id: found._id });
      await cascadeDelete(modelName, item.id);
      return item;
    },
    async deleteMany(args: AnyRecord = {}) {
      const found = await model.find(mongoWhere(args.where || {}), { _id: 1 }).lean();
      const result = await model.deleteMany(mongoWhere(args.where || {}));
      await Promise.all(found.map((item: AnyRecord) => cascadeDelete(modelName, item._id)));
      return { count: result.deletedCount || 0 };
    },
    async upsert(args: AnyRecord) {
      const where = args.where || {};
      const composite = where.userId_topicId || where.userId_role || where.pyqId_topicId;
      const criteria = composite ? mongoWhere(composite) : mongoWhere(where);
      const update = sanitizeData(args.update || {});
      const create = sanitizeData(args.create || {});
      const createOnlyEntries = Object.entries(create).filter(([key]) => !(key in update));
      const updateDoc: AnyRecord = {};
      if (Object.keys(update).length) updateDoc.$set = update;
      if (createOnlyEntries.length) updateDoc.$setOnInsert = Object.fromEntries(createOnlyEntries);
      const updated = await model.findOneAndUpdate(criteria, updateDoc, { new: true, upsert: true, runValidators: true }).lean();
      return plain(updated);
    },
    async count(args: AnyRecord = {}) {
      return model.countDocuments(mongoWhere(args.where || {}));
    },
  };
}

export const prisma: any = {
  user: delegate("user"),
  userAiKey: delegate("userAiKey"),
  userRole: delegate("userRole"),
  course: delegate("course"),
  topic: delegate("topic"),
  topicVersion: delegate("topicVersion"),
  bookmark: delegate("bookmark"),
  topicProgress: delegate("topicProgress"),
  coursePyq: delegate("coursePyq"),
  pyqTopic: delegate("pyqTopic"),
  async $connect() {
    await mongoose.connect(env.DATABASE_URL);
  },
  async $disconnect() {
    await mongoose.disconnect();
  },
  async $queryRaw() {
    if (mongoose.connection.readyState !== 1) await mongoose.connect(env.DATABASE_URL);
    await mongoose.connection.db?.admin().ping();
    return [{ ok: 1 }];
  },
  async $executeRawUnsafe() {
    return 0;
  },
  async $transaction<T>(input: Promise<T>[] | ((tx: typeof prisma) => Promise<T>)) {
    if (Array.isArray(input)) return Promise.all(input);
    return input(prisma);
  },
};
