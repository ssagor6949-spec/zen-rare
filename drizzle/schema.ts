import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Roles: user | admin | superadmin
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "superadmin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  price: varchar("price", { length: 20 }).notNull(),
  comparePrice: varchar("comparePrice", { length: 20 }),
  imageUrl: text("imageUrl"),
  images: json("images"),
  categoryId: int("categoryId"),
  stock: int("stock").default(0).notNull(),
  lowStockThreshold: int("lowStockThreshold").default(5).notNull(),
  isFeatured: int("isFeatured").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  userId: int("userId").notNull(),
  rating: int("rating").notNull(),
  title: varchar("title", { length: 255 }),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  userId: int("userId"),
  customerName: varchar("customerName", { length: 128 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  customerAddress: varchar("customerAddress", { length: 512 }).notNull(),
  shippingArea: mysqlEnum("shippingArea", ["inside_dhaka", "outside_dhaka"]).notNull(),
  shippingCharge: varchar("shippingCharge", { length: 20 }).notNull(),
  subtotal: varchar("subtotal", { length: 20 }).notNull(),
  total: varchar("total", { length: 20 }).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "shipped", "delivered", "returned"])
    .default("pending")
    .notNull(),
  courier: varchar("courier", { length: 64 }),
  courierTrackingId: varchar("courierTrackingId", { length: 128 }),
  notes: text("notes"), // internal/admin notes
  isDeleted: int("isDeleted").default(0).notNull(),
  noResponse: int("noResponse").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  imageUrl: text("imageUrl"),
  quantity: int("quantity").notNull(),
  price: varchar("price", { length: 20 }).notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/** Internal notes on orders (separate from the notes text column) */
export const orderNotes = mysqlTable("order_notes", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  authorName: varchar("authorName", { length: 128 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderNote = typeof orderNotes.$inferSelect;
export type InsertOrderNote = typeof orderNotes.$inferInsert;

export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 128 }).notNull().unique(),
  settingValue: text("settingValue"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  actorName: varchar("actorName", { length: 128 }),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

export const banners = mysqlTable("banners", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 128 }),
  subtitle: varchar("subtitle", { length: 255 }),
  imageUrl: text("imageUrl").notNull(),
  linkUrl: text("linkUrl"),
  isActive: int("isActive").default(1).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Banner = typeof banners.$inferSelect;
export type InsertBanner = typeof banners.$inferInsert;

export const sliders = mysqlTable("sliders", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 128 }),
  subtitle: varchar("subtitle", { length: 255 }),
  imageUrl: text("imageUrl").notNull(),
  linkUrl: text("linkUrl"),
  isActive: int("isActive").default(1).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Slider = typeof sliders.$inferSelect;
export type InsertSlider = typeof sliders.$inferInsert;

export const stockHistory = mysqlTable("stock_history", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  change: int("change").notNull(),
  previousStock: int("previousStock").notNull(),
  newStock: int("newStock").notNull(),
  reason: mysqlEnum("reason", [
    "order_confirmed",
    "manual_adjustment",
    "order_refund",
    "restock",
  ]).notNull(),
  orderId: int("orderId"),
  actorName: varchar("actorName", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StockHistory = typeof stockHistory.$inferSelect;
export type InsertStockHistory = typeof stockHistory.$inferInsert;

export const abandonedOrders = mysqlTable("abandoned_orders", {
  id: int("id").autoincrement().primaryKey(),
  customerName: varchar("customerName", { length: 128 }),
  customerPhone: varchar("customerPhone", { length: 32 }),
  customerAddress: varchar("customerAddress", { length: 512 }),
  shippingArea: mysqlEnum("shippingArea", ["inside_dhaka", "outside_dhaka"]),
  items: text("items").notNull(),
  subtotal: varchar("subtotal", { length: 20 }),
  shippingCharge: varchar("shippingCharge", { length: 20 }),
  total: varchar("total", { length: 20 }),
  recovered: int("recovered").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AbandonedOrder = typeof abandonedOrders.$inferSelect;
export type InsertAbandonedOrder = typeof abandonedOrders.$inferInsert;
