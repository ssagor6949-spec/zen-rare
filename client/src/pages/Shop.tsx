import StoreLayout from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/zen";
import { ArrowRight, SlidersHorizontal, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";

const PRICE_CAPS = [1000, 2500, 5000, 10000];

export default function Shop() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const initialCat = params.get("cat");
  const initialQ = params.get("q");

  const [category, setCategory] = useState<string | null>(initialCat);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [q, setQ] = useState(initialQ ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const categoriesQuery = trpc.content.categories.useQuery();
  const productsQuery = trpc.content.products.useQuery({
    search: q || undefined,
    maxPrice: maxPrice ?? undefined,
    categoryId: category ? parseInt(category, 10) : undefined,
  });

  useEffect(() => setCategory(params.get("cat")), [params]);
  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  const activeCatName =
    category && categoriesQuery.data?.find((c) => c.id === parseInt(category, 10))?.name;

  const sidebar = (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide">Categories</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <button
              onClick={() => setCategory(null)}
              className={`w-full text-left transition-colors ${!category ? "font-medium text-primary" : "text-foreground/70 hover:text-foreground"}`}
            >
              All Collections
            </button>
          </li>
          {categoriesQuery.data?.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setCategory(String(c.id))}
                className={`w-full text-left transition-colors ${category === String(c.id) ? "font-medium text-primary" : "text-foreground/70 hover:text-foreground"}`}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide">Price</h3>
        <div className="flex flex-wrap gap-2">
          {[null, ...PRICE_CAPS].map((cap) => (
            <button
              key={cap ?? "all"}
              onClick={() => setMaxPrice(cap)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                maxPrice === cap
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground/70 hover:border-primary hover:text-primary"
              }`}
            >
              {cap === null ? "Any" : `≤ ${formatPrice(cap)}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <StoreLayout>
      <section className="container py-10">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-semibold">{activeCatName ?? "Shop All"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {productsQuery.data ? `${productsQuery.data.length} pieces` : "Loading collection..."}
            {q ? ` matching “${q}”` : ""}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            {categoriesQuery.isLoading ? <Skeleton className="h-56 rounded-lg" /> : sidebar}
          </aside>

          <div className="lg:hidden">
            <Button
              variant="outline"
              size="sm"
              className="btn-press gap-1.5"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
            {sidebarOpen && (
              <div className="mt-4 rounded-lg border border-border p-4">
                {categoriesQuery.isLoading ? <Skeleton className="h-56" /> : sidebar}
              </div>
            )}
          </div>

          <div>
            {productsQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                ))}
              </div>
            ) : productsQuery.data && productsQuery.data.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {productsQuery.data.map((p) => (
                  <Link key={p.id} href={`/product/${p.slug}`}>
                    <div className="group overflow-hidden rounded-lg border border-border/70 bg-card transition-all duration-300 hover:luxury-shadow-lg hover:-translate-y-0.5">
                      <div className="relative aspect-square overflow-hidden bg-muted">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-secondary to-accent/60">
                            <Sparkles className="h-8 w-8 text-gold/40" />
                          </div>
                        )}
                        {p.comparePrice && p.comparePrice !== p.price && (
                          <span className="absolute left-3 top-3 rounded-full bg-destructive/90 px-2.5 py-0.5 text-[11px] font-semibold text-white">SALE</span>
                        )}
                        {p.stock <= 0 && (
                          <span className="absolute inset-0 flex items-center justify-center bg-ink/60 text-sm font-medium text-white">Sold out</span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="line-clamp-2 font-display text-base font-medium leading-snug">{p.name}</h3>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="font-semibold text-primary">{formatPrice(p.price)}</span>
                          {p.comparePrice && p.comparePrice !== p.price && (
                            <span className="text-sm text-muted-foreground line-through">{formatPrice(p.comparePrice)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
                <Sparkles className="mb-3 h-8 w-8 text-gold/40" />
                <p className="font-display text-lg font-medium">No pieces found</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Try adjusting your filters or browse the full collection.
                </p>
                <Button
                  variant="outline"
                  className="btn-press mt-5"
                  onClick={() => {
                    setCategory(null);
                    setMaxPrice(null);
                    setQ("");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}
