import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/zen";
import {
  AlertTriangle,
  Archive,
  ClipboardList,
  ArrowUpFromLine,
  Download,
  FileText,
  Filter,
  Lock,
  Package,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  UserCheck,
  Bell,
  RotateCcw,
} from "lucide-react";
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

function useTab(defaultTab = "dashboard") {
  const params = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(params.get("tab") ?? defaultTab);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    p.set("tab", tab);
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
  }, [tab]);
  return [tab, setTab] as const;
}

type OrderRow = {
  id: number;
  orderNumber: string;
  userId: number | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  shippingArea: string;
  shippingCharge: string;
  subtotal: string;
  total: string;
  status: string;
  noResponse: number | null;
  isDeleted: number | null;
  courier: string | null;
  courierTrackingId: string | null;
  note?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function EmptyState({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-16 text-center">
      <Icon className="mb-3 h-8 w-8 text-gold/40" />
      <p className="font-display text-lg font-medium">{title}</p>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard tab                                                       */
/* ------------------------------------------------------------------ */
function DashboardTab() {
  const statsQuery = trpc.admin.dashboard.stats.useQuery();
  const activityQuery = trpc.admin.activity.list.useQuery();
  const s = statsQuery.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total orders</p>
            {statsQuery.isLoading ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="mt-2 font-display text-3xl font-semibold">{s?.totalOrders ?? 0}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending orders</p>
            {statsQuery.isLoading ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="mt-2 font-display text-3xl font-semibold">{s?.pendingOrders ?? 0}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Revenue (delivered)</p>
            {statsQuery.isLoading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="mt-2 font-display text-3xl font-semibold">{formatPrice(s?.totalRevenue ?? 0)}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-display text-lg font-semibold">Low stock alerts</h3>
          {statsQuery.isLoading ? (
            <Skeleton className="mt-4 h-16" />
          ) : (s?.lowStockProducts ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No products are running low on stock.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {(s?.lowStockProducts ?? []).map((p) => (
                <li key={(p as { id?: number }).id} className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-4 py-2 text-sm">
                  <span>{(p as { name: string }).name}</span>
                  <Badge variant="outline" className="border-amber-400/60 text-amber-700">
                    {(p as { stock: number }).stock} in stock
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-display text-lg font-semibold">Recent activity</h3>
          {activityQuery.isLoading ? (
            <Skeleton className="mt-4 h-32" />
          ) : (activityQuery.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border/60">
              {(activityQuery.data ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span>
                    <span className="font-medium">{a.actorName ?? "Unknown"}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>{" "}
                    {a.details && <span className="text-muted-foreground">— {a.details}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const { user, loading, isAuthenticated } = useAuth();
  const [tab, setTab] = useTab();

  if (loading) {
    return <DashboardLayout><Skeleton className="m-8 h-96" /></DashboardLayout>;
  }

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Lock className="mb-4 h-10 w-10 text-gold/50" />
          <h1 className="font-display text-2xl font-semibold">Sign in to access the admin panel</h1>
          <Button className="btn-press mt-5 gold-gradient text-primary-foreground" onClick={() => startLogin()}>
            Sign in
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (user && user.role !== "admin" && user.role !== "superadmin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldCheck className="mb-4 h-10 w-10 text-gold/50" />
          <h1 className="font-display text-2xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account does not have permission to view this panel.</p>
          <Button asChild className="btn-press mt-5">
            <Link href="/">Back to store</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="font-display text-3xl font-semibold">
          <span className="gold-text">Admin</span> Panel
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your store, orders, and customers.</p>
        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="flex w-full justify-start overflow-x-auto bg-muted">
            <TabsTrigger value="dashboard" className="gap-1.5 whitespace-nowrap"><FileText className="h-4 w-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 whitespace-nowrap"><ClipboardList className="h-4 w-4" />Orders</TabsTrigger>
            <TabsTrigger value="abandoned" className="gap-1.5 whitespace-nowrap"><Archive className="h-4 w-4" />Abandoned</TabsTrigger>
            <TabsTrigger value="inventory" className="gap-1.5 whitespace-nowrap"><Package className="h-4 w-4" />Inventory</TabsTrigger>
            <TabsTrigger value="customers" className="gap-1.5 whitespace-nowrap"><UserCheck className="h-4 w-4" />Customers</TabsTrigger>
            <TabsTrigger value="couriers" className="gap-1.5 whitespace-nowrap"><Truck className="h-4 w-4" />Couriers</TabsTrigger>
            <TabsTrigger value="fraud" className="gap-1.5 whitespace-nowrap"><AlertTriangle className="h-4 w-4" />Fraud</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 whitespace-nowrap"><Bell className="h-4 w-4" />Activity</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 whitespace-nowrap"><Filter className="h-4 w-4" />Settings</TabsTrigger>
            <TabsTrigger value="backup" className="gap-1.5 whitespace-nowrap"><Download className="h-4 w-4" />Backup</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-6"><DashboardTab /></TabsContent>
          <TabsContent value="orders" className="mt-6"><OrdersTab role={user?.role} /></TabsContent>
          <TabsContent value="abandoned" className="mt-6"><AbandonedTab /></TabsContent>
          <TabsContent value="inventory" className="mt-6"><InventoryTab /></TabsContent>
          <TabsContent value="customers" className="mt-6"><CustomersTab role={user?.role} /></TabsContent>
          <TabsContent value="couriers" className="mt-6"><CouriersTab /></TabsContent>
          <TabsContent value="fraud" className="mt-6"><FraudTab /></TabsContent>
          <TabsContent value="activity" className="mt-6"><ActivityTab /></TabsContent>
          <TabsContent value="settings" className="mt-6"><SettingsTab /></TabsContent>
          <TabsContent value="backup" className="mt-6"><BackupTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
/* ------------------------------------------------------------------ */
/* Orders tab                                                          */
/* ------------------------------------------------------------------ */
function OrderTable({ rows, onOpen }: { rows: OrderRow[]; onOpen: (o: OrderRow) => void }) {
  if (rows.length === 0) return <EmptyState icon={ClipboardList} title="No orders here" />;
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Area</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
              <td className="px-4 py-3">
                <p>{o.customerName}</p>
                <p className="text-xs text-muted-foreground">{o.customerPhone}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{o.shippingArea === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka"}</td>
              <td className="px-4 py-3 font-medium">{formatPrice(o.total)}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[o.status] ?? "bg-muted text-foreground"}`}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" size="sm" className="btn-press" onClick={() => onOpen(o)}>
                  Open
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersTab({ role }: { role?: string }) {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const invalidate = () => {
    utils.admin.orders.pending.invalidate();
    utils.admin.orders.active.invalidate();
    utils.admin.orders.noResponse.invalidate();
    utils.admin.orders.deleted.invalidate();
    utils.admin.dashboard.stats.invalidate();
    utils.admin.activity.list.invalidate();
  };

  const pendingQuery = trpc.admin.orders.pending.useQuery();
  const activeQuery = trpc.admin.orders.active.useQuery();
  const noResponseQuery = trpc.admin.orders.noResponse.useQuery();
  const deletedQuery = trpc.admin.orders.deleted.useQuery();
  const searchQuery = trpc.admin.orders.search.useQuery({ query: search }, { enabled: search.trim().length >= 2 });

  const confirmMutation = trpc.admin.orders.confirm.useMutation({ onSuccess: () => { toast.success("Order confirmed"); invalidate(); } });
  const setStatusMutation = trpc.admin.orders.setStatus.useMutation({ onSuccess: () => { toast.success("Status updated"); invalidate(); setSelected(null); } });
  const noResponseMutation = trpc.admin.orders.noResponseToggle.useMutation({ onSuccess: () => { toast.success("No-response flag toggled"); invalidate(); } });
  const softDeleteMutation = trpc.admin.orders.softDelete.useMutation({ onSuccess: () => { toast.success("Order moved to deleted"); invalidate(); setSelected(null); } });
  const restoreMutation = trpc.admin.orders.restore.useMutation({ onSuccess: () => { toast.success("Order restored"); invalidate(); setSelected(null); } });
  const noteMutation = trpc.admin.orders.addNote.useMutation({ onSuccess: () => toast.success("Note added") });
  const courierMutation = trpc.admin.orders.courier.useMutation({ onSuccess: () => { toast.success("Courier updated"); invalidate(); } });

  const rows =
    search.trim().length >= 2 ? (searchQuery.data ?? []) :
    activeTab === "pending" ? (pendingQuery.data ?? []) :
    activeTab === "active" ? (activeQuery.data ?? []) :
    activeTab === "no-response" ? (noResponseQuery.data ?? []) :
    (deletedQuery.data ?? []);
  const isLoading =
    (search.trim().length >= 2 && searchQuery.isLoading) ||
    (activeTab === "pending" && pendingQuery.isLoading) ||
    (activeTab === "active" && activeQuery.isLoading) ||
    (activeTab === "no-response" && noResponseQuery.isLoading) ||
    (activeTab === "deleted" && deletedQuery.isLoading);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearch(""); }}>
          <TabsList className="bg-muted">
            <TabsTrigger value="pending" className="gap-1.5">Pending ({pendingQuery.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="active" className="gap-1.5">Active</TabsTrigger>
            <TabsTrigger value="no-response" className="gap-1.5">No Response</TabsTrigger>
            <TabsTrigger value="deleted" className="gap-1.5">Deleted</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative ml-auto w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, phone, order number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? <Skeleton className="h-64 rounded-lg" /> : (
        <OrderTable rows={rows} onOpen={setSelected} />
      )}

      {selected && (
        <OrderDetailDialog
          order={selected}
          role={role}
          onClose={() => setSelected(null)}
          onConfirm={confirmMutation.mutate}
          onSetStatus={setStatusMutation.mutate}
          onNoResponse={noResponseMutation.mutate}
          onSoftDelete={softDeleteMutation.mutate}
          onRestore={restoreMutation.mutate}
          onAddNote={noteMutation.mutate}
          onCourier={courierMutation.mutate}
          pendingConfirm={confirmMutation.isPending}
        />
      )}
    </div>
  );
}

function OrderDetailDialog(props: {
  order: OrderRow;
  role?: string;
  onClose: () => void;
  onConfirm: (input: { id: number }) => void;
  onSetStatus: (input: { id: number; status: "processing" | "shipped" | "delivered" | "returned" }) => void;
  onNoResponse: (input: { id: number }) => void;
  onSoftDelete: (input: { id: number }) => void;
  onRestore: (input: { id: number }) => void;
  onAddNote: (input: { id: number; message: string }) => void;
  onCourier: (input: { id: number; courier?: string; courierTrackingId?: string }) => void;
  pendingConfirm: boolean;
}) {
  const { order, onClose, onConfirm, onSetStatus, onNoResponse, onSoftDelete, onRestore, onAddNote, onCourier, pendingConfirm } = props;
  const detailQuery = trpc.admin.orders.detail.useQuery({ id: order.id }, { enabled: !!order.id });
  const [note, setNote] = useState("");
  const [courier, setCourier] = useState(order.courier ?? "");
  const [trackingId, setTrackingId] = useState(order.courierTrackingId ?? "");

  useEffect(() => {
    setCourier(order.courier ?? "");
    setTrackingId(order.courierTrackingId ?? "");
  }, [order]);

  const items = detailQuery.data?.items ?? [];
  const notes = detailQuery.data?.notes ?? [];
  const nextStatuses: Record<string, ("processing" | "shipped" | "delivered" | "returned")[]> = {
    pending: ["processing"],
    processing: ["shipped", "returned"],
    shipped: ["delivered", "returned"],
    delivered: [],
    returned: ["processing"],
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto print:block">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order {order.orderNumber}</span>
            <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_CLASS[order.status] ?? "bg-muted text-foreground"}`}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
            <p className="mt-1 font-medium">{order.customerName}</p>
            <p>{order.customerPhone}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Delivery</p>
            <p className="mt-1">{order.customerAddress}</p>
            <p className="text-muted-foreground">{order.shippingArea === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka"}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border text-left text-xs uppercase text-muted-foreground">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-border/60">
                <td className="py-2">{i.productName}</td>
                <td className="py-2 text-right">{i.quantity}</td>
                <td className="py-2 text-right font-medium">{formatPrice(i.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end text-sm">
          <p className="font-display text-lg font-semibold">Total: <span className="text-primary">{formatPrice(order.total)}</span></p>
        </div>

        <div className="print:hidden space-y-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Courier</p>
            <div className="flex gap-2">
              <Select value={courier} onValueChange={setCourier}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Courier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="pathao">Pathao</SelectItem>
                  <SelectItem value="steadfast">Steadfast</SelectItem>
                  <SelectItem value="redx">RedX</SelectItem>
                </SelectContent>
              </Select>
              <Input className="flex-1" placeholder="Tracking ID" value={trackingId} onChange={(e) => setTrackingId(e.target.value)} />
              <Button
                size="sm"
                className="btn-press"
                onClick={() => onCourier({ id: order.id, courier: courier || undefined, courierTrackingId: trackingId || undefined })}
              >
                Save
              </Button>
            </div>
          </div>

          {order.status === "pending" && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="btn-press gold-gradient text-primary-foreground" disabled={pendingConfirm} onClick={() => onConfirm({ id: order.id })}>
                Confirm order
              </Button>
              <Button size="sm" variant="outline" className="btn-press" onClick={() => onNoResponse({ id: order.id })}>
                Mark no response
              </Button>
              <Button size="sm" variant="outline" className="btn-press text-rose-600" onClick={() => onSoftDelete({ id: order.id })}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          )}
          {order.status !== "pending" && order.isDeleted !== 1 && (
            <div className="flex flex-wrap gap-2">
              {nextStatuses[order.status]?.map((st) => (
                <Button key={st} size="sm" className="btn-press" onClick={() => onSetStatus({ id: order.id, status: st })}>
                  Mark {STATUS_LABEL[st]}
                </Button>
              ))}
              <Button size="sm" variant="outline" className="btn-press" onClick={() => window.print()}>
                <Printer className="mr-1 h-3.5 w-3.5" /> Print invoice
              </Button>
              <Button size="sm" variant="outline" className="btn-press text-rose-600" onClick={() => onSoftDelete({ id: order.id })}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          )}
          {order.isDeleted === 1 && (
            <Button size="sm" className="btn-press" onClick={() => onRestore({ id: order.id })}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore order
            </Button>
          )}

          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Internal notes</p>
            <div className="flex gap-2">
              <Input placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button size="sm" className="btn-press" disabled={!note.trim()} onClick={() => { onAddNote({ id: order.id, message: note.trim() }); setNote(""); }}>
                Add
              </Button>
            </div>
            <ul className="space-y-1.5">
              {notes.map((n) => (
                <li key={n.id} className="rounded-md bg-muted/50 px-3 py-2 text-xs">
                  <span className="font-medium">{n.authorName}</span> — {n.message}
                  <span className="ml-2 text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
/* ------------------------------------------------------------------ */
/* Abandoned tab                                                       */
/* ------------------------------------------------------------------ */
function AbandonedTab() {
  const utils = trpc.useUtils();
  const listQuery = trpc.admin.abandoned.list.useQuery();
  const recoverMutation = trpc.admin.abandoned.recover.useMutation({
    onSuccess: () => {
      toast.success("Marked as recovered");
      utils.admin.abandoned.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rows = listQuery.data ?? [];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Checkouts that were started but never completed. Review them to follow up with customers.
      </p>
      {listQuery.isLoading ? <Skeleton className="h-64 rounded-lg" /> : rows.length === 0 ? (
        <EmptyState icon={Archive} title="No abandoned checkouts yet" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">{a.customerName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <p>{a.customerPhone ?? "—"}</p>
                    <p className="max-w-56 truncate text-xs text-muted-foreground">{a.customerAddress ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.shippingArea === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka"}</td>
                  <td className="px-4 py-3 font-medium">{formatPrice(a.total ?? 0)}</td>
                  <td className="px-4 py-3">
                    {a.recovered === 1 ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700">Recovered</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Open</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {a.recovered !== 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="btn-press"
                        disabled={recoverMutation.isPending}
                        onClick={() => recoverMutation.mutate({ id: a.id })}
                      >
                        Mark recovered
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inventory tab                                                       */
/* ------------------------------------------------------------------ */
function ImagePicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const uploadMutation = trpc.upload.image.useMutation({
    onSuccess: (res) => onChange(res.url),
    onError: (e) => toast.error(e.message),
    onSettled: () => setBusy(false),
  });
  const onFile = (f: File) => {
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result ?? "").split(",")[1] ?? "";
      uploadMutation.mutate({ fileName: f.name, base64 });
    };
    reader.readAsDataURL(f);
  };
  return (
    <div className="flex items-center gap-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border">
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">No image</div>}
      </div>
      <Input
        type="file"
        accept="image/*"
        className="max-w-52"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      {busy && <span className="text-xs text-muted-foreground">Uploading…</span>}
    </div>
  );
}

function CategoryDialog({ category, onClose }: { category?: { id?: number; name: string; imageUrl?: string | null } | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(category?.name ?? "");
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? "");
  const createMutation = trpc.catalog.categoryCreate.useMutation({
    onSuccess: () => {
      toast.success("Category created");
      utils.catalog.categoriesAll.invalidate();
      utils.content.categories.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.catalog.categoryUpdate.useMutation({
    onSuccess: () => {
      toast.success("Category updated");
      utils.catalog.categoriesAll.invalidate();
      utils.content.categories.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });
  const isEdit = !!category?.id;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Timepieces" />
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <ImagePicker value={imageUrl} onChange={setImageUrl} />
          </div>
          <Button
            className="btn-press w-full gold-gradient text-primary-foreground"
            disabled={createMutation.isPending || updateMutation.isPending || !name.trim()}
            onClick={() =>
              isEdit
                ? updateMutation.mutate({ id: category!.id!, name: name.trim() || undefined, imageUrl: imageUrl || null })
                : createMutation.mutate({ name: name.trim(), imageUrl: imageUrl || undefined })
            }
          >
            {isEdit ? "Save changes" : "Create category"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductDialog({ product, onClose }: { product?: Record<string, unknown> | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const catsQuery = trpc.catalog.categoriesAll.useQuery();
  const [form, setForm] = useState({
    name: String(product?.name ?? ""),
    description: String(product?.description ?? ""),
    price: String(product?.price ?? ""),
    comparePrice: String(product?.comparePrice ?? ""),
    imageUrl: String(product?.imageUrl ?? ""),
    categoryId: product?.categoryId ? String(product.categoryId) : "",
    stock: String(product?.stock ?? "0"),
    lowStockThreshold: String(product?.lowStockThreshold ?? "5"),
    isFeatured: product?.isFeatured ? "1" : "0",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const createMutation = trpc.catalog.productCreate.useMutation({
    onSuccess: () => {
      toast.success("Product created");
      utils.catalog.productsAll.invalidate();
      utils.content.products.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.catalog.productUpdate.useMutation({
    onSuccess: () => {
      toast.success("Product updated");
      utils.catalog.productsAll.invalidate();
      utils.content.products.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });
  const isEdit = !!product?.id;
  const payload = {
    name: form.name.trim(),
    description: form.description || undefined,
    price: form.price,
    comparePrice: form.comparePrice || undefined,
    imageUrl: form.imageUrl || undefined,
    categoryId: form.categoryId ? parseInt(form.categoryId, 10) : null,
    stock: parseInt(form.stock || "0", 10),
    lowStockThreshold: parseInt(form.lowStockThreshold || "5", 10),
    isFeatured: form.isFeatured === "1" ? 1 : 0,
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Price (৳)</Label>
              <Input value={form.price} onChange={(e) => set("price", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Compare price (৳)</Label>
              <Input value={form.comparePrice} onChange={(e) => set("comparePrice", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {(catsQuery.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Low-stock threshold</Label>
              <Input type="number" value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Featured</Label>
              <Select value={form.isFeatured} onValueChange={(v) => set("isFeatured", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Yes</SelectItem>
                  <SelectItem value="0">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <ImagePicker value={form.imageUrl} onChange={(u) => set("imageUrl", u)} />
          </div>
          <Button
            className="btn-press w-full gold-gradient text-primary-foreground"
            disabled={createMutation.isPending || updateMutation.isPending || !form.name.trim() || !form.price}
            onClick={() =>
              isEdit
                ? updateMutation.mutate({ id: Number(product!.id), ...payload } as never)
                : createMutation.mutate(payload as never)
            }
          >
            {isEdit ? "Save changes" : "Create product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InventoryTab() {
  const utils = trpc.useUtils();
  const [section, setSection] = useState("products");
  const catsQuery = trpc.catalog.categoriesAll.useQuery();
  const prodsQuery = trpc.catalog.productsAll.useQuery();
  const stockQuery = trpc.admin.inventory.stockHistory.useQuery();
  const deleteCatMutation = trpc.catalog.categoryDelete.useMutation({
    onSuccess: () => { toast.success("Category deleted"); utils.catalog.categoriesAll.invalidate(); utils.content.categories.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const [catDialog, setCatDialog] = useState<{ id?: number; name: string; imageUrl?: string | null } | null | undefined>(null);
  const [prodDialog, setProdDialog] = useState<Record<string, unknown> | null | undefined>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={section} onValueChange={setSection}>
          <TabsList className="bg-muted">
            <TabsTrigger value="products">Products ({prodsQuery.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="categories">Categories ({catsQuery.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="stock">Stock history</TabsTrigger>
          </TabsList>
        </Tabs>
        {section === "products" && (
          <Button className="btn-press ml-auto gold-gradient text-primary-foreground" onClick={() => setProdDialog({})}>
            New product
          </Button>
        )}
        {section === "categories" && (
          <Button className="btn-press ml-auto gold-gradient text-primary-foreground" onClick={() => setCatDialog(null)}>
            New category
          </Button>
        )}
      </div>

      {section === "products" && (
        prodsQuery.isLoading ? <Skeleton className="h-64 rounded-lg" /> : (prodsQuery.data ?? []).length === 0 ? (
          <EmptyState icon={Package} title="No products yet">
            <Button className="btn-press mt-4" onClick={() => setProdDialog({})}>Add your first product</Button>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Featured</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(prodsQuery.data ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                          {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatPrice(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={p.stock <= (p.lowStockThreshold ?? 5) ? "text-amber-600 font-medium" : ""}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-3">{p.isFeatured === 1 ? "Yes" : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" className="btn-press" onClick={() => setProdDialog(p as unknown as Record<string, unknown>)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {section === "categories" && (
        catsQuery.isLoading ? <Skeleton className="h-48 rounded-lg" /> : (catsQuery.data ?? []).length === 0 ? (
          <EmptyState icon={Package} title="No categories yet">
            <Button className="btn-press mt-4" onClick={() => setCatDialog(null)}>Add your first category</Button>
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(catsQuery.data ?? []).map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="btn-press h-8 w-8" onClick={() => setCatDialog(c)}>
                        <Filter className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="btn-press h-8 w-8 text-rose-600" onClick={() => deleteCatMutation.mutate({ id: c.id })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {section === "stock" && (
        stockQuery.isLoading ? <Skeleton className="h-64 rounded-lg" /> : (stockQuery.data ?? []).length === 0 ? (
          <EmptyState icon={Package} title="No stock changes recorded yet" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Change</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody>
                {(stockQuery.data ?? []).map((h) => (
                  <tr key={h.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{h.reason}</td>
                    <td className={`px-4 py-3 font-medium ${h.change < 0 ? "text-rose-600" : "text-emerald-600"}`}>{h.change > 0 ? `+${h.change}` : h.change}</td>
                    <td className="px-4 py-3">{h.newStock}</td>
                    <td className="px-4 py-3 text-muted-foreground">{h.actorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {catDialog !== undefined && <CategoryDialog category={catDialog} onClose={() => setCatDialog(undefined)} />}
      {prodDialog !== undefined && <ProductDialog product={prodDialog} onClose={() => setProdDialog(undefined)} />}
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* Customers tab                                                       */
/* ------------------------------------------------------------------ */
function CustomersTab({ role }: { role?: string }) {
  const utils = trpc.useUtils();
  const listQuery = trpc.admin.customers.list.useQuery();
  const setRoleMutation = trpc.admin.customers.setRole.useMutation({
    onSuccess: () => { toast.success("Role updated"); utils.admin.customers.list.invalidate(); utils.auth.me.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const rows = listQuery.data ?? [];
  const isSuperadmin = role === "superadmin";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        All registered accounts. Role changes to superadmin require superadmin privileges.
      </p>
      {listQuery.isLoading ? <Skeleton className="h-64 rounded-lg" /> : rows.length === 0 ? (
        <EmptyState icon={UserCheck} title="No customers yet" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{u.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={u.role === "admin" || u.role === "superadmin" ? "border-amber-400/60 text-amber-700" : "text-muted-foreground"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{u.orderCount}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={u.role}
                      onValueChange={(v) => setRoleMutation.mutate({ userId: u.id, role: v as "user" | "admin" | "superadmin" })}
                      disabled={setRoleMutation.isPending || !isSuperadmin}
                    >
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                    {!isSuperadmin && <p className="mt-1 text-xs text-muted-foreground">Superadmin only</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Couriers tab                                                        */
/* ------------------------------------------------------------------ */
function CouriersTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Couriers configured in order details. When editing an order, pick a courier and enter its tracking ID so customers can trace shipments.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { id: "pathao", name: "Pathao", desc: "Same-day and next-day delivery inside Dhaka and beyond" },
          { id: "steadfast", name: "Steadfast", desc: "Nationwide delivery network across Bangladesh" },
          { id: "redx", name: "RedX", desc: "eCourier's nationwide parcel delivery service" },
        ].map((c) => (
          <Card key={c.id}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
                  <Truck className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="font-display font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fraud tab                                                           */
/* ------------------------------------------------------------------ */
function FraudTab() {
  const signalsQuery = trpc.admin.fraud.signals.useQuery();
  const signals = signalsQuery.data ?? [];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Automated signals: phone numbers with 3 or more completed orders or abandoned checkouts.
      </p>
      {signalsQuery.isLoading ? <Skeleton className="h-48 rounded-lg" /> : signals.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No risk signals detected" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Count</th>
                <th className="px-4 py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s, i) => (
                <tr key={`${s.value}-${s.type}-${i}`} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={s.type === "frequent_orders" ? "text-muted-foreground" : "border-amber-400/60 text-amber-700"}>
                      {s.type === "frequent_orders" ? "Frequent orders" : "Frequent abandoned"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">{s.value}</td>
                  <td className="px-4 py-3">{s.count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Activity tab                                                        */
/* ------------------------------------------------------------------ */
function ActivityTab() {
  const listQuery = trpc.admin.activity.list.useQuery();
  const rows = listQuery.data ?? [];
  return (
    <div className="space-y-4">
      {listQuery.isLoading ? <Skeleton className="h-64 rounded-lg" /> : rows.length === 0 ? (
        <EmptyState icon={Bell} title="No activity recorded yet" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{a.actorName ?? "Unknown"}</td>
                  <td className="px-4 py-3">{a.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* Settings tab                                                        */
/* ------------------------------------------------------------------ */
const SETTING_FIELDS: { key: string; label: string; placeholder: string; type?: "number" }[] = [
  { key: "storeName", label: "Store name", placeholder: "ZEN RARE" },
  { key: "storeTagline", label: "Tagline", placeholder: "Rare finds, curated for you" },
  { key: "contactEmail", label: "Contact email", placeholder: "hello@example.com" },
  { key: "contactPhone", label: "Contact phone", placeholder: "+880 1XXXXXXXXX" },
  { key: "contactAddress", label: "Contact address", placeholder: "Dhaka, Bangladesh" },
  { key: "shippingInsideDhaka", label: "Shipping — inside Dhaka (৳)", placeholder: "70", type: "number" },
  { key: "shippingOutsideDhaka", label: "Shipping — outside Dhaka (৳)", placeholder: "120", type: "number" },
  { key: "facebookPixelId", label: "Facebook Pixel ID", placeholder: "e.g. 123456789012345" },
  { key: "currencySymbol", label: "Currency symbol", placeholder: "৳" },
];

function SettingsTab() {
  const utils = trpc.useUtils();
  const allQuery = trpc.admin.settings.all.useQuery();
  const updateMutation = trpc.admin.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Setting saved");
      utils.admin.settings.all.invalidate();
      utils.content.settingsPublic.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const map = allQuery.data ?? {};

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-muted-foreground">
        Global store configuration. Shipping rates apply at checkout; the Facebook Pixel ID is injected automatically on storefront pages.
      </p>
      {allQuery.isLoading ? (
        Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
      ) : (
        <div className="space-y-4">
          {SETTING_FIELDS.map((f) => (
            <div key={f.key} className="grid gap-2 sm:grid-cols-3">
              <div className="pt-2">
                <Label className="text-sm">{f.label}</Label>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Input
                  type={f.type ?? "text"}
                  placeholder={f.placeholder}
                  defaultValue={map[f.key] ?? ""}
                  onBlur={(e) => {
                    if (e.target.value.trim() !== (map[f.key] ?? "")) {
                      updateMutation.mutate({ settingKey: f.key, settingValue: e.target.value.trim() });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
                {updateMutation.isPending && <span className="text-xs text-muted-foreground self-center">Saving…</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Backup tab                                                          */
/* ------------------------------------------------------------------ */
function BackupTab() {
  const exportQuery = trpc.admin.backup.exportData.useQuery({ enabled: false } as never);
  const importMutation = trpc.admin.backup.importData.useMutation({
    onSuccess: () => {
      toast.success("Backup imported");
      const utils = trpc.useUtils();
      utils.catalog.categoriesAll.invalidate();
      utils.catalog.productsAll.invalidate();
      utils.content.categories.invalidate();
      utils.content.products.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const onExport = () => {
    exportQuery.refetch().then((res) => {
      const data = res.data;
      if (!data) {
        toast.error("Could not load backup data");
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zen-rare-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    });
  };

  const onImport = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result ?? ""));
        importMutation.mutate({
          categories: Array.isArray(json.categories) ? json.categories : undefined,
          products: Array.isArray(json.products) ? json.products : undefined,
          banners: Array.isArray(json.banners) ? json.banners : undefined,
          sliders: Array.isArray(json.sliders) ? json.sliders : undefined,
        });
      } catch {
        toast.error("Invalid backup file");
      }
    };
    reader.readAsText(f);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-muted-foreground">
        Export your catalog (categories, products, banners, sliders) as JSON, or import a previously exported backup.
      </p>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <Button className="btn-press gold-gradient text-primary-foreground" disabled={exportQuery.isPending} onClick={onExport}>
            <Download className="mr-1 h-4 w-4" /> Export backup
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="btn-press" disabled={importMutation.isPending} onClick={() => document.getElementById("backup-file")?.click()}>
              <ArrowUpFromLine className="mr-1 h-4 w-4" /> Import backup
            </Button>
            <input
              id="backup-file"
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = "";
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
