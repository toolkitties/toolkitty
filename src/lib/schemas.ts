import { z } from "zod";

// Reusable schemas
const linkSchema = z.object({
  title: z.string().nullable(),
  type: z.enum(["ticket", "custom"]).default("custom"),
  url: z.string().url("Invalid URL")
});

const imageSchema = z.string();

const timeSpanSchema = z.object({
  start: z.date(),
  end: z.date(),
});

// Resource form Schema
export const resourceSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Resource name is required"),
  description: z.string().min(1, "Description is required"),
  contact: z.string().min(1, "Contact details are required"),
  link: linkSchema, //TODO: make this optional, issues with binding to input
  images: z.array(imageSchema),
  availability: z.union([
    z.literal("always"),
    z.array(timeSpanSchema).min(1, "At least one availability date is required.")
  ]).default([]),
  multiBookable: z.boolean(),
});

// Space form Schema
const physicalLocationSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string() // TODO: ISO 3166
})

const gpsLocationSchema = z.object({
  lat: z.string(),
  lon: z.string(),
});

const virtualLocationSchema = z.string().url("Invalid URL");

export const spaceSchema = z.object({
  id: z.string(),
  type: z.enum(["physical", "gps", "virtual"]).nullable().default(null),
  name: z.string().min(1, "Space name is required"),
  location: z.union([physicalLocationSchema, gpsLocationSchema, virtualLocationSchema]).default('' as string),
  capacity: z.number().optional(),
  accessibilityDetails: z.string().min(1, "Accessibility details are required"),
  description: z.string().min(1, "Space description is required"),
  contactDetails: z.string().min(1, "Contact details are required"),
  link: linkSchema, //TODO: make this optional, issues with binding to input
  message: z.string().optional(),
  availability: z.union([
    z.array(
      z.object({
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      })
    ).min(1, "At least one availability date is required."),
    z.literal("always")
  ]).default([]),
  multiBookable: z.boolean(),
}).refine(data => {
  if (data.type === 'physical') {
    return physicalLocationSchema.safeParse(data.location).success;
  } else if (data.type === 'gps') {
    return gpsLocationSchema.safeParse(data.location).success;
  } else if (data.type === 'virtual') {
    return virtualLocationSchema.safeParse(data.location).success;
  }
  return false
}, {
  message: "Invalid location for the specified type",
  path: ["location"]
}).refine(data => data.type !== null, {
  message: "Type must be set",
  path: ["type"]
});

// Event form schema
export const eventSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Event name is required"),
  description: z.string().min(1, "Event description is required"),
  startDate: z.string().min(1, "Event start date is required"),
  endDate: z.string().min(1, "Event start time is required"),
  publicStartDate: z.string(),
  eventEndTime: z.string(),
  resources: z.array(z.string()).optional(),
  link: z.array(linkSchema),
});

// Schema types for zod
export type ResourceSchema = typeof resourceSchema;
export type SpaceSchema = typeof spaceSchema;
export type EventSchema = typeof eventSchema;