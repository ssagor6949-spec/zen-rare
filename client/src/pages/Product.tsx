import StoreLayout from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatPrice, starString, trackViewContent } from "@/lib/zen";
import { Check, Minus, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useParams } from "wouter";

export default function Product() {
  const params = useParams<{ slug: string }>();
  const { user } = useAuth();
  const slug = params.slug;
  const id = parseInt(slug?.split("-").pop() ?? "0", 10);

  const productQuery = trpc.content.productBySlug.useQuery({ slug: slug ?? "" }, { enabled: !!slug });
  const ratingQuery = trpc.content.avgRating.useQuery(
    { productId: id },
    { enabled: !!id && !isNaN(id) },
  );
  const reviewsQuery = trpc.reviews.byProduct.useQuery({ productId: id }, { enabled: !!id && !isNaN(id) });
  const addMutation = trpc.cart.add.useMutation({
    onSuccess: () => toast.success("Added to cart"),
    onError: (e) => toast.error(e.message),
  });
  const reviewMutation = trpc.reviews.create.useMutation({
    onSuccess: () => {
      toast.success("Review submitted — thank you!");
      setRating(0);
      setTitle("");
      setComment("");
      utils.reviews.byProduct.invalidate({ productId: product!.id });
      utils.content.avgRating.invalidate({ productId: product!.id });
    },
    onError: (e) => toast.error(e.message),
  });

  const utils = trpc.useUtils();
  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  const product = productQuery.data;

  useEffect(() => {
    if (product) trackViewContent(product.id, product.price);
  }, [product]);

  const handleAdd = () => {
    if (!user) {
      toast("Please sign in to add items to your cart", {
        action: <Button size="sm" onClick={() => startLogin()}>Sign in</Button>,
      });
      return;
    }
    addMutation.mutate({ productId: product!.id });
  };

  const submitReview = () => {
    if (!user) return;
    if (rating < 1) {
      toast.error("Choose a star rating first");
      return;
    }
    reviewMutation.mutate({ productId: product!.id, rating, title: title || undefined, comment: comment || undefined });
  };

  return (
    <StoreLayout>
      <div className="container py-8">
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-foreground">Shop</Link>
          <span>/</span>
          <span className="truncate text-foreground">{product?.name ?? "…"}</span>
        </nav>

        {productQuery.isLoading && (
          <div className="grid gap-10 md:grid-cols-2">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4 rounded" />
              <Skeleton className="h-24 w-full rounded" />
              <Skeleton className="h-10 w-32 rounded" />
              <Skeleton className="h-12 w-full rounded" />
            </div>
          </div>
        )}

        {!productQuery.isLoading && product && (
          <div className="grid gap-10 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-lg border border-border/70 bg-card">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-secondary to-accent/60">
                  <Sparkles className="h-12 w-12 text-gold/40" />
                </div>
              )}
              {product.comparePrice && product.comparePrice !== product.price && (
                <span className="absolute left-4 top-4 rounded-full bg-destructive/90 px-3 py-1 text-xs font-semibold text-white">SALE</span>
              )}
            </div>

            <div className="flex flex-col">
              {ratingQuery.data && ratingQuery.data.count > 0 && (
                <div className="mb-2 flex items-center gap-2 text-sm text-gold-dark">
                  <span>{starString(ratingQuery.data.avg)}</span>
                  <span className="text-muted-foreground">{ratingQuery.data.avg.toFixed(1)} · {ratingQuery.data.count} review{ratingQuery.data.count !== 1 ? "s" : ""}</span>
                </div>
              )}
              <h1 className="font-display text-3xl font-semibold leading-snug md:text-4xl">{product.name}</h1>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-semibold text-primary">{formatPrice(product.price)}</span>
                {product.comparePrice && product.comparePrice !== product.price && (
                  <span className="text-lg text-muted-foreground line-through">{formatPrice(product.comparePrice)}</span>
                )}
              </div>
              {product.description && (
                <p className="mt-5 max-w-prose leading-relaxed text-foreground/80">{product.description}</p>
              )}
              <div className="mt-5 flex items-center gap-3 text-sm">
                {product.stock > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <Check className="h-4 w-4" /> In stock ({product.stock} available)
                  </span>
                ) : (
                  <span className="text-destructive">Sold out</span>
                )}
              </div>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center overflow-hidden rounded-md border border-border">
                  <button
                    aria-label="Decrease"
                    className="btn-press px-3 py-2 text-foreground/70 hover:bg-accent"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center font-medium">{qty}</span>
                  <button
                    aria-label="Increase"
                    className="btn-press px-3 py-2 text-foreground/70 hover:bg-accent"
                    onClick={() => setQty((q) => Math.min(99, q + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  size="lg"
                  className="btn-press flex-1 gold-gradient text-primary-foreground"
                  disabled={product.stock <= 0 || addMutation.isPending}
                  onClick={handleAdd}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  {addMutation.isPending ? "Adding…" : "Add to Cart"}
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Delivery inside Dhaka ৳70 · outside Dhaka ৳120 — Cash on Delivery
              </p>
            </div>
          </div>
        )}

        {!productQuery.isLoading && !product && (
          <div className="flex flex-col items-center py-24 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-gold/40" />
            <h2 className="font-display text-xl font-medium">This piece could not be found</h2>
            <Link href="/shop" className="mt-4 text-sm font-medium text-primary hover:underline">
              Browse the collection →
            </Link>
          </div>
        )}

        {/* Reviews */}
        {product && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-semibold">Reviews</h2>
            <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                {reviewsQuery.isLoading &&
                  Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                {reviewsQuery.data && reviewsQuery.data.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                    No reviews yet — be the first to share your thoughts.
                  </p>
                )}
                {reviewsQuery.data?.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border/70 bg-card p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gold-dark">{starString(r.rating)}</span>
                        <span className="text-sm font-medium">{r.title ?? "—"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {r.comment && <p className="mt-2 text-sm leading-relaxed text-foreground/80">{r.comment}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">— {r.authorName ?? "Anonymous"}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border/70 bg-card p-5">
                <h3 className="font-display text-lg font-medium">Write a review</h3>
                {!user ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Sign in to share your experience.</p>
                    <Button size="sm" className="btn-press w-full gold-gradient text-primary-foreground" onClick={() => startLogin()}>
                      Sign in
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} aria-label={`${n} stars`} onClick={() => setRating(n)} className="btn-press text-2xl transition-transform hover:scale-110">
                          <span className={n <= rating ? "text-gold" : "text-border"}>★</span>
                        </button>
                      ))}
                    </div>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Review title (optional)"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                    />
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your thoughts (optional)"
                      rows={3}
                    />
                    <Button
                      className="btn-press w-full gold-gradient text-primary-foreground"
                      disabled={reviewMutation.isPending || rating < 1}
                      onClick={submitReview}
                    >
                      {reviewMutation.isPending ? "Submitting…" : "Submit review"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </StoreLayout>
  );
}
