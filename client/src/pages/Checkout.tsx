import StoreLayout from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { formatPrice, getShippingRate, trackInitiateCheckout, trackPurchase, useStoreSettings } from "@/lib/zen";
import { ArrowRight, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";

type Area = "inside_dhaka" | "outside_dhaka";

export default function Checkout() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const areaParam = (new URLSearchParams(search).get("area") as Area | null) ?? "inside_dhaka";
  const utils = trpc.useUtils();
  const settingsQuery = useStoreSettings();
  const cartQuery = trpc.cart.list.useQuery(undefined, { enabled: !!user });
  const placeMutation = trpc.orders.place.useMutation({
    onSuccess: (res) => {
      trackPurchase(total, String(res.orderId), items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
      utils.cart.list.invalidate();
      navigate(`/order/${res.orderId}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const abandonMutation = trpc.abandoned.create.useMutation();

  const [area, setArea] = useState<Area>(areaParam);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const abandonedSent = useRef(false);

  const items = cartQuery.data?.items ?? [];
  const products = items.map((i) => cartQuery.data?.productMap?.get(i.productId));
  const subtotal = items.reduce((sum, i, idx) => {
    const p = products[idx];
    return sum + (p ? parseFloat(p.price) * i.quantity : 0);
  }, 0);
  const shipping = getShippingRate(settingsQuery.data, area);
  const total = subtotal + shipping;

  useEffect(() => {
    if (user && !name && user.name) setName(user.name);
  }, [user]);

  useEffect(() => {
    if (items.length > 0) trackInitiateCheckout(total);
  }, [items.length, subtotal, total]);

  // Abandoned checkout capture: save draft 5s after inactivity
  useEffect(() => {
    const hasInput = name.trim() || phone.trim() || address.trim();
    if (!hasInput || items.length === 0 || abandonedSent.current || placeMutation.isPending) return;
    const timer = setTimeout(() => {
      abandonedSent.current = true;
      const itemsList = items.map((i, idx) => {
        const p = products[idx];
        return p ? { productId: i.productId, name: p.name, price: p.price, quantity: i.quantity } : null;
      }).filter(Boolean);
      abandonMutation.mutate({
        customerName: name || undefined,
        customerPhone: phone || undefined,
        customerAddress: address || undefined,
        shippingArea: area,
        items: JSON.stringify(itemsList),
        subtotal: String(subtotal),
        shippingCharge: String(shipping),
        total: String(total),
      });
    }, 5000);
    return () => clearTimeout(timer);
  }, [name, phone, address, area, subtotal, shipping, total, items.length, items, products, placeMutation.isPending, abandonMutation]);

  if (!user) {
    return (
      <StoreLayout>
        <div className="container flex flex-col items-center justify-center py-24 text-center">
          <ShoppingBag className="mb-4 h-10 w-10 text-gold/50" />
          <h1 className="font-display text-2xl font-semibold">Please sign in to check out</h1>
        </div>
      </StoreLayout>
    );
  }

  const submit = () => {
    if (!name.trim()) return toast.error("Please enter your full name");
    if (!/^01[3-9]\d{8}$/.test(phone.trim())) return toast.error("Please enter a valid Bangladeshi phone number");
    if (address.trim().length < 10) return toast.error("Please enter a complete delivery address");
    if (items.length === 0) return toast.error("Your cart is empty");
    placeMutation.mutate({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerAddress: address.trim(),
      shippingArea: area,
      shippingCharge: String(shipping),
      items: items.map((i) => ({ productId: i.productId, quantity: Math.min(i.quantity, 99) })),
    });
  };

  return (
    <StoreLayout>
      <div className="container py-10">
        <h1 className="font-display text-4xl font-semibold">Checkout</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cash on delivery — pay when your piece arrives.</p>

        {cartQuery.isLoading ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            <Skeleton className="h-96 rounded-lg" />
            <Skeleton className="h-80 rounded-lg" />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-12 flex flex-col items-center rounded-lg border border-dashed border-border py-20 text-center">
            <ShoppingBag className="mb-4 h-10 w-10 text-gold/50" />
            <h2 className="font-display text-xl font-medium">Your cart is empty</h2>
            <Button asChild className="btn-press mt-5">
              <a href="/shop">Shop Now</a>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <div className="rounded-lg border border-border/70 bg-card p-6">
                <h2 className="font-display text-xl font-semibold">Delivery Area</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(["inside_dhaka", "outside_dhaka"] as Area[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setArea(a)}
                      className={`rounded-md border p-3 text-center transition-colors ${
                        area === a ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="text-sm font-semibold">{a === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka"}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(getShippingRate(settingsQuery.data, a))}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-card p-6">
                <h2 className="font-display text-xl font-semibold">Contact Details</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="address">Delivery address</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House, road, area, city"
                    rows={2}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="note">Order note (optional)</Label>
                  <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any special instruction for your order" rows={2} />
                </div>
              </div>

              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold" /> Secure checkout — your details are handled with care</li>
                <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-gold" /> Delivery typically within 2–4 business days</li>
              </ul>
            </div>

            <aside className="h-fit rounded-lg border border-border/70 bg-card p-6">
              <h2 className="font-display text-xl font-semibold">Order Summary</h2>
              <ul className="mt-4 space-y-3">
                {items.map((item, idx) => {
                  const p = products[idx];
                  return (
                    <li key={item.id} className="flex items-center gap-3 text-sm">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                        {p?.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full rounded object-cover" /> : <ShoppingBag className="h-4 w-4 text-gold/50" />}
                      </span>
                      <span className="flex-1 truncate">{p?.name}</span>
                      <span className="text-muted-foreground">×{item.quantity}</span>
                      <span className="font-medium">{formatPrice(p ? parseFloat(p.price) * item.quantity : 0)}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span><span>{formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3 font-display text-lg font-semibold">
                  <span>Total</span><span className="text-primary">{formatPrice(total)}</span>
                </div>
              </div>
              <Button
                size="lg"
                className="btn-press mt-6 w-full gold-gradient text-primary-foreground"
                disabled={placeMutation.isPending}
                onClick={submit}
              >
                {placeMutation.isPending ? "Placing order…" : "Place Order"}
                {!placeMutation.isPending && <ArrowRight className="ml-1 h-4 w-4" />}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">Cash on Delivery</p>
            </aside>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
