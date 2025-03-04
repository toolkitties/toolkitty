import { z } from "zod";

export const resourceSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Resource name is required"),
  description: z.string().min(1, "Description is required"),
  contact: z.string().min(1, "Contact details are required"),
  linkText: z.string().optional(),
  linkUrl: z.string().url("Invalid URL").optional(),
  availability: z.union([
    z.array(
      z.object({
        start: z.string(),
        end: z.string(),
      })
    ),
    z.literal("always")
  ]).default([]),
  multiBookable: z.boolean(),
});

export type ResourceSchema = typeof resourceSchema;
