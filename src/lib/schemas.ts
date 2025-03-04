import { z } from "zod";

export const resourceSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Resource name is required"),
  description: z.string().min(1, "Description is required"),
  contact: z.string().min(1, "Contact details are required"),
  linkText: z.string().optional(),
  linkUrl: z.string().url("Invalid URL").optional(),
  alwaysAvailable: z.boolean(),
  multiBookable: z.boolean(),
  availability: z.array(
    z.object({
      date: z.string(),
      startTime: z.string(),
      endTime: z.string(),
    })
  ).optional(),
});

export type ResourceSchema = typeof resourceSchema;
