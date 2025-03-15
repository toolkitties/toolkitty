import { z } from "zod";

// Reusable schemas
const linkSchema = z.object({
  title: z.string().nullable(),
  type: z.enum(["ticket", "custom"]).default("custom"),
  url: z.string().url("Invalid URL"),
});

const imageSchema = z.string();

const timeSpanSchema = z.object({
  start: z.date(),
  end: z.date(),
});

const availabilitySchema = z
  .union([
    z.literal("always"),
    z
      .array(timeSpanSchema)
      .min(1, "At least one availability date is required."),
  ])
  .default([]);

// Resource form Schema
export const resourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Resource name is required"),
  description: z.string().min(1, "Description is required"),
  contact: z.string().min(1, "Contact details are required"),
  link: linkSchema, //TODO: make this optional, issues with binding to input
  images: z.array(imageSchema),
  availability: availabilitySchema,
  multiBookable: z.boolean(),
});

// Space form Schema
const physicalLocationSchema = z.object({
  type: z.literal("physical"),
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string(), // TODO: ISO 3166
});

const gpsLocationSchema = z.object({
  type: z.literal("gps"),
  lat: z.string(),
  lon: z.string(),
});

const virtualLocationSchema = z.object({
  type: z.literal("virtual"),
  link: z.string().url("Invalid URL"),
});

export const spaceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Space name is required"),
  location: z
    .discriminatedUnion("type", [
      physicalLocationSchema,
      gpsLocationSchema,
      virtualLocationSchema,
    ])
    .default({
      type: "physical",
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "",
    }),
  capacity: z.number().nullable(),
  accessibility: z.string().min(1, "Accessibility details are required"),
  description: z.string().min(1, "Space description is required"),
  contact: z.string().min(1, "Contact details are required"),
  link: linkSchema, //TODO: make this optional, issues with binding to input
  messageForRequesters: z.string().min(1, "Contact details are required"),
  images: z.array(imageSchema),
  availability: availabilitySchema,
  multiBookable: z.boolean(),
});

// Event form schema
export const eventSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Event name is required"),
  description: z.string().min(1, "Event description is required"),
  startDate: z.string().min(1, "Access start time is required"),
  endDate: z.string().min(1, "Access end time is required"),
  publicStartDate: z.string().min(1, "Event start time is required"),
  publicEndDate: z.string(),
  resourceRequests: z.array(z.string()).optional(),
  links: z
    .array(linkSchema)
    .optional()
    .default([
      { title: "", type: "ticket", url: "" },
      { title: "", type: "custom", url: "" },
    ]),
  selectedSpace: z.string().min(1, "Please select a space first."),
  images: z.array(imageSchema),
});

// Calendar schema
export const calendarSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Calendar name is required"),
  userName: z.string().optional(),
  dates: z
    .array(timeSpanSchema)
    .min(1, "A start date is required")
    .default([{ start: new Date(), end: new Date() }]),
  calendarInstructions: z.string().nullable(),
  spacePageText: z.string().nullable(),
  resourcePageText: z.string().nullable(),
}).refine(data => data.id || data.userName, {
  message: "Name is required",
  path: ["userName"],
});

// Schema types for zod
export type ResourceSchema = typeof resourceSchema;
export type SpaceSchema = typeof spaceSchema;
export type EventSchema = typeof eventSchema;
export type CalendarSchema = typeof calendarSchema;
