import { z } from "zod";

// Reusable schemas
const linkSchema = z.object({
  type: z.enum(["ticket", "custom"]).default("custom"),
  title: z.string(),
  url: z.string().url("Invalid URL")
});

// Resource Schema
export const resourceSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Resource name is required"),
  description: z.string().min(1, "Description is required"),
  contact: z.string().min(1, "Contact details are required"),
  link: linkSchema, //TODO: make this optional, issues with binding to input
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
});

// Space Schema
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
  type: z.enum(["physical", "gps", "virtual"]),
  name: z.string().min(1, "Space name is required"),
  location: z.union([physicalLocationSchema, gpsLocationSchema, virtualLocationSchema]),
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
    ),
    z.literal("always")
  ]),
  multiBookable: z.boolean(),
});


// Schema types for zod
export type ResourceSchema = typeof resourceSchema;
export type SpaceSchema = typeof spaceSchema;