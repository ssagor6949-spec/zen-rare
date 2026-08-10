# ZEN RARE Rebuild — Session Notes (Aug 9, 2026)

## Status
- Sandbox was reset earlier; DB schema (14 tables) persists (verified earlier).
- Backend COMPLETE + checkpoint saved: version **e48c0b89**.
  - drizzle/schema.ts: all 14 tables (users incl superadmin role, categories, products, reviews, orders, order_items, order_notes, cart_items, settings, activity_logs, banners, sliders, stock_history, abandoned_orders)
  - server/db.ts helpers + DEFAULT_SHIPPING_INSIDE=70/OUTSIDE=120
  - server/routers.ts routers: auth(updateProfile), cart(list/add/updateQuantity/clear — cart.list returns {items, productMap} where productMap is JS Map, use .get), reviews(byProduct/mine/create), orders(place/myOrders/byId), content(sliders/banners/settingsPublic/categories/products/productBySlug/avgRating), catalog(category CRUD/product CRUD admin), upload(image {fileName,base64}), admin(orders: pending/active/noResponse/deleted/detail/search/updatePending/confirm/setStatus/noResponseToggle/softDelete/restore/addNote/courier; abandoned list/recover; dashboard.stats; inventory.stockHistory; customers.list/setRole(superadmin-only); couriers.list; fraud.signals; activity.list; settings.all/update ALLOWED: storeName,storeTagline,contactEmail,contactPhone,contactAddress,shippingInsideDhaka,shippingOutsideDhaka,facebookPixelId,currencySymbol; backup.exportData/importData(categories,products,banners,sliders JSON))

## Checkpoints saved
- e48c0b89 (backend complete), 2498b325 (storefront pages complete)

## Backend exact shapes (verified via grep)
- orders.place input: {customerName, customerPhone, customerAddress, shippingArea, shippingCharge, items:[{productId,quantity}]} returns {orderNumber, orderId, total}
- orders.myOrders returns {orders: [...], items: [...]} (items flat, join on orderId)
- orders.byId returns {order, items}
- abandoned.create input: {customerName?, customerPhone?, customerAddress?, shippingArea?, items: string(JSON), subtotal?, shippingCharge?, total?}
- trackPurchase(value, orderId?, items?) — 1-3 args; trackInitiateCheckout(value) — 1 arg; trackPageView() no args

## Frontend progress
- index.html (Playfair + Inter fonts), index.css (premium gold/amber theme: .bg-ink, .hero-bg, .gold-gradient, .gold-text, .tracking-wide-lux, .btn-press, .luxury-shadow, .fade-up)
- lib/zen.ts: formatPrice, getShippingRate(settings, area), useStoreSettings (=trpc.content.settingsPublic), pixel helpers (trackPageView/ViewContent/InitiateCheckout/Purchase; stores pixelId from localStorage "zen-settings"), starString
- StoreLayout.tsx done (nav, search, cart count via cart.list, sign in, admin link, footer)
- Home.tsx, Shop.tsx, Product.tsx done (Product uses utils.reviews.byProduct.invalidate pattern)
- Cart.tsx (fixed .get), Checkout.tsx (fixed), OrderConfirmation.tsx (fixed order.), Account.tsx (fixed {orders,items}) — all type-clean

## Verified admin API shapes
- catalog.categoryCreate {name, imageUrl?}; categoryUpdate {id, name?, imageUrl?(nullable)}; categoryDelete {id}; categoriesAll → getCategories(db) (name,id,slug,imageUrl)
- catalog.productCreate {name, description?, price, comparePrice?, imageUrl?, categoryId?(nullable), stock?, lowStockThreshold?, isFeatured?(0|1)} returns {id}
- catalog.productUpdate {id, name?, description?(nullable), price?, comparePrice?(nullable), imageUrl?(nullable), categoryId?, stock?, ...} (same fields)
- upload.image {fileName, base64} → {url}; content.settingsPublic (public settings incl shipping rates + facebookPixelId)
- admin.dashboard.stats: {totalOrders, pendingOrders, totalRevenue, lowStockProducts[{id,name,stock,lowStockThreshold}]}
- admin.orders: pending/active/noResponse/deleted (all queries, order rows), detail {order, items, notes}, search {query} (query), confirm {id}, setStatus {id,status∈processing|shipped|delivered|returned}, updatePending {id,customerName?,customerPhone?,customerAddress?,shippingArea?}, noResponseToggle {id}, softDelete {id}, restore {id}, addNote {id,message}, courier {id,courier?,courierTrackingId?}
- admin.abandoned.list / recover {id}
- admin.inventory.stockHistory → stock_history rows (limit 200)
- admin.customers.list → users with orderCount; setRole {userId, role} superadmin-only
- admin.couriers.list → static [{name:Pathao,id:pathao},{name:Steadfast,id:steadfast}]
- admin.fraud.signals → computed signals
- admin.activity.list → activity_logs
- admin.settings.all/update (keys: storeName,storeTagline,contactEmail,contactPhone,contactAddress,shippingInsideDhaka,shippingOutsideDhaka,facebookPixelId,currencySymbol)
- admin.backup.exportData / importData {categories?,products?,banners?,sliders?}

## Remaining
- Admin.tsx: DashboardLayout wrapper, role gate admin+superadmin, tabs: Dashboard(admin.dashboard.stats + activity.list), Orders(pending/active/noResponse/deleted + detail dialog: confirm, setStatus(pending/processing/shipped/delivered/returned), noResponseToggle, softDelete/restore, addNote, courier name+id+link, print invoice), Abandoned(admin.abandoned.list/recover), Inventory(catalog.category+product CRUD, upload.image {fileName,base64}, stock history admin.inventory.stockHistory), Customers(admin.customers.list/setRole superadmin-only), Couriers(static Pathao/Steadfast), Fraud(admin.fraud.signals), Activity(admin.activity.list), Settings(admin.settings.all/update), Backup(admin.backup.exportData/importData)
- App.tsx: add /admin route
- Then screenshots, pnpm test, checkpoint, deliver

## Verification (screenshots)
- All 6 pages render: Home (premium dark hero, ZEN RARE gold), Shop, Cart, Checkout, /admin (all 10 tabs, sidebar ZEN RARE Admin), Account — zero TS errors. Admin accessible by logged-in user (S Sagor) — current user may be admin already.
- Remaining: write vitest tests (server/auth.logout.test.ts style), checkpoint, deliver.

## Old notes below

- Cart.tsx (written, TS error: productMap is Map → use .get(i.productId))
- Checkout.tsx: form(name,phone,address), area from ?area=, abandoned.create on 5s inactivity debounce, orders.place → /order/:id + trackPurchase
- OrderConfirmation.tsx: orders.byId + printable invoice
- Account.tsx: orders.myOrders, auth.updateProfile, reviews.mine
- Admin.tsx: DashboardLayout, role gate, tabs: Dashboard(stats), Orders(pending/active/no-response/deleted + detail dialog), Abandoned, Inventory(categories/products CRUD + upload.image + stock history), Customers(role), Couriers(static), Fraud, Activity, Settings(allowed keys incl facebookPixelId), Backup
- App.tsx: register routes /shop, /product/:slug, /cart, /checkout, /order/:id, /account, /admin
- Then: typecheck, screenshots, pnpm test, checkpoint, deliver

## Conventions
- wouter Link/useParams/useSearch, sonner toast, shadcn ui, font-display headings, gold-gradient + btn-press
