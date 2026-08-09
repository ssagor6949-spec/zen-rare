# ZEN RARE — Build TODO

## Database & Backend
- [ ] Drizzle schema: users (roles), categories, products, reviews, orders, order_items, order_notes, cart_items, settings, activity_logs, banners, sliders, stock_history, abandoned_orders
- [ ] Migration generated and applied to database
- [ ] db.ts query helpers
- [ ] tRPC routers: auth (updateProfile), cart, orders (place, myOrders, byId), reviews, content (sliders, banners, settingsPublic), catalog (products/categories CRUD), upload (image), admin (orders: pending/active/noResponse/deleted/detail/search/updatePending/confirm/setStatus/noResponseToggle/softDelete/restore/addNote/courier, dashboard stats, inventory: stockHistory, customers: list/setRole, couriers: list, fraud: signals, activity: list, settings: all/update, backup: exportData/importData), abandoned (create/list/recover)

## Theme
- [ ] index.css premium theme (Playfair Display, amber/gold palette, luxury shadows)
- [ ] index.html fonts/title

## Storefront
- [ ] StoreLayout (nav, footer, cart count, admin link)
- [ ] lib/zen.ts (pixel hook, currency, helpers)
- [ ] Home (hero, sliders, categories, featured products)
- [ ] Shop (category filter, search, max price)
- [ ] Product detail (reviews, add to cart, related)
- [ ] Cart (qty update, Dhaka shipping area)
- [ ] Checkout (abandoned capture, pixel events, order placement)
- [ ] OrderConfirmation (printable invoice)
- [ ] Account (orders, reviews, profile)
- [ ] App.tsx routes

## Admin panel
- [ ] Admin.tsx shell: sidebar, role gating, tabs routing via ?tab=
- [ ] Dashboard tab (stats + activity log)
- [ ] Orders tab: pending/in-progress/no-response/deleted, search, detail dialog (edit pending, confirm, status flow, notes, courier fields, delete/restore, print invoice)
- [ ] Abandoned tab (recover action)
- [ ] Inventory tab (products CRUD, categories CRUD, stock history, image upload)
- [ ] Customers tab (role management for superadmin)
- [ ] Couriers tab
- [ ] Fraud Watch tab
- [ ] Activity Log tab
- [ ] Settings tab (store info, shipping rates, pixel ID)
- [ ] Backup tab (export/import)

## Verification
- [ ] TypeScript clean
- [ ] Screenshots of all pages
- [ ] Vitest tests for key procedures
- [ ] Checkpoint saved
