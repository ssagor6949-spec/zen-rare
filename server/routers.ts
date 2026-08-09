import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  like,
  sql,
} from "drizzle-orm";
import { ENV } from "./_core/env";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  abandonedOrders,
  activityLogs,
  banners,
  cartItems,
  categories,
  orderItems,
  orderNotes,
  orders,
  products,
  reviews,
  settings,
  sliders,
  stockHistory,
  users,
} from "../drizzle/schema";
import {
  DEFAULT_SHIPPING_INSIDE,
  DEFAULT_SHIPPING_OUTSIDE,
  Db,
  getCart,
  getCategories,
  getDb,
  getMyOrders,
  getPublicProducts,
  getSetting,
  getSettingsMap,
  logActivity,
} from "./db";
import { storagePut } from "./storage";

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const superadminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "superadmin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Superadmin access required" });
  }
  return next({ ctx });
});

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */
const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128).optional(),
        email: z.string().email().max(320).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const set: Record<string, unknown> = {};
      if (input.name !== undefined) set.name = input.name;
      if (input.email !== undefined) set.email = input.email;
      if (Object.keys(set).length === 0) return { success: true } as const;
      await db.update(users).set(set).where(eq(users.id, ctx.user.id));
      return { success: true } as const;
    }),
});

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */
const cartRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const items = await getCart(db, ctx.user.id);
    const prodIds = Array.from(new Set(items.map((i: { productId: number }) => i.productId)));
    const productMap = new Map<number, (typeof products.$inferSelect) | undefined>();
    if (prodIds.length > 0) {
      const prods = await db
        .select()
        .from(products)
        .where(inArray(products.id, prodIds));
      for (const p of prods) productMap.set(p.id, p);
    }
    return { items, productMap };
  }),
  add: protectedProcedure
    .input(z.object({ productId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const existing = await db
        .select()
        .from(cartItems)
        .where(and(eq(cartItems.userId, ctx.user.id), eq(cartItems.productId, input.productId)))
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(cartItems)
          .set({ quantity: sql`${cartItems.quantity} + 1` })
          .where(eq(cartItems.id, existing[0].id));
      } else {
        await db.insert(cartItems).values({ userId: ctx.user.id, productId: input.productId, quantity: 1 });
      }
      return { success: true } as const;
    }),
  updateQuantity: protectedProcedure
    .input(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(0).max(99) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      if (input.quantity === 0) {
        await db
          .delete(cartItems)
          .where(and(eq(cartItems.userId, ctx.user.id), eq(cartItems.productId, input.productId)));
      } else {
        await db
          .update(cartItems)
          .set({ quantity: input.quantity })
          .where(and(eq(cartItems.userId, ctx.user.id), eq(cartItems.productId, input.productId)));
      }
      return { success: true } as const;
    }),
  clear: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    await db.delete(cartItems).where(eq(cartItems.userId, ctx.user.id));
    return { success: true } as const;
  }),
});

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */
const reviewsRouter = router({
  byProduct: publicProcedure
    .input(z.object({ productId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          title: reviews.title,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          authorName: users.name,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .where(eq(reviews.productId, input.productId))
        .orderBy(desc(reviews.createdAt));
    }),
  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, ctx.user.id))
      .orderBy(desc(reviews.createdAt));
  }),
  create: protectedProcedure
    .input(
      z.object({
        productId: z.number().int().positive(),
        rating: z.number().int().min(1).max(5),
        title: z.string().max(255).optional(),
        comment: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [product] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      await db.insert(reviews).values({
        productId: input.productId,
        userId: ctx.user.id,
        rating: input.rating,
        title: input.title ?? null,
        comment: input.comment ?? null,
      });
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? ctx.user.email ?? null,
        action: "submitted review",
        entityType: "review",
        entityId: product.id,
        details: product.name,
      });
      return { success: true } as const;
    }),
});

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */
const ordersRouter = router({
  place: protectedProcedure
    .input(
      z.object({
        customerName: z.string().min(1).max(128),
        customerPhone: z.string().min(6).max(32),
        customerAddress: z.string().min(1).max(512),
        shippingArea: z.enum(["inside_dhaka", "outside_dhaka"]),
        shippingCharge: z.string().min(1),
        items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(99) })).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const prods = await db
        .select()
        .from(products)
        .where(inArray(products.id, input.items.map((i) => i.productId)));
      const productMap = new Map(prods.map((p) => [p.id, p]));

      let subtotal = 0;
      const orderedItems = [];
      for (const item of input.items) {
        const p = productMap.get(item.productId);
        if (!p) throw new TRPCError({ code: "NOT_FOUND", message: `Product ${item.productId} not found` });
        if (!p.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: `${p.name} is no longer available` });
        const price = parseFloat(p.price);
        subtotal += price * item.quantity;
        orderedItems.push({
          productId: p.id,
          productName: p.name,
          imageUrl: p.imageUrl,
          quantity: item.quantity,
          price: String(price),
        });
      }

      const shippingCharge = parseFloat(input.shippingCharge);
      const total = subtotal + shippingCharge;

      const orderNumber = "ZR-" + new Date().getFullYear() + "-" + nanoid(8).toUpperCase();

      const [result] = await db.insert(orders).values({
        orderNumber,
        userId: ctx.user.id,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerAddress: input.customerAddress,
        shippingArea: input.shippingArea,
        shippingCharge: String(shippingCharge),
        subtotal: String(subtotal),
        total: String(total),
        status: "pending",
      });

      await db.insert(orderItems).values(
        orderedItems.map((o) => ({ orderId: result.insertId, ...o })),
      );

      // Deduct stock
      for (const o of orderedItems) {
        const [p] = await db.select().from(products).where(eq(products.id, o.productId)).limit(1);
        if (p) {
          const prev = p.stock;
          const nextStock = Math.max(0, prev - o.quantity);
          await db
            .update(products)
            .set({ stock: nextStock })
            .where(eq(products.id, p.id));
          await db.insert(stockHistory).values({
            productId: p.id,
            change: -o.quantity,
            previousStock: prev,
            newStock: nextStock,
            reason: "order_confirmed",
            orderId: result.insertId,
            actorName: "system",
          });
        }
      }

      await db.delete(cartItems).where(eq(cartItems.userId, ctx.user.id));

      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? ctx.user.email ?? null,
        action: "placed order",
        entityType: "order",
        entityId: result.insertId,
        details: orderNumber,
      });

      return { orderNumber, orderId: result.insertId, total: String(total) };
    }),

  myOrders: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const orderRows = await getMyOrders(db, ctx.user.id);
    const orderIds = orderRows.map((o) => o.id);
    const items =
      orderIds.length > 0
        ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
        : [];
    return { orders: orderRows, items };
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [order] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, input.id), eq(orders.userId, ctx.user.id)))
        .limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      return { order, items };
    }),
});

/* ------------------------------------------------------------------ */
/* Content (public)                                                    */
/* ------------------------------------------------------------------ */
const contentRouter = router({
  sliders: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db
      .select()
      .from(sliders)
      .where(eq(sliders.isActive, 1))
      .orderBy(sliders.sortOrder, sliders.id);
  }),
  banners: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db
      .select()
      .from(banners)
      .where(eq(banners.isActive, 1))
      .orderBy(banners.sortOrder, banners.id);
  }),
  settingsPublic: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return getSettingsMap(db);
  }),
  categories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return getCategories(db);
  }),
  products: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          maxPrice: z.number().optional(),
          categoryId: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return getPublicProducts(db, input);
    }),
  productBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.slug, input.slug), eq(products.isActive, 1)))
        .limit(1);
      return product ?? null;
    }),
  avgRating: publicProcedure
    .input(z.object({ productId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db
        .select({ rating: reviews.rating })
        .from(reviews)
        .where(eq(reviews.productId, input.productId));
      if (rows.length === 0) return { avg: 0, count: 0 };
      const avg = rows.reduce((sum, r) => sum + r.rating, 0) / rows.length;
      return { avg: Math.round(avg * 10) / 10, count: rows.length };
    }),
});

/* ------------------------------------------------------------------ */
/* Catalog admin                                                       */
/* ------------------------------------------------------------------ */
const catalogRouter = router({
  categoriesAll: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return getCategories(db);
  }),
  categoryCreate: adminProcedure
    .input(z.object({ name: z.string().min(1).max(128), imageUrl: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const [result] = await db.insert(categories).values({
        name: input.name,
        slug: `${slug}-${nanoid(6)}`,
        imageUrl: input.imageUrl ?? null,
      });
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "created category",
        entityType: "category",
        entityId: result.insertId,
        details: input.name,
      });
      return { id: result.insertId };
    }),
  categoryUpdate: adminProcedure
    .input(z.object({ id: z.number().int().positive(), name: z.string().min(1).max(128).optional(), imageUrl: z.string().nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const set: Record<string, unknown> = {};
      if (input.name !== undefined) set.name = input.name;
      if (input.imageUrl !== undefined) set.imageUrl = input.imageUrl;
      await db.update(categories).set(set).where(eq(categories.id, input.id));
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "updated category",
        entityType: "category",
        entityId: input.id,
      });
      return { success: true } as const;
    }),
  categoryDelete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [cat] = await db.select().from(categories).where(eq(categories.id, input.id)).limit(1);
      await db.delete(categories).where(eq(categories.id, input.id));
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "deleted category",
        entityType: "category",
        entityId: input.id,
        details: cat?.name ?? null,
      });
      return { success: true } as const;
    }),

  productsAll: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db.select().from(products).orderBy(desc(products.createdAt));
  }),
  productCreate: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        price: z.string().min(1),
        comparePrice: z.string().optional(),
        imageUrl: z.string().optional(),
        categoryId: z.number().nullable().optional(),
        stock: z.number().int().min(0).optional(),
        lowStockThreshold: z.number().int().min(0).optional(),
        isFeatured: z.number().int().min(0).max(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const [result] = await db.insert(products).values({
        name: input.name,
        slug: `${slug}-${nanoid(6)}`,
        description: input.description ?? null,
        price: input.price,
        comparePrice: input.comparePrice ?? null,
        imageUrl: input.imageUrl ?? null,
        categoryId: input.categoryId ?? null,
        stock: input.stock ?? 0,
        lowStockThreshold: input.lowStockThreshold ?? 5,
        isFeatured: input.isFeatured ?? 0,
      });
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "created product",
        entityType: "product",
        entityId: result.insertId,
        details: input.name,
      });
      return { id: result.insertId };
    }),
  productUpdate: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().nullable().optional(),
        price: z.string().optional(),
        comparePrice: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
        categoryId: z.number().nullable().optional(),
        stock: z.number().int().min(0).optional(),
        lowStockThreshold: z.number().int().min(0).optional(),
        isFeatured: z.number().int().min(0).max(1).optional(),
        isActive: z.number().int().min(0).max(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const set: Record<string, unknown> = {};
      const { id, stock, ...rest } = input;
      Object.assign(set, rest);
      const [before] = await db.select().from(products).where(eq(products.id, id)).limit(1);
      await db.update(products).set(set).where(eq(products.id, id));
      if (stock !== undefined && before) {
        await db.insert(stockHistory).values({
          productId: id,
          change: stock - before.stock,
          previousStock: before.stock,
          newStock: stock,
          reason: "manual_adjustment",
          actorName: ctx.user.name ?? null,
        });
      }
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "updated product",
        entityType: "product",
        entityId: id,
      });
      return { success: true } as const;
    }),
  productDelete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [prod] = await db.select().from(products).where(eq(products.id, input.id)).limit(1);
      await db.delete(products).where(eq(products.id, input.id));
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "deleted product",
        entityType: "product",
        entityId: input.id,
        details: prod?.name ?? null,
      });
      return { success: true } as const;
    }),
});

/* ------------------------------------------------------------------ */
/* Upload                                                              */
/* ------------------------------------------------------------------ */
const uploadRouter = router({
  image: protectedProcedure
    .input(z.object({ fileName: z.string().min(1), base64: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.fileName.split(".").pop() || "png";
      const key = `zen-rare/${ctx.user.id}/${nanoid(12)}.${ext}`;
      const { url } = await storagePut(key, buffer, "image/" + (ext === "jpg" ? "jpeg" : ext));
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "uploaded image",
        entityType: "upload",
        details: input.fileName,
      });
      return { url };
    }),
});

/* ------------------------------------------------------------------ */
/* Admin orders                                                        */
/* ------------------------------------------------------------------ */
const adminOrdersRouter = router({
  pending: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db
      .select()
      .from(orders)
      .where(and(eq(orders.status, "pending"), eq(orders.isDeleted, 0), eq(orders.noResponse, 0)))
      .orderBy(desc(orders.createdAt));
  }),
  active: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db
      .select()
      .from(orders)
      .where(
        and(
          inArray(orders.status, ["processing", "shipped", "delivered"]),
          eq(orders.isDeleted, 0),
        ),
      )
      .orderBy(desc(orders.createdAt));
  }),
  noResponse: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db
      .select()
      .from(orders)
      .where(and(eq(orders.status, "pending"), eq(orders.isDeleted, 0), eq(orders.noResponse, 1)))
      .orderBy(desc(orders.createdAt));
  }),
  deleted: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db
      .select()
      .from(orders)
      .where(eq(orders.isDeleted, 1))
      .orderBy(desc(orders.updatedAt));
  }),
  detail: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [order] = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      const notes = await db.select().from(orderNotes).where(eq(orderNotes.orderId, order.id)).orderBy(desc(orderNotes.createdAt));
      return { order, items, notes };
    }),
  search: adminProcedure
    .input(z.object({ query: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const likeQ = `%${input.query}%`;
      return db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.isDeleted, 0),
            like(orders.customerName, likeQ),
          ),
        )
        .limit(20)
        .orderBy(desc(orders.createdAt));
    }),
  updatePending: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        customerName: z.string().min(1).max(128).optional(),
        customerPhone: z.string().min(6).max(32).optional(),
        customerAddress: z.string().min(1).max(512).optional(),
        shippingArea: z.enum(["inside_dhaka", "outside_dhaka"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [order] = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status !== "pending")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending orders can be edited" });
      const set: Record<string, unknown> = {};
      if (input.customerName !== undefined) set.customerName = input.customerName;
      if (input.customerPhone !== undefined) set.customerPhone = input.customerPhone;
      if (input.customerAddress !== undefined) set.customerAddress = input.customerAddress;
      if (input.shippingArea !== undefined) set.shippingArea = input.shippingArea;
      await db.update(orders).set(set).where(eq(orders.id, input.id));
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "edited order",
        entityType: "order",
        entityId: input.id,
        details: order.orderNumber,
      });
      return { success: true } as const;
    }),
  confirm: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [order] = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status !== "pending")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order is not pending" });
      // If stock was deducted at order_confirmed when placing, skip here
      await db.update(orders).set({ status: "processing", noResponse: 0 }).where(eq(orders.id, input.id));
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "confirmed order",
        entityType: "order",
        entityId: input.id,
        details: order.orderNumber,
      });
      return { success: true } as const;
    }),
  setStatus: adminProcedure
    .input(z.object({ id: z.number().int().positive(), status: z.enum(["processing", "shipped", "delivered", "returned"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [order] = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      await db.update(orders).set({ status: input.status }).where(eq(orders.id, input.id));
      if (input.status === "returned") {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        for (const item of items) {
          const [p] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
          if (p) {
            const prev = p.stock;
            const nextStock = prev + item.quantity;
            await db.update(products).set({ stock: nextStock }).where(eq(products.id, p.id));
            await db.insert(stockHistory).values({
              productId: p.id,
              change: item.quantity,
              previousStock: prev,
              newStock: nextStock,
              reason: "order_refund",
              orderId: order.id,
              actorName: ctx.user.name ?? null,
            });
          }
        }
      }
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "changed order status",
        entityType: "order",
        entityId: input.id,
        details: `${order.orderNumber} → ${input.status}`,
      });
      return { success: true } as const;
    }),
  noResponseToggle: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [order] = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      const next = order.noResponse ? 0 : 1;
      await db.update(orders).set({ noResponse: next }).where(eq(orders.id, input.id));
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: next ? "marked order no-response" : "unmarked order no-response",
        entityType: "order",
        entityId: input.id,
        details: order.orderNumber,
      });
      return { noResponse: next } as const;
    }),
  softDelete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [order] = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      await db.update(orders).set({ isDeleted: 1 }).where(eq(orders.id, input.id));
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "deleted order",
        entityType: "order",
        entityId: input.id,
        details: order.orderNumber,
      });
      return { success: true } as const;
    }),
  restore: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [order] = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      await db.update(orders).set({ isDeleted: 0 }).where(eq(orders.id, input.id));
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "restored order",
        entityType: "order",
        entityId: input.id,
        details: order.orderNumber,
      });
      return { success: true } as const;
    }),
  addNote: adminProcedure
    .input(z.object({ id: z.number().int().positive(), message: z.string().min(1).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.insert(orderNotes).values({
        orderId: input.id,
        authorName: ctx.user.name ?? ctx.user.email ?? "Admin",
        message: input.message,
      });
      return { success: true } as const;
    }),
  courier: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        courier: z.string().max(64).optional(),
        courierTrackingId: z.string().max(128).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [order] = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      await db.update(orders).set({ courier: input.courier ?? null, courierTrackingId: input.courierTrackingId ?? null }).where(eq(orders.id, input.id));
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "updated courier info",
        entityType: "order",
        entityId: input.id,
        details: `${order.orderNumber} · ${input.courier ?? ""}`,
      });
      return { success: true } as const;
    }),
});

/* ------------------------------------------------------------------ */
/* Admin: abandoned orders                                             */
/* ------------------------------------------------------------------ */
const adminAbandonedRouter = router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db.select().from(abandonedOrders).orderBy(desc(abandonedOrders.createdAt));
  }),
  recover: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db
        .update(abandonedOrders)
        .set({ recovered: 1 })
        .where(eq(abandonedOrders.id, input.id));
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "marked abandoned order recovered",
        entityType: "abandoned",
        entityId: input.id,
      });
      return { success: true } as const;
    }),
});

/* ------------------------------------------------------------------ */
/* Abandoned order capture (storefront)                                */
/* ------------------------------------------------------------------ */
const abandonedRouter = router({
  create: publicProcedure
    .input(
      z.object({
        customerName: z.string().max(128).optional(),
        customerPhone: z.string().max(32).optional(),
        customerAddress: z.string().max(512).optional(),
        shippingArea: z.enum(["inside_dhaka", "outside_dhaka"]).optional(),
        items: z.string().min(1),
        subtotal: z.string().optional(),
        shippingCharge: z.string().optional(),
        total: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: true } as const;
      await db.insert(abandonedOrders).values({
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        customerAddress: input.customerAddress ?? null,
        shippingArea: input.shippingArea ?? null,
        items: input.items,
        subtotal: input.subtotal ?? null,
        shippingCharge: input.shippingCharge ?? null,
        total: input.total ?? null,
      });
      return { success: true } as const;
    }),
});

/* ------------------------------------------------------------------ */
/* Admin dashboard                                                     */
/* ------------------------------------------------------------------ */
const adminDashboardRouter = router({
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.isDeleted, 0));
    const totalOrders = orderRows.length;
    const pendingOrders = orderRows.filter((o) => o.status === "pending").length;
    const totalRevenue = orderRows
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
    const lowStockProducts = await db
      .select({
        id: products.id,
        name: products.name,
        stock: products.stock,
        lowStockThreshold: products.lowStockThreshold,
      })
      .from(products)
      .where(and(gte(products.stock, 0), eq(products.isActive, 1)))
      .then((rows) => rows.filter((r) => r.stock <= r.lowStockThreshold));
    return { totalOrders, pendingOrders, totalRevenue: String(Math.round(totalRevenue)), lowStockProducts };
  }),
});

/* ------------------------------------------------------------------ */
/* Admin inventory helpers                                             */
/* ------------------------------------------------------------------ */
const adminInventoryRouter = router({
  stockHistory: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db.select().from(stockHistory).orderBy(desc(stockHistory.createdAt)).limit(200);
  }),
});

/* ------------------------------------------------------------------ */
/* Admin customers                                                     */
/* ------------------------------------------------------------------ */
const adminCustomersRouter = router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const orderRows = await db.select({ userId: orders.userId }).from(orders).where(eq(orders.isDeleted, 0));
    const counts = new Map<number, number>();
    for (const o of orderRows) {
      if (o.userId) counts.set(o.userId, (counts.get(o.userId) ?? 0) + 1);
    }
    return allUsers.map((u) => ({ ...u, orderCount: counts.get(u.id) ?? 0 }));
  }),
  setRole: superadminProcedure
    .input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin", "superadmin"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [target] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      if (target.openId === ENV.ownerOpenId && input.role !== "superadmin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Owner role cannot be demoted" });
      }
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "changed user role",
        entityType: "customer",
        entityId: input.userId,
        details: `${target.email ?? target.name ?? ""} → ${input.role}`,
      });
      return { success: true } as const;
    }),
});

/* ------------------------------------------------------------------ */
/* Admin couriers                                                      */
/* ------------------------------------------------------------------ */
const adminCouriersRouter = router({
  list: adminProcedure.query(() => [
    { key: "pathao", label: "Pathao", enabled: true },
    { key: "steadfast", label: "Steadfast", enabled: true },
    { key: "redx", label: "RedX", enabled: true },
    { key: "paperfly", label: "Paperfly", enabled: true },
    { key: "custom", label: "Other / Custom", enabled: true },
  ]),
});

/* ------------------------------------------------------------------ */
/* Admin fraud watch                                                   */
/* ------------------------------------------------------------------ */
const adminFraudRouter = router({
  signals: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const orderRows = await db.select().from(orders).where(eq(orders.isDeleted, 0));
    const abandonedRows = await db.select().from(abandonedOrders);
    const phoneCount = new Map<string, number>();
    for (const o of orderRows) phoneCount.set(o.customerPhone, (phoneCount.get(o.customerPhone) ?? 0) + 1);
    const abandonedCount = new Map<string, number>();
    for (const a of abandonedRows) {
      if (a.customerPhone) abandonedCount.set(a.customerPhone, (abandonedCount.get(a.customerPhone) ?? 0) + 1);
    }
    const signals: { type: "frequent_orders" | "frequent_abandoned"; value: string; count: number; detail: string }[] = [];
    for (const [phone, count] of Array.from(phoneCount)) {
      if (count >= 3) signals.push({ type: "frequent_orders", value: phone, count, detail: `${count} completed orders` });
    }
    for (const [phone, count] of Array.from(abandonedCount)) {
      if (count >= 3) signals.push({ type: "frequent_abandoned", value: phone, count, detail: `${count} abandoned checkouts` });
    }
    return signals;
  }),
});

/* ------------------------------------------------------------------ */
/* Admin activity                                                      */
/* ------------------------------------------------------------------ */
const adminActivityRouter = router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(200);
  }),
});

/* ------------------------------------------------------------------ */
/* Admin settings                                                      */
/* ------------------------------------------------------------------ */
const ALLOWED_SETTING_KEYS = new Set([
  "storeName",
  "storeTagline",
  "contactEmail",
  "contactPhone",
  "contactAddress",
  "shippingInsideDhaka",
  "shippingOutsideDhaka",
  "facebookPixelId",
  "currencySymbol",
]);

const adminSettingsRouter = router({
  all: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return getSettingsMap(db);
  }),
  update: adminProcedure
    .input(z.object({ settingKey: z.string().min(1).max(128), settingValue: z.string().max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      if (!ALLOWED_SETTING_KEYS.has(input.settingKey)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown setting key" });
      }
      await db
        .insert(settings)
        .values({ settingKey: input.settingKey, settingValue: input.settingValue })
        .onDuplicateKeyUpdate({ set: { settingValue: input.settingValue } });
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "updated setting",
        entityType: "setting",
        details: input.settingKey,
      });
      return { success: true } as const;
    }),
});

/* ------------------------------------------------------------------ */
/* Admin backup                                                        */
/* ------------------------------------------------------------------ */
const adminBackupRouter = router({
  exportData: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const [cats, prods, bannersRows, slidersRows] = await Promise.all([
      db.select().from(categories),
      db.select().from(products),
      db.select().from(banners),
      db.select().from(sliders),
    ]);
    return { categories: cats, products: prods, banners: bannersRows, sliders: slidersRows };
  }),
  importData: adminProcedure
    .input(
      z.object({
        categories: z.array(z.any()).optional(),
        products: z.array(z.any()).optional(),
        banners: z.array(z.any()).optional(),
        sliders: z.array(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      let counts = { categories: 0, products: 0, banners: 0, sliders: 0 };
      if (input.categories?.length) {
        await db.insert(categories).values(
          input.categories.map((c) => ({
            name: String(c.name ?? ""),
            slug: String(c.slug ?? `${String(c.name ?? "cat")}-${nanoid(6)}`),
            description: c.description ?? null,
            imageUrl: c.imageUrl ?? null,
          })),
        );
        counts.categories = input.categories.length;
      }
      if (input.products?.length) {
        await db.insert(products).values(
          input.products.map((p) => ({
            name: String(p.name ?? ""),
            slug: String(p.slug ?? `${String(p.name ?? "product")}-${nanoid(6)}`),
            description: p.description ?? null,
            price: String(p.price ?? "0"),
            comparePrice: p.comparePrice ?? null,
            imageUrl: p.imageUrl ?? null,
            categoryId: p.categoryId ?? null,
            stock: Number(p.stock ?? 0),
            isFeatured: p.isFeatured ?? 0,
          })),
        );
        counts.products = input.products.length;
      }
      if (input.banners?.length) {
        await db.insert(banners).values(
          input.banners.map((b) => ({
            title: b.title ?? null,
            subtitle: b.subtitle ?? null,
            imageUrl: String(b.imageUrl ?? ""),
            linkUrl: b.linkUrl ?? null,
          })),
        );
        counts.banners = input.banners.length;
      }
      if (input.sliders?.length) {
        await db.insert(sliders).values(
          input.sliders.map((s) => ({
            title: s.title ?? null,
            subtitle: s.subtitle ?? null,
            imageUrl: String(s.imageUrl ?? ""),
            linkUrl: s.linkUrl ?? null,
          })),
        );
        counts.sliders = input.sliders.length;
      }
      await logActivity(db, {
        userId: ctx.user.id,
        actorName: ctx.user.name ?? null,
        action: "imported backup",
        entityType: "backup",
        details: JSON.stringify(counts),
      });
      return counts;
    }),
});

/* ------------------------------------------------------------------ */
/* Admin root                                                          */
/* ------------------------------------------------------------------ */
const adminRouter = router({
  orders: adminOrdersRouter,
  abandoned: adminAbandonedRouter,
  dashboard: adminDashboardRouter,
  inventory: adminInventoryRouter,
  customers: adminCustomersRouter,
  couriers: adminCouriersRouter,
  fraud: adminFraudRouter,
  activity: adminActivityRouter,
  settings: adminSettingsRouter,
  backup: adminBackupRouter,
});

/* ------------------------------------------------------------------ */
/* App router                                                          */
/* ------------------------------------------------------------------ */
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  cart: cartRouter,
  reviews: reviewsRouter,
  orders: ordersRouter,
  content: contentRouter,
  catalog: catalogRouter,
  upload: uploadRouter,
  admin: adminRouter,
  abandoned: abandonedRouter,
});

export type AppRouter = typeof appRouter;
