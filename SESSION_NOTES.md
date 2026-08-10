# ZEN RARE Rebuild — Session Notes (Aug 9, 2026)

## Status
- Sandbox was reset earlier; DB schema (14 tables) persists (verified earlier).
- Backend COMPLETE + checkpoint saved: version **e48c0b89**.
  - drizzle/schema.ts: all 14 tables (users incl superadmin role, categories, products, reviews, orders, order_items, order_notes, cart_items, settings, activity_logs, banners, sliders, stock_history, abandoned_orders)
  - server/db.ts helpers + DEFAULT_SHIPPING_INSIDE=70/OUTSIDE=120
  - server/routers.ts routers: auth(updateProfile), cart(list/add/updateQuantity/clear — cart.list returns {items, productMap} where productMap is JS Map, use .get), reviews(byProduct/mine/create), orders(place/myOrders/byId), content(sliders/banners/settingsPublic/categories/products/productBySlug/avgRating), catalog(category CRUD/product CRUD admin), upload(image {fileName,base64}), admin(orders: pending/active/noResponse/deleted/detail/search/updatePending/confirm/setStatus/noResponseToggle/softDelete/restore/addNote/courier; abandoned list/recover; dashboard.stats; inventory.stockHistory; customers.list/setRole(superadmin-only); couriers.list; fraud.signals; activity.list; settings.all/update ALLOWED: storeName,storeTagline,contactEmail,contactPhone,contactAddress,shippingInsideDhaka,shippingOutsideDhaka,facebookPixelId,currencySymbol; backup.exportData/importData(categories,products,banners,sliders JSON))

## Frontend progress
- index.html (Playfair + Inter fonts), index.css (premium gold/amber theme: .bg-ink, .hero-bg, .gold-gradient, .gold-text, .tracking-wide-lux, .btn-press, .luxury-shadow, .fade-up)
- lib/zen.ts: formatPrice, getShippingRate(settings, area), useStoreSettings (=trpc.content.settingsPublic), pixel helpers (trackPageView/ViewContent/InitiateCheckout/Purchase; stores pixelId from localStorage "zen-settings"), starString
- StoreLayout.tsx done (nav, search, cart count via cart.list, sign in, admin link, footer)
- Home.tsx, Shop.tsx, Product.tsx done (Product uses utils.reviews.byProduct.invalidate pattern)

## Remaining pages to write
- Cart.tsx (written, TS error: productMap is Map → use .get(i.productId))
- Checkout.tsx: form(name,phone,address), area from ?area=, abandoned.create on 5s inactivity debounce, orders.place → /order/:id + trackPurchase
- OrderConfirmation.tsx: orders.byId + printable invoice
- Account.tsx: orders.myOrders, auth.updateProfile, reviews.mine
- Admin.tsx: DashboardLayout, role gate, tabs: Dashboard(stats), Orders(pending/active/no-response/deleted + detail dialog), Abandoned, Inventory(categories/products CRUD + upload.image + stock history), Customers(role), Couriers(static), Fraud, Activity, Settings(allowed keys incl facebookPixelId), Backup
- App.tsx: register routes /shop, /product/:slug, /cart, /checkout, /order/:id, /account, /admin
- Then: typecheck, screenshots, pnpm test, checkpoint, deliver

## Conventions
- wouter Link/useParams/useSearch, sonner toast, shadcn ui, font-display headings, gold-gradient + btn-press
