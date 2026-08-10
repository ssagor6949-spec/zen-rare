import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { formatPrice, useStoreSettings } from "@/lib/zen";
import { BadgeCheck, Instagram, LogOut, Package, Search, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const cartQuery = trpc.cart.list.useQuery(undefined, { enabled: !!user });
  const settingsQuery = useStoreSettings();
  const count = useMemo(
    () => cartQuery.data?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0,
    [cartQuery.data],
  );

  const storeName = settingsQuery.data?.storeName || "ZEN RARE";
  const tagline = settingsQuery.data?.storeTagline || "Curated Luxury, Rarely Found";

  // Persist settings for the pixel helper
  useEffect(() => {
    if (settingsQuery.data) {
      localStorage.setItem("zen-settings", JSON.stringify(settingsQuery.data));
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    localStorage.setItem("zen-cart-count", String(count));
  }, [count]);

  const nav = (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex items-baseline gap-2 font-display text-xl font-semibold tracking-tight">
          <span className="gold-text">ZEN</span>
          <span className="text-foreground/80">RARE</span>
        </Link>
        <nav className="ml-6 hidden items-center gap-6 md:flex">
          <Link
            href="/shop"
            className={`text-sm font-medium transition-colors ${
              location.startsWith("/shop") ? "text-primary" : "text-foreground/70 hover:text-foreground"
            }`}
          >
            Shop
          </Link>
          <Link
            href="/account"
            className={`text-sm font-medium transition-colors ${
              location.startsWith("/account") ? "text-primary" : "text-foreground/70 hover:text-foreground"
            }`}
          >
            Account
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
            className="btn-press rounded-full p-2 text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <Link
            href="/cart"
            aria-label="Cart"
            className="btn-press rounded-full p-2 text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
          >
            <div className="relative">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </div>
          </Link>
          {loading ? (
            <span className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 font-medium">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{(user.name || user.email || "Account").split(" ")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/account")}>
                  <Package className="mr-2 h-4 w-4" /> Orders
                </DropdownMenuItem>
                {(user.role === "admin" || user.role === "superadmin") && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <BadgeCheck className="mr-2 h-4 w-4" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              onClick={() => startLogin()}
              className="btn-press gold-gradient text-primary-foreground"
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
      {searchOpen && (
        <div className="border-t border-border/70 bg-background">
          <div className="container flex items-center gap-2 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) navigate(`/shop?q=${encodeURIComponent(search.trim())}`);
              }}
              placeholder="Search rare finds..."
              className="h-9 w-full bg-transparent text-sm outline-none"
            />
            <Button
              size="sm"
              onClick={() => search.trim() && navigate(`/shop?q=${encodeURIComponent(search.trim())}`)}
            >
              Go
            </Button>
          </div>
        </div>
      )}
    </header>
  );

  return (
    <div className="flex min-h-screen flex-col">
      {nav}
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/70 bg-ink text-white/90">
        <div className="container grid gap-10 py-14 md:grid-cols-3">
          <div>
            <div className="flex items-baseline gap-2 font-display text-2xl font-semibold">
              <span className="gold-text">ZEN</span>
              <span className="text-white/80">RARE</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/60">{tagline}.</p>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide-lux text-white/50">Explore</h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li><Link href="/" className="transition-colors hover:text-white">Home</Link></li>
              <li><Link href="/shop" className="transition-colors hover:text-white">Shop All</Link></li>
              <li><Link href="/account" className="transition-colors hover:text-white">My Account</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide-lux text-white/50">Contact</h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-gold" />
                <span>@zenrare.bd</span>
              </li>
              <li>{settingsQuery.data?.contactPhone || "+880 1XXX-XXXXXX"}</li>
              <li>{settingsQuery.data?.contactEmail || "care@zenrare.com"}</li>
              <li className="text-white/50">{settingsQuery.data?.contactAddress || "Dhaka, Bangladesh"}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5">
          <p className="container text-center text-xs text-white/40">
            © {new Date().getFullYear()} {storeName}. Delivery inside Dhaka {formatPrice(settingsQuery.data?.shippingInsideDhaka ?? "70")} · outside Dhaka {formatPrice(settingsQuery.data?.shippingOutsideDhaka ?? "120")}.
          </p>
        </div>
      </footer>
    </div>
  );
}
