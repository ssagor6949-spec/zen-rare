import StoreLayout from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatPrice, trackPageView, useStoreSettings } from "@/lib/zen";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";

function ProductCard({ product }: { product: { id: number; name: string; slug: string; price: string; comparePrice?: string | null; imageUrl?: string | null; stock: number; categoryId?: number | null } }) {
  const ratingQuery = trpc.content.avgRating.useQuery({ productId: product.id });
  return (
    <Link href={`/product/${product.slug}`}>
      <div className="group overflow-hidden rounded-lg border border-border/70 bg-card transition-all duration-300 hover:luxury-shadow-lg hover:-translate-y-0.5">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Sparkles className="h-8 w-8 text-gold/40" />
            </div>
          )}
          {product.comparePrice && product.comparePrice !== product.price && (
            <span className="absolute left-3 top-3 rounded-full bg-destructive/90 px-2.5 py-0.5 text-[11px] font-semibold text-white">
              SALE
            </span>
          )}
          {product.stock <= 0 && (
            <span className="absolute inset-0 flex items-center justify-center bg-ink/60 text-sm font-medium text-white">
              Sold out
            </span>
          )}
        </div>
        <div className="p-4">
          {ratingQuery.data && ratingQuery.data.count > 0 ? (
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-xs text-gold-dark">{"★".repeat(Math.round(ratingQuery.data.avg))}</span>
              <span className="text-[11px] text-muted-foreground">({ratingQuery.data.count})</span>
            </div>
          ) : (
            <div className="mb-1 h-3.5 w-16" />
          )}
          <h3 className="line-clamp-2 font-display text-base font-medium leading-snug">{product.name}</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-semibold text-primary">{formatPrice(product.price)}</span>
            {product.comparePrice && product.comparePrice !== product.price && (
              <span className="text-sm text-muted-foreground line-through">{formatPrice(product.comparePrice)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const settingsQuery = useStoreSettings();
  const slidersQuery = trpc.content.sliders.useQuery();
  const bannersQuery = trpc.content.banners.useQuery();
  const categoriesQuery = trpc.content.categories.useQuery();
  const featuredQuery = trpc.content.products.useQuery({ search: undefined, maxPrice: undefined, categoryId: undefined });
  const catsQuery = trpc.catalog.categoriesAll.useQuery(undefined, { enabled: false });
  const storeName = settingsQuery.data?.storeName || "ZEN RARE";

  const featured =
    featuredQuery.data?.filter((p) => p.isFeatured === 1).slice(0, 8) ??
    featuredQuery.data?.slice(0, 8) ??
    [];

  useEffect(() => {
    trackPageView();
  }, []);

  useEffect(() => {
    if (settingsQuery.data) localStorage.setItem("zen-settings", JSON.stringify(settingsQuery.data));
  }, [settingsQuery.data]);

  const empty = slidersQuery.data?.length === 0 && categoriesQuery.data?.length === 0 && featured.length === 0;

  return (
    <StoreLayout>
      {/* Hero */}
      <section className="hero-bg text-white">
        <div className="container flex min-h-[520px] flex-col items-center justify-center gap-6 py-24 text-center">
          <p className="fade-up text-xs font-medium uppercase tracking-wide-lux text-gold-light">
            Hand-curated · Delivered with care
          </p>
          <h1 className="fade-up font-display text-5xl font-semibold leading-tight md:text-6xl" style={{ animationDelay: "60ms" }}>
            {storeName}
          </h1>
          <p className="fade-up max-w-xl text-base text-white/70 md:text-lg" style={{ animationDelay: "120ms" }}>
            {settingsQuery.data?.storeTagline || "Curated luxury, rarely found. Extraordinary pieces for those who seek them."}
          </p>
          <div className="fade-up flex gap-3" style={{ animationDelay: "180ms" }}>
            <Button asChild size="lg" className="btn-press gold-gradient text-primary-foreground">
              <Link href="/shop">
                Shop the Collection <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {empty && (
        <section className="container py-20 text-center">
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-gold/50" />
          <h2 className="font-display text-2xl font-semibold">Our collection is arriving soon</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            We are curating something extraordinary. Check back shortly for the first drop.
          </p>
        </section>
      )}

      {/* Sliders / promos */}
      {!empty && slidersQuery.data && slidersQuery.data.length > 0 && (
        <section className="container py-12">
          <div className="grid gap-4 md:grid-cols-2">
            {slidersQuery.data.slice(0, 2).map((s, i) => (
              <Link
                key={s.id}
                href={s.linkUrl || "/shop"}
                className={`fade-up group relative block overflow-hidden rounded-xl ${i === 1 ? "md:mt-8" : ""}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {s.imageUrl ? (
                  <img src={s.imageUrl} alt={s.title ?? "Promo"} className="aspect-[16/8] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="gold-gradient flex aspect-[16/8] w-full items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary-foreground/70" />
                  </div>
                )}
                {(s.title || s.subtitle) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-left">
                    {s.title && <h3 className="font-display text-lg font-semibold text-white">{s.title}</h3>}
                    {s.subtitle && <p className="text-sm text-white/80">{s.subtitle}</p>}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {categoriesQuery.data && categoriesQuery.data.length > 0 && (
        <section className="container py-12">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-display text-3xl font-semibold">Shop by Category</h2>
            <Link href="/shop" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {categoriesQuery.data.slice(0, 8).map((c, i) => (
              <Link key={c.id} href={`/shop?cat=${c.id}`}>
                <div className="fade-up group relative overflow-hidden rounded-lg border border-border/70" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="aspect-square overflow-hidden bg-muted">
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-secondary to-accent/60">
                        <Sparkles className="h-6 w-6 text-gold/50" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-center">
                    <span className="font-display text-sm font-medium">{c.name}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {!empty && (
        <section className="container py-12">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-display text-3xl font-semibold">The Collection</h2>
            <Link href="/shop" className="text-sm font-medium text-primary hover:underline">
              Browse all pieces
            </Link>
          </div>
          {featuredQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          {featuredQuery.data && featuredQuery.data.length > 8 && (
            <div className="mt-10 text-center">
              <Button asChild variant="outline" size="lg" className="btn-press">
                <Link href="/shop">
                  Discover More <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Trust strip */}
      {!empty && (
        <section className="border-t border-border/70 bg-card">
          <div className="container grid gap-6 py-12 text-center md:grid-cols-3">
            <div>
              <p className="font-display text-lg font-semibold">Nationwide Delivery</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Inside Dhaka {formatPrice(settingsQuery.data?.shippingInsideDhaka ?? "70")} · Outside {formatPrice(settingsQuery.data?.shippingOutsideDhaka ?? "120")}
              </p>
            </div>
            <div>
              <p className="font-display text-lg font-semibold">Cash on Delivery</p>
              <p className="mt-1 text-sm text-muted-foreground">Pay when your piece arrives at your door</p>
            </div>
            <div>
              <p className="font-display text-lg font-semibold">Trusted Couriers</p>
              <p className="mt-1 text-sm text-muted-foreground">Pathao · Steadfast · RedX · Paperfly</p>
            </div>
          </div>
        </section>
      )}
    </StoreLayout>
  );
}
