import StoreLayout from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatPrice, getShippingRate, useStoreSettings } from "@/lib/zen";
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Cart() {
  const { user } = useAuth();
  const settingsQuery = useStoreSettings();
  const utils = trpc.useUtils();
  const cartQuery = trpc.cart.list.useQuery(undefined, { enabled: !!user });
  const updateMutation = trpc.cart.updateQuantity.useMutation({
    onMutate: async (input) => {
      await utils.cart.list.cancel();
      const prev = utils.cart.list.getData();
      if (prev) {
        utils.cart.list.setData(undefined, {
          ...prev,
          items: prev.items
            .map((i) => (i.productId === input.productId ? { ...i, quantity: input.quantity } : i))
            .filter((i) => i.quantity > 0),
        });
      }
      return prev;
    },
    onError: (_e, _input, prev) => {
      if (prev) utils.cart.list.setData(undefined, prev);
    },
    onSettled: () => utils.cart.list.invalidate(),
  });
  const [area, setArea] = useState<"inside_dhaka" | "outside_dhaka">("inside_dhaka");

  const items = cartQuery.data?.items ?? [];
  const products = items.map((i) => cartQuery.data?.productMap?.get(i.productId));
  const subtotal = items.reduce((sum, i, idx) => {
    const p = products[idx];
    return sum + (p ? parseFloat(p.price) * i.quantity : 0);
  }, 0);
  const shipping = getShippingRate(settingsQuery.data, area);
  const total = subtotal + shipping;

  return (
    <StoreLayout>
      <div className="container py-10">
        <h1 className="font-display text-4xl font-semibold">Your Cart</h1>

        {!user ? (
          <div className="mt-12 flex flex-col items-center rounded-lg border border-dashed border-border py-20 text-center">
            <ShoppingBag className="mb-4 h-10 w-10 text-gold/50" />
            <h2 className="font-display text-xl font-medium">Sign in to view your cart</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Your cart is tied to your account so your pieces stay safe across devices.
            </p>
            <Button className="btn-press mt-5 gold-gradient text-primary-foreground" onClick={() => startLogin()}>
              Sign in
            </Button>
          </div>
        ) : cartQuery.isLoading ? (
          <div className="mt-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-12 flex flex-col items-center rounded-lg border border-dashed border-border py-20 text-center">
            <ShoppingBag className="mb-4 h-10 w-10 text-gold/50" />
            <h2 className="font-display text-xl font-medium">Your cart is empty</h2>
            <p className="mt-2 text-sm text-muted-foreground">Explore the collection and find something extraordinary.</p>
            <Button asChild className="btn-press mt-5">
              <Link href="/shop">
                Shop Now <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {items.map((item, idx) => {
                const p = products[idx];
                if (!p) return null;
                return (
                  <div key={item.id} className="flex gap-4 rounded-lg border border-border/70 bg-card p-4">
                    <Link href={`/product/${p.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><ShoppingBag className="h-6 w-6 text-gold/40" /></div>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/product/${p.slug}`} className="font-display text-base font-medium hover:text-primary">{p.name}</Link>
                        <span className="font-semibold text-primary">{formatPrice(parseFloat(p.price) * item.quantity)}</span>
                      </div>
                      {p.comparePrice && p.comparePrice !== p.price && (
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(p.comparePrice)}</span>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex items-center overflow-hidden rounded-md border border-border">
                          <button
                            aria-label="Decrease"
                            className="btn-press px-2.5 py-1.5 text-foreground/70 hover:bg-accent"
                            onClick={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity - 1 })}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-9 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            aria-label="Increase"
                            className="btn-press px-2.5 py-1.5 text-foreground/70 hover:bg-accent"
                            onClick={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity + 1 })}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          aria-label="Remove"
                          className="btn-press text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => updateMutation.mutate({ productId: item.productId, quantity: 0 })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Continue shopping
              </Link>
            </div>

            <aside className="h-fit rounded-lg border border-border/70 bg-card p-6">
              <h2 className="font-display text-xl font-semibold">Delivery Area</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setArea("inside_dhaka")}
                  className={`rounded-md border p-3 text-center transition-colors ${
                    area === "inside_dhaka" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-semibold">Inside Dhaka</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(getShippingRate(settingsQuery.data, "inside_dhaka"))}</p>
                </button>
                <button
                  onClick={() => setArea("outside_dhaka")}
                  className={`rounded-md border p-3 text-center transition-colors ${
                    area === "outside_dhaka" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-semibold">Outside Dhaka</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(getShippingRate(settingsQuery.data, "outside_dhaka"))}</p>
                </button>
              </div>
              <div className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping ({area === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka"})</span>
                  <span>{formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3 font-display text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </div>
              <Button
                asChild
                size="lg"
                className="btn-press mt-6 w-full gold-gradient text-primary-foreground"
              >
                <Link href={`/checkout?area=${area}`}>
                  Proceed to Checkout <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">Cash on Delivery</p>
            </aside>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
