import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const studySets = pgTable("study_sets", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  shareCode: text("share_code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  setId: integer("set_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  radiusKm: doublePrecision("radius_km").notNull().default(150),
  region: text("region").notNull().default(""),
  description: text("description").notNull().default(""),
  whyItMatters: text("why_it_matters").notNull().default(""),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  approximate: boolean("approximate").notNull().default(false),
  needsConfirmation: boolean("needs_confirmation").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  // True geographic extent: one or more [south, west, north, east] boxes.
  bboxes: jsonb("bboxes").$type<[number, number, number, number][] | null>(),
  // Ordered [lat, lng] course for linear features (rivers, mountain ranges).
  path: jsonb("path").$type<[number, number][] | null>(),
});

export const progress = pgTable("progress", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  locationId: integer("location_id").notNull(),
  setId: integer("set_id").notNull(),
  mastery: integer("mastery").notNull().default(0), // 0 new, 1 learning, 2 familiar, 3 mastered
  correct: integer("correct").notNull().default(0),
  incorrect: integer("incorrect").notNull().default(0),
  studied: boolean("studied").notNull().default(false),
  lastReviewed: timestamp("last_reviewed"),
});

/**
 * Resumable state for Learn mode, which drills the set in batches
 * (locations 1–10, then 11–20, and so on).
 */
export const learnState = pgTable("learn_state", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  setId: integer("set_id").notNull(),
  batchSize: integer("batch_size").notNull().default(10),
  batchIndex: integer("batch_index").notNull().default(0),
  // locationId -> level reached (0 new, 1 recognized, 2 located, 3 recalled)
  levels: jsonb("levels").$type<Record<string, number>>().notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const testResults = pgTable("test_results", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  setId: integer("set_id").notNull(),
  // Display name shown on the study set's leaderboard.
  playerName: text("player_name").notNull().default("Anonymous"),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  durationSec: integer("duration_sec").notNull(),
  mode: text("mode").notNull().default("mixed"),
  details: jsonb("details")
    .$type<
      {
        locationId: number;
        locationName: string;
        correct: boolean;
        userAnswer: string;
        distanceKm?: number;
        kind: string;
      }[]
    >()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
