import { z } from "zod";

export const SCHEMA_VERSION = "v1" as const;

export const SchemaVersionSchema = z.literal(SCHEMA_VERSION);
export const UnitsSchema = z.enum(["imperial", "metric"]);
export const ProjectModeSchema = z.literal("two_channel_sweet_spot");

export const ProjectConstraintsSchema = z
  .object({
    seatLocked: z.boolean(),
    allowNearfieldSuggestions: z.boolean(),
  })
  .strict();

export const OpeningWallSchema = z.enum(["front", "rear", "left", "right"]);
export const OpeningTypeSchema = z.enum(["doorway", "hallway", "open_plan"]);
export const DoorStateSchema = z.enum(["open", "closed"]);

export const OpeningSchema = z
  .object({
    id: z.string().min(1),
    wall: OpeningWallSchema,
    positionAlongWallNorm: z.number().min(0).max(1),
    width: z.number().positive(),
    type: OpeningTypeSchema,
    doorState: DoorStateSchema.optional(),
  })
  .strict()
  .superRefine((opening, ctx) => {
    if (opening.type !== "doorway" && opening.doorState !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "doorState is only valid for doorway openings",
      });
    }
  });

export const MAX_OPENINGS = 5;

export const RoomSchema = z
  .object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    openings: z.array(OpeningSchema).max(MAX_OPENINGS).default([]),
  })
  .strict();

export const PositionSchema = z
  .object({
    x: z.number(),
    y: z.number(),
  })
  .strict();

export const SeatSchema = PositionSchema;

export const MainsSchema = z
  .object({
    enabled: z.boolean(),
    left: PositionSchema,
    right: PositionSchema,
    mainsLowestStrongBassHz: z.number().positive(),
    notes: z.string().optional(),
  })
  .strict();

export const SubModeSchema = z.enum(["sealed", "ported"]);
export const SealedSubPresetSchema = z.enum([
  "Tight & Accurate",
  "Balanced",
  "Warm & Full",
  "Room-Filling",
]);
export const PortedSubPresetSchema = z.enum([
  "Tight & Controlled",
  "Balanced",
  "Deep & Smooth",
  "Big & Bold",
]);
export const SubPresetSchema = z.union([
  SealedSubPresetSchema,
  PortedSubPresetSchema,
]);
export const DirectionSchema = z.enum([
  "front",
  "rear",
  "left",
  "right",
  "down",
]);
export const PortDirectionSchema = z.enum([
  "front",
  "rear",
  "left",
  "right",
  "down",
  "none",
]);

export const SubwooferSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    mode: SubModeSchema,
    preset: SubPresetSchema,
    driverDirection: DirectionSchema,
    portDirection: PortDirectionSchema,
    lowestStrongBassHz: z.number().positive().optional(),
    fbHz: z.number().positive().optional(),
  })
  .strict()
  .superRefine((sub, ctx) => {
    if (sub.mode === "sealed") {
      if (sub.lowestStrongBassHz === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "lowestStrongBassHz is required for sealed mode",
          path: ["lowestStrongBassHz"],
        });
      }
      if (sub.fbHz !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "fbHz is only valid for ported mode",
          path: ["fbHz"],
        });
      }
      if (!SealedSubPresetSchema.safeParse(sub.preset).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "sealed mode preset must be a sealed preset",
          path: ["preset"],
        });
      }
    }

    if (sub.mode === "ported") {
      if (sub.fbHz === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "fbHz is required for ported mode",
          path: ["fbHz"],
        });
      }
      if (sub.lowestStrongBassHz !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "lowestStrongBassHz is only valid for sealed mode",
          path: ["lowestStrongBassHz"],
        });
      }
      if (!PortedSubPresetSchema.safeParse(sub.preset).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ported mode preset must be a ported preset",
          path: ["preset"],
        });
      }
    }
  });

export const TreatmentTypeSchema = z.enum([
  "corner_trap",
  "rear_wall_absorber",
  "thick_panel",
  "tuned_trap",
]);
export const TreatmentStrengthSchema = z.enum(["light", "medium", "heavy"]);
export const CoveragePresetSchema = z.literal("standard");

export const TreatmentSchema = z
  .object({
    id: z.string().min(1),
    type: TreatmentTypeSchema,
    strength: TreatmentStrengthSchema,
    snapZoneId: z.string().min(1),
    coveragePreset: CoveragePresetSchema,
    targetHz: z.number().positive().optional(),
  })
  .strict()
  .superRefine((treatment, ctx) => {
    if (treatment.type === "tuned_trap" && treatment.targetHz === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "targetHz is required for tuned_trap",
        path: ["targetHz"],
      });
    }

    if (treatment.type !== "tuned_trap" && treatment.targetHz !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "targetHz is only valid for tuned_trap",
        path: ["targetHz"],
      });
    }
  });

export const ProjectStateSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    projectId: z.string().min(1),
    name: z.string().min(1),
    units: UnitsSchema,
    mode: ProjectModeSchema,
    constraints: ProjectConstraintsSchema,
    room: RoomSchema,
    seat: SeatSchema,
    mains: MainsSchema,
    subwoofer: SubwooferSchema,
    treatments: z.array(TreatmentSchema),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strict();

export type ProjectState = z.infer<typeof ProjectStateSchema>;
export type ProjectConstraints = z.infer<typeof ProjectConstraintsSchema>;
export type Units = z.infer<typeof UnitsSchema>;
export type ProjectMode = z.infer<typeof ProjectModeSchema>;
export type Opening = z.infer<typeof OpeningSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type Seat = z.infer<typeof SeatSchema>;
export type Mains = z.infer<typeof MainsSchema>;
export type Subwoofer = z.infer<typeof SubwooferSchema>;
export type Treatment = z.infer<typeof TreatmentSchema>;
