import { trpc } from "@/lib/trpc";

/** Format a number as Taka: ৳1,234 */
export function formatPrice(amount: string | number | null | undefined): string {
  const n =
    typeof amount === "string" ? parseFloat(amount) : typeof amount === "number" ? amount : 0;
  return "৳" + (Number.isFinite(n) ? Math.round(n).toLocaleString("en-BD") : "0");
}

/** Default shipping rates shown while settings load */
export const DEFAULT_SHIPPING = {
  inside_dhaka: 70,
  outside_dhaka: 120,
};

/**
 * Public store settings key map.
 * Keys mirror the settings panel: storeName, storeTagline, contactEmail,
 * contactPhone, contactAddress, shippingInsideDhaka, shippingOutsideDhaka,
 * facebookPixelId, currencySymbol.
 */
export function useStoreSettings() {
  return trpc.content.settingsPublic.useQuery();
}

export function getShippingRate(
  settings: Record<string, string> | undefined,
  area: "inside_dhaka" | "outside_dhaka",
): number {
  const raw = settings?.[area === "inside_dhaka" ? "shippingInsideDhaka" : "shippingOutsideDhaka"];
  const n = raw ? parseFloat(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_SHIPPING[area];
}

/**
 * Facebook Pixel injection. Loads the Meta pixel snippet when a pixel ID is
 * configured in Site Settings and fires standard e-commerce events.
 */
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function getPixelId(): string {
  const raw = localStorage.getItem("zen-settings");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const id = parsed?.facebookPixelId;
      if (typeof id === "string" && id.trim().length >= 10) return id.trim();
    } catch {}
  }
  return "";
}

let pixelInitialized = false;
let currentPixelId = "";

function ensurePixel(pixelId: string) {
  if (!pixelId || pixelId === currentPixelId) return;
  currentPixelId = pixelId;
  if (!pixelInitialized) {
    const script = document.createElement("script");
    script.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');`;
    document.head.appendChild(script);
    pixelInitialized = true;
  }
  try {
    window.fbq?.("init", pixelId);
    window.fbq?.("set", "agent", "zen-rare");
  } catch {}
}

export function trackPageView() {
  const id = getPixelId();
  ensurePixel(id);
  if (id) {
    try {
      window.fbq?.("track", "PageView");
    } catch {}
  }
}

export function trackViewContent(productId?: string | number, price?: string | number) {
  const id = getPixelId();
  ensurePixel(id);
  if (!id) return;
  const priceNum = typeof price === "string" ? parseFloat(price) : price;
  window.fbq?.("track", "ViewContent", {
    content_ids: productId ? [String(productId)] : undefined,
    content_type: "product",
    value: Number.isFinite(priceNum as number) ? priceNum : undefined,
    currency: "BDT",
  });
}

export function trackInitiateCheckout(value: number) {
  const id = getPixelId();
  ensurePixel(id);
  if (!id) return;
  window.fbq?.("track", "InitiateCheckout", { value, currency: "BDT" });
}

export function trackPurchase(value: number, orderId?: string, items?: unknown[]) {
  const id = getPixelId();
  ensurePixel(id);
  if (!id) return;
  window.fbq?.("track", "Purchase", {
    value,
    currency: "BDT",
    order_id: orderId,
    contents: items as unknown[],
  });
}

export function starString(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
}
