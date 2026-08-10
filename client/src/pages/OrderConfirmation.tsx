import StoreLayout from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/zen";
import { ArrowLeft, Printer, ShoppingBag, Sparkles } from "lucide-react";
import { Link, useParams } from "wouter";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending confirmation",
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

export default function OrderConfirmation() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const orderQuery = trpc.orders.byId.useQuery({ id }, { enabled: !!id && !isNaN(id) });
  const items = orderQuery.data?.items ?? [];
  const order = orderQuery.data?.order;

  return (
    <StoreLayout>
      <div className="container py-10">
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground print:hidden">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/account" className="hover:text-foreground">Account</Link>
          <span>/</span>
          <span className="text-foreground">Order {id}</span>
        </nav>

        <div className="print:block">
          <div className="print:hidden mb-8">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <Sparkles className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-semibold">Thank you for your order</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  We have received your order and will confirm it shortly. You will pay cash on delivery.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" className="btn-press gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print invoice
              </Button>
              <Button asChild variant="outline" className="btn-press">
                <Link href="/account">
                  <ArrowLeft className="mr-1 h-4 w-4" /> My orders
                </Link>
              </Button>
              <Button asChild className="btn-press gold-gradient text-primary-foreground">
                <Link href="/shop">Continue shopping</Link>
              </Button>
            </div>
          </div>

          {orderQuery.isLoading && <Skeleton className="h-96 rounded-lg" />}

          {!orderQuery.isLoading && order && (
            <div id="invoice" className="rounded-lg border border-border/70 bg-card p-6 md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
                <div>
                  <p className="font-display text-3xl font-semibold">
                    <span className="gold-text">ZEN</span> RARE
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Curated luxury, rarely found</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-display text-lg font-semibold">Invoice</p>
                  <p className="text-muted-foreground">{order.orderNumber}</p>
                  <p className="text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                  <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_CLASS[order.status] ?? "bg-muted text-foreground"}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>
              </div>

              <div className="grid gap-6 py-6 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivered to</h3>
                  <p className="mt-2 text-sm leading-relaxed">
                    {order.customerName}<br />
                    {order.customerPhone}<br />
                    {order.customerAddress}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivery area</h3>
                  <p className="mt-2 text-sm">{order.shippingArea === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka"}</p>
                  <p className="mt-4 text-xs text-muted-foreground">Payment method: Cash on Delivery</p>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-3 font-medium">Item</th>
                    <th className="py-3 text-right font-medium">Qty</th>
                    <th className="py-3 text-right font-medium">Price</th>
                    <th className="py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-b border-border/60">
                      <td className="py-3">{i.productName}</td>
                      <td className="py-3 text-right">{i.quantity}</td>
                      <td className="py-3 text-right">{formatPrice(i.price)}</td>
                      <td className="py-3 text-right font-medium">{formatPrice(parseFloat(i.price) * i.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-xs space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping ({order.shippingArea === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka"})</span>
                    <span>{formatPrice(order.shippingCharge)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3 font-display text-lg font-semibold">
                    <span>Total</span><span className="text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!orderQuery.isLoading && !order && (
            <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-20 text-center">
              <ShoppingBag className="mb-4 h-10 w-10 text-gold/50" />
              <h2 className="font-display text-xl font-medium">Order not found</h2>
              <Link href="/account" className="mt-4 text-sm font-medium text-primary hover:underline">
                View your orders
              </Link>
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
