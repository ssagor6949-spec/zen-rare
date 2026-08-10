import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "user" | "admin" | "superadmin"): TrpcContext {
  return {
    user: {
      id: 99,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as AuthenticatedUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => undefined,
    } as unknown as TrpcContext["res"],
  };
}

describe("role gating on admin procedures", () => {
  it("rejects plain users from admin.dashboard.stats", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.admin.dashboard.stats()).rejects.toThrow();
  });

  it("rejects plain users from admin.customers.setRole (superadmin only)", async () => {
    const callerAdmin = appRouter.createCaller(createContext("admin"));
    await expect(callerAdmin.admin.customers.setRole({ userId: 1, role: "superadmin" })).rejects.toThrow();
  });

  it("allows admins into admin.dashboard.stats", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const stats = await caller.admin.dashboard.stats();
    expect(stats).toHaveProperty("totalOrders");
    expect(stats).toHaveProperty("totalRevenue");
    expect(stats).toHaveProperty("lowStockProducts");
  });
});

describe("settings allowed keys", () => {
  it("rejects unknown setting keys for admins", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(
      caller.admin.settings.update({ settingKey: "notARealKey", settingValue: "x" }),
    ).rejects.toThrow();
  });

  it("accepts valid shipping rate keys", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const res = await caller.admin.settings.update({ settingKey: "shippingInsideDhaka", settingValue: "70" });
    expect(res.success).toBe(true);
  });
});

describe("catalog CRUD", () => {
  it("creates and updates a category", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const created = await caller.catalog.categoryCreate({ name: "Test Category" });
    expect(created.id).toBeGreaterThan(0);
    const updated = await caller.catalog.categoryUpdate({ id: created.id, name: "Test Category Renamed" });
    expect(updated.success).toBe(true);
    await caller.catalog.categoryDelete({ id: created.id });
    const cats = await caller.catalog.categoriesAll();
    expect(cats.find((c) => c.id === created.id)).toBeUndefined();
  });

  it("creates and updates a product", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const created = await caller.catalog.productCreate({
      name: "Test Product",
      description: "A test",
      price: "1234",
      stock: 10,
    });
    expect(created.id).toBeGreaterThan(0);
    const updated = await caller.catalog.productUpdate({ id: created.id, price: "1500" });
    expect(updated.success).toBe(true);
    const all = await caller.catalog.productsAll();
    const p = all.find((x) => x.id === created.id);
    expect(parseFloat(p?.price ?? "0")).toBe(1500);
  });
});

describe("abandoned orders list", () => {
  it("returns an array for admins", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const list = await caller.admin.abandoned.list();
    expect(Array.isArray(list)).toBe(true);
  });
});
