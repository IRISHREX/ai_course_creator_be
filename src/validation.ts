import type { Request } from "express";
import { z } from "zod";

const objectIdPattern = /^[0-9a-f]{24}$/i;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const RecordId = z.string().trim().refine((value) => (
  objectIdPattern.test(value) || uuidPattern.test(value)
), "Expected a Mongo ObjectId or UUID.");

export const IdParam = z.object({ id: RecordId });
export const SlugParam = z.object({ slug: z.string().min(1).max(220) });

export function body<T extends z.ZodTypeAny>(schema: T, req: Request): z.infer<T> {
  return schema.parse(req.body);
}

export function params<T extends z.ZodTypeAny>(schema: T, req: Request): z.infer<T> {
  return schema.parse(req.params);
}

export function query<T extends z.ZodTypeAny>(schema: T, req: Request): z.infer<T> {
  return schema.parse(req.query);
}
