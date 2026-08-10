import StoreLayout from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatPrice, starString } from "@/lib/zen";
import { Package, Star, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  returned: "Returned",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700",
  processing: "bg-blue-500/15 text-blue-700",
  shipped: "bg-indigo-500/15 text-indigo-700",
  delivered: "bg-emerald-500/15 text-emerald-700",
  returned: "bg-rose-500/15 text-rose-700",
};

export default function Account() {
  const { user, loading, logout } = useAuth();
  const utils = trpc.useUtils();
  const ordersQuery = trpc.orders.myOrders.useQuery(undefined, { enabled: !!user });
  const reviewsQuery = trpc.reviews.mine.useQuery(undefined, { enabled: !!user });
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated");
      utils.auth.me.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  const ordersData = ordersQuery.data;
  const orderRows = (ordersData?.orders ?? []).map((o) => ({
    ...o,
    items: (ordersData?.items ?? []).filter((i) => i.orderId === o.id),
  }));

  if (!loading && !user) {
    return (
      <StoreLayout>
        <div className="container flex flex-col items-center justify-center py-24 text-center">
          <UserRound className="mb-4 h-10 w-10 text-gold/50" />
          <h1 className="font-display text-2xl font-semibold">Please sign in to view your account</h1>
          <Button className="btn-press mt-5 gold-gradient text-primary-foreground" onClick={() => startLogin()}>
            Sign in
          </Button>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="container py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold">My Account</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" className="btn-press" onClick={() => logout()}>
            Log out
          </Button>
        </div>

        {loading || !user ? (
          <Skeleton className="mt-8 h-64 rounded-lg" />
        ) : (
          <Tabs defaultValue="orders" className="mt-8">
            <TabsList className="bg-muted">
              <TabsTrigger value="orders" className="gap-1.5">
                <Package className="h-4 w-4" /> Orders
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5">
                <Star className="h-4 w-4" /> Reviews
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1.5">
                <UserRound className="h-4 w-4" /> Profile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="mt-6 space-y-4">
              {ordersQuery.isLoading &&
                Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
              {!ordersQuery.isLoading && orderRows.length === 0 && (
                <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-16 text-center">
                  <Package className="mb-3 h-8 w-8 text-gold/40" />
                  <p className="font-display text-lg font-medium">No orders yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Your order history will appear here.</p>
                  <Button asChild className="btn-press mt-4">
                    <Link href="/shop">Start shopping</Link>
                  </Button>
                </div>
              )}
              {orderRows.map((o) => (
                <div key={o.id} className="rounded-lg border border-border/70 bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <Link href={`/order/${o.id}`} className="font-display text-base font-medium hover:text-primary">
                          Order {o.orderNumber}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_CLASS[o.status] ?? "bg-muted text-foreground"}`}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                      <span className="font-semibold text-primary">{formatPrice(o.total)}</span>
                      <Button asChild variant="ghost" size="sm" className="btn-press">
                        <Link href={`/order/${o.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {o.items?.map((i) => (
                      <span key={i.id} className="rounded-full border border-border bg-muted px-2.5 py-1">
                        {i.productName} ×{i.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="reviews" className="mt-6 space-y-4">
              {reviewsQuery.isLoading &&
                Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
              {!reviewsQuery.isLoading && reviewsQuery.data && reviewsQuery.data.length === 0 && (
                <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-16 text-center">
                  <Star className="mb-3 h-8 w-8 text-gold/40" />
                  <p className="font-display text-lg font-medium">No reviews yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Reviews you write will appear here.</p>
                  <Button asChild className="btn-press mt-4">
                    <Link href="/shop">Browse products</Link>
                  </Button>
                </div>
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
                </div>
              ))}
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              <div className="max-w-md rounded-lg border border-border/70 bg-card p-6">
                <h2 className="font-display text-xl font-semibold">Profile details</h2>
                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Full name</Label>
                    <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <Button
                    className="btn-press w-full gold-gradient text-primary-foreground"
                    disabled={updateProfileMutation.isPending}
                    onClick={() => {
                      if (!name.trim()) return toast.error("Name is required");
                      updateProfileMutation.mutate({ name: name.trim(), email: email.trim() || undefined });
                    }}
                  >
                    {updateProfileMutation.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </StoreLayout>
  );
}
