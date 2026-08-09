import { and, desc, eq, gte, inArray, isNotNull, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import * as schema from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: schema.InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: schema.InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    textFields.forEach((field) => {
      const value = user[field];
      if (value !== undefined) {
        values[field] = value ?? null;
        updateSet[field] = value ?? null;
      }
    });
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(schema.users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(schema.users).where(eq(schema.users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function logActivity(
  db: Db,
  input: {
    userId?: number | null;
    actorName?: string | null;
    action: string;
    entityType?: string;
    entityId?: number | null;
    details?: string | null;
  },
) {
  await db.insert(schema.activityLogs).values({
    userId: input.userId ?? null,
    actorName: input.actorName ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    details: input.details ?? null,
  });
}

/* ---------------- Categories ---------------- */
export async function getCategories(db: Db) {
  return db.select().from(schema.categories).orderBy(schema.categories.sortOrder, schema.categories.id);
}

/* ---------------- Products ---------------- */
export async function getPublicProducts(
  db: Db,
  params?: { search?: string; maxPrice?: number; categoryId?: number },
) {
  const conditions = [eq(schema.products.isActive, 1)];
  if (params?.search) {
    conditions.push(like(schema.products.name, `%${params.search}%`));
  }
  if (params?.maxPrice !== undefined && !Number.isNaN(params.maxPrice)) {
    conditions.push(sql`${schema.products.price} <= ${String(params.maxPrice)}`);
  }
  if (params?.categoryId !== undefined) {
    conditions.push(eq(schema.products.categoryId, params.categoryId));
  }
  return db.select().from(schema.products).where(and(...conditions)).orderBy(desc(schema.products.createdAt));
}

/* ---------------- Cart ---------------- */
export async function getCart(db: Db, userId: number) {
  return db
    .select()
    .from(schema.cartItems)
    .where(eq(schema.cartItems.userId, userId))
    .orderBy(desc(schema.cartItems.updatedAt));
}

/* ---------------- Orders ---------------- */
export async function getMyOrders(db: Db, userId: number) {
  return db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.userId, userId))
    .orderBy(desc(schema.orders.createdAt));
}

/* ---------------- Settings ---------------- */
export async function getSettingsMap(db: Db) {
  const rows = await db.select().from(schema.settings);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.settingKey] = r.settingValue ?? "";
  return map;
}

export async function getSetting(
  db: Db,
  key: string,
  fallback?: string,
): Promise<string> {
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.settingKey, key)).limit(1);
  return rows[0]?.settingValue ?? fallback ?? "";
}

/* ---------------- Default shipping helpers ---------------- */
export const DEFAULT_SHIPPING_INSIDE = "70";
export const DEFAULT_SHIPPING_OUTSIDE = "120";

export function formatPrice(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return "৳" + (Number.isFinite(n) ? Math.round(n).toLocaleString("en-BD") : "0");
}

export type Db = NonNullable<ReturnType<typeof drizzle>>;
