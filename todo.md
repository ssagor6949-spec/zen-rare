# ZEN RARE — Build TODO

## Database & Backend
- [x] Drizzle schema: users (roles), categories, products, reviews, orders, order_items, order_notes, cart_items, settings, activity_logs, banners, sliders, stock_history, abandoned_orders
- [x] Migration generated and applied to database
- [x] db.ts query helpers
- [x] tRPC routers: auth (updateProfile), cart, orders (place, myOrders, byId), reviews, content (sliders, banners, settingsPublic), catalog (products/categories CRUD), upload (image), admin (orders: pending/active/noResponse/deleted/detail/search/updatePending/confirm/setStatus/noResponseToggle/softDelete/restore/addNote/courier, dashboard stats, inventory: stockHistory, customers: list/setRole, couriers: list, fraud: signals, activity: list, settings: all/update, backup: exportData/importData), abandoned (create/list/recover)

## Theme
- [x] index.css premium theme (Playfair Display, amber/gold palette, luxury shadows)
- [x] index.html fonts/title

## Storefront
- [x] StoreLayout (nav, footer, cart count, admin link)
- [x] lib/zen.ts (pixel hook, currency, helpers)
- [x] Home (hero, sliders, categories, featured products)
- [x] Shop (category filter, search, max price)
- [x] Product detail (reviews, add to cart, related)
- [x] Cart (qty update, Dhaka shipping area)
- [x] Checkout (abandoned capture, pixel events, order placement)
- [x] OrderConfirmation (printable invoice)
- [x] Account (orders, reviews, profile)
- [x] App.tsx routes

## Admin panel
- [x] Admin.tsx shell: sidebar, role gating, tabs routing via ?tab=
- [x] Dashboard tab (stats + activity log)
- [x] Orders tab: pending/in-progress/no-response/deleted, search, detail dialog (edit pending, confirm, status flow, notes, courier fields, delete/restore, print invoice)
- [x] Abandoned tab (recover action)
- [x] Inventory tab (products CRUD, categories CRUD, stock history, image upload)
- [x] Customers tab (role management for superadmin)
- [x] Couriers tab
- [x] Fraud Watch tab
- [x] Activity Log tab
- [x] Settings tab (store info, shipping rates, pixel ID)
- [x] Backup tab (export/import)

## Verification
- [x] TypeScript clean
- [x] Screenshots of all pages
- [x] Vitest tests for key procedures
- [x] Checkpoint saved
