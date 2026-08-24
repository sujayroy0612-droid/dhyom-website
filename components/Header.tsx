"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/lib/cart/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCartFly } from "@/context/CartFlyContext";
import { SHOP_NAV, type NavCategory } from "@/lib/nav";

/* ─── Icons ───────────────────────────────────────────── */
function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="9" height="6" viewBox="0 0 9 6" fill="none"
      stroke="currentColor" strokeWidth="1.3"
      className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M1 1l3.5 4L8 1" />
    </svg>
  );
}

function ChevronRight({ rotated }: { rotated?: boolean }) {
  return (
    <svg
      width="7" height="12" viewBox="0 0 7 12" fill="none"
      stroke="currentColor" strokeWidth="1.2"
      className={`flex-shrink-0 transition-transform duration-200 ${rotated ? "rotate-90" : ""}`}
    >
      <path d="M1 1l5 5-5 5" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M3 6h12l-1.8 12H4.8L3 6z" />
      <path d="M6.5 6V4.5a2.5 2.5 0 015 0V6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25">
      <circle cx="9" cy="6" r="3.5" />
      <path d="M2 16c0-3.866 3.134-7 7-7s7 3.134 7 7" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.25">
      <path d="M9 15.5S2 11 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5C16 11 9 15.5 9 15.5z" />
    </svg>
  );
}

/* ─── Component ───────────────────────────────────────── */
export default function Header({
  logoUrl,
  shopNav = SHOP_NAV,
}: {
  logoUrl?: string | null;
  shopNav?: NavCategory[];
}) {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { user, loading: authLoading, openModal, signOut } = useAuth();
  const { ids: wishlistIds } = useWishlist();
  const { cartRef } = useCartFly();

  /* Desktop */
  const [shopOpen,       setShopOpen]       = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [userMenuOpen,   setUserMenuOpen]   = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  /* Mobile */
  const [menuOpen,          setMenuOpen]          = useState(false);
  const [mobileShopOpen,    setMobileShopOpen]    = useState(false);
  const [mobileExpandedCats, setMobileExpandedCats] = useState<Set<string>>(new Set());

  /* Hover-delay timer ref */
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  /* Close user menu on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  /* Close everything on route change */
  useEffect(() => {
    clearTimeout(closeTimer.current);
    setShopOpen(false);
    setActiveCategory(null);
    setMenuOpen(false);
    setMobileShopOpen(false);
    setMobileExpandedCats(new Set());
  }, [pathname]);

  /* Desktop hover helpers */
  function openShop() {
    clearTimeout(closeTimer.current);
    setShopOpen(true);
  }
  function scheduleClose() {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setShopOpen(false);
      setActiveCategory(null);
    }, 260);
  }
  function hoverCategory(cat: string) {
    clearTimeout(closeTimer.current);
    setActiveCategory(cat);
  }

  /* Close all menus (called on link click) */
  function closeAll() {
    clearTimeout(closeTimer.current);
    setShopOpen(false);
    setActiveCategory(null);
    setMenuOpen(false);
    setMobileShopOpen(false);
    setMobileExpandedCats(new Set());
    setUserMenuOpen(false);
  }

  /* Mobile: toggle a category's subcategory accordion */
  function toggleMobileCat(cat: string) {
    setMobileExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) { next.delete(cat); } else { next.add(cat); }
      return next;
    });
  }

  const shopActive = pathname.startsWith("/shop");
  const activeSubcats =
    activeCategory
      ? (shopNav.find((c) => c.category === activeCategory)?.subcategories ?? [])
      : [];

  return (
    <header className="fixed left-0 right-0 z-50 bg-[rgba(26,10,20,0.92)] backdrop-blur-md border-b border-[rgba(196,163,115,0.14)]" style={{ top: "var(--bar-height, 0px)" }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-3 group">
          {logoUrl ? (
            <div className="relative h-12 w-44 flex-shrink-0">
              <Image
                src={logoUrl}
                alt="Dhyom"
                fill
                className="object-contain object-left"
                sizes="176px"
                priority
              />
            </div>
          ) : (
            <>
              <div className="w-7 h-7 rounded-full border border-[rgba(196,163,115,0.5)] flex items-center justify-center flex-shrink-0">
                <span className="font-display text-[0.55rem] tracking-[0.15em] text-brass">D</span>
              </div>
              <span className="font-display text-base tracking-[0.18em] text-brass group-hover:text-ivory transition-colors duration-200">
                DHYOM
              </span>
            </>
          )}
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden md:flex items-stretch h-16 gap-10">

          {/* Home */}
          <Link
            href="/"
            className={[
              "flex items-center font-display text-[0.62rem] tracking-[0.2em] uppercase transition-colors duration-200",
              pathname === "/" ? "text-brass" : "text-[rgba(245,237,224,0.50)] hover:text-ivory",
            ].join(" ")}
          >
            Home
          </Link>

          {/* ── SHOP — h-16 wrapper so top-full = bottom of header ── */}
          <div
            className="relative h-16 flex items-center"
            onMouseEnter={openShop}
            onMouseLeave={scheduleClose}
          >
            {/* Trigger button */}
            <button
              onClick={() => setShopOpen((v) => !v)}
              className={[
                "flex items-center gap-1.5 font-display text-[0.62rem] tracking-[0.2em] uppercase transition-colors duration-200",
                shopActive || shopOpen ? "text-brass" : "text-[rgba(245,237,224,0.50)] hover:text-ivory",
              ].join(" ")}
            >
              Shop
              <ChevronDown open={shopOpen} />
            </button>

            {/* ── Dropdown ── */}
            {shopOpen && (
              <div
                className="absolute right-0 top-full flex bg-damson border border-[rgba(196,163,115,0.18)] rounded-b-[4px] shadow-[0_20px_60px_rgba(15,5,8,0.75)] overflow-hidden"
                style={{ animation: "menu-enter 150ms ease-out" }}
              >
                {/* Left panel: category list */}
                <div className="w-56 py-2 flex-shrink-0">

                  {/* Shop All */}
                  <Link
                    href="/shop"
                    onClick={closeAll}
                    className="flex items-center px-5 py-2.5 group"
                  >
                    <span className="font-display text-[0.57rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.50)] group-hover:text-brass transition-colors duration-150">
                      Shop All
                    </span>
                  </Link>

                  {/* Divider */}
                  <div className="my-1.5 mx-5 h-px bg-[rgba(196,163,115,0.12)]" />

                  {/* Categories */}
                  {shopNav.map((cat) => (
                    <Link
                      key={cat.category}
                      href={cat.href}
                      onClick={closeAll}
                      onMouseEnter={() => hoverCategory(cat.category)}
                      className="flex items-center justify-between px-5 py-2.5 group hover:bg-[rgba(245,237,224,0.04)] transition-colors duration-100"
                    >
                      <span className={[
                        "font-body text-[1.0rem] transition-colors duration-150",
                        activeCategory === cat.category ? "text-ivory" : "text-[rgba(245,237,224,0.62)] group-hover:text-ivory",
                      ].join(" ")}>
                        {cat.title}
                      </span>
                      <span className={[
                        "transition-colors duration-150",
                        activeCategory === cat.category ? "text-brass" : "text-[rgba(196,163,115,0.28)] group-hover:text-[rgba(196,163,115,0.55)]",
                      ].join(" ")}>
                        <ChevronRight />
                      </span>
                    </Link>
                  ))}
                </div>

                {/* Right panel: subcategory flyout */}
                {activeSubcats.length > 0 && (
                  <div
                    className="w-52 flex-shrink-0 bg-[#250d1e] border-l border-[rgba(196,163,115,0.12)] py-2"
                    style={{ animation: "menu-enter 120ms ease-out" }}
                  >
                    {activeSubcats.map((sub) => (
                      <Link
                        key={sub.slug}
                        href={sub.href}
                        onClick={closeAll}
                        className="flex items-center px-5 py-2.5 group hover:bg-[rgba(245,237,224,0.04)] transition-colors duration-100"
                      >
                        <span className="font-body italic text-[0.95rem] text-[rgba(245,237,224,0.52)] group-hover:text-ivory transition-colors duration-150">
                          {sub.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Auth button ── */}
          {!authLoading && (
            user ? (
              <div ref={userMenuRef} className="relative flex items-center self-center">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-[rgba(245,237,224,0.50)] hover:text-ivory transition-colors duration-200"
                  aria-label="Account"
                >
                  <div className="w-7 h-7 rounded-full bg-[rgba(196,163,115,0.18)] border border-[rgba(196,163,115,0.35)] flex items-center justify-center flex-shrink-0">
                    <span className="font-display text-brass" style={{ fontSize: "0.58rem", letterSpacing: "0.04em" }}>
                      {(user.user_metadata?.full_name ?? user.email ?? "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                </button>
                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-48 bg-damson border border-[rgba(196,163,115,0.18)] rounded-[4px] shadow-[0_16px_48px_rgba(15,5,8,0.70)] overflow-hidden z-50"
                    style={{ animation: "menu-enter 140ms ease-out" }}
                  >
                    <div className="px-4 py-3 border-b border-[rgba(196,163,115,0.10)]">
                      <p className="font-display text-[0.52rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)] truncate">
                        {user.user_metadata?.full_name ?? user.email}
                      </p>
                    </div>
                    <Link href="/account/orders" onClick={closeAll} className="flex items-center px-4 py-2.5 font-body text-[0.90rem] text-[rgba(245,237,224,0.62)] hover:text-ivory hover:bg-[rgba(245,237,224,0.04)] transition-colors duration-100">
                      My Orders
                    </Link>
                    <Link href="/account/addresses" onClick={closeAll} className="flex items-center px-4 py-2.5 font-body text-[0.90rem] text-[rgba(245,237,224,0.62)] hover:text-ivory hover:bg-[rgba(245,237,224,0.04)] transition-colors duration-100">
                      Saved Addresses
                    </Link>
                    <Link href="/account/wishlist" onClick={closeAll} className="flex items-center px-4 py-2.5 font-body text-[0.90rem] text-[rgba(245,237,224,0.62)] hover:text-ivory hover:bg-[rgba(245,237,224,0.04)] transition-colors duration-100">
                      Wishlist
                    </Link>
                    <div className="border-t border-[rgba(196,163,115,0.10)] mt-1">
                      <button
                        onClick={() => { signOut(); closeAll(); }}
                        className="w-full text-left px-4 py-2.5 font-body text-[0.90rem] text-[rgba(245,237,224,0.42)] hover:text-[rgba(210,80,80,0.80)] hover:bg-[rgba(245,237,224,0.04)] transition-colors duration-100"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openModal}
                className="flex items-center self-center text-[rgba(245,237,224,0.50)] hover:text-ivory transition-colors duration-200"
                aria-label="Sign in"
              >
                <UserIcon />
              </button>
            )
          )}

          {/* Wishlist */}
          {user ? (
            <Link
              href="/account/wishlist"
              aria-label="Wishlist"
              className={[
                "relative flex items-center self-center transition-colors duration-200",
                pathname.startsWith("/account/wishlist") ? "text-brass" : "text-[rgba(245,237,224,0.50)] hover:text-ivory",
              ].join(" ")}
            >
              <HeartIcon filled={wishlistIds.size > 0} />
              {wishlistIds.size > 0 && (
                <span
                  className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] rounded-full bg-brass text-ink flex items-center justify-center font-display px-1 pointer-events-none"
                  style={{ fontSize: "0.42rem", letterSpacing: "0.04em" }}
                >
                  {wishlistIds.size > 9 ? "9+" : wishlistIds.size}
                </span>
              )}
            </Link>
          ) : (
            <button
              onClick={openModal}
              aria-label="Wishlist"
              className="flex items-center self-center text-[rgba(245,237,224,0.50)] hover:text-ivory transition-colors duration-200"
            >
              <HeartIcon />
            </button>
          )}

          {/* Cart */}
          <div ref={(el) => { cartRef.current = el; }} className="flex items-center self-center">
            <Link
              href="/cart"
              aria-label={totalItems > 0 ? `Shopping bag — ${totalItems} item${totalItems === 1 ? "" : "s"}` : "Shopping bag"}
              className={[
                "relative flex items-center transition-colors duration-200",
                pathname.startsWith("/cart") ? "text-brass" : "text-[rgba(245,237,224,0.50)] hover:text-ivory",
              ].join(" ")}
            >
              <BagIcon />
              <AnimatePresence mode="popLayout">
                {totalItems > 0 && (
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] rounded-full bg-brass text-ink flex items-center justify-center font-display px-1 pointer-events-none"
                    style={{ fontSize: "0.42rem", letterSpacing: "0.04em" }}
                  >
                    {totalItems > 9 ? "9+" : totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>
        </nav>

        {/* ── Mobile right: wishlist + cart + hamburger ── */}
        <div className="md:hidden flex items-center gap-4">
          {user ? (
            <Link
              href="/account/wishlist"
              aria-label="Wishlist"
              className={[
                "relative text-[rgba(245,237,224,0.50)] hover:text-ivory transition-colors duration-200",
                pathname.startsWith("/account/wishlist") ? "text-brass" : "",
              ].join(" ")}
            >
              <HeartIcon filled={wishlistIds.size > 0} />
              {wishlistIds.size > 0 && (
                <span
                  className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] rounded-full bg-brass text-ink flex items-center justify-center font-display px-1 pointer-events-none"
                  style={{ fontSize: "0.42rem", letterSpacing: "0.04em" }}
                >
                  {wishlistIds.size > 9 ? "9+" : wishlistIds.size}
                </span>
              )}
            </Link>
          ) : (
            <button
              onClick={openModal}
              aria-label="Wishlist"
              className="text-[rgba(245,237,224,0.50)] hover:text-ivory transition-colors duration-200"
            >
              <HeartIcon />
            </button>
          )}
          <Link
            href="/cart"
            aria-label={totalItems > 0 ? `Cart (${totalItems})` : "Cart"}
            className="relative text-[rgba(245,237,224,0.50)] hover:text-ivory transition-colors duration-200"
          >
            <BagIcon />
            {totalItems > 0 && (
              <span
                className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] rounded-full bg-brass text-ink flex items-center justify-center font-display px-1 pointer-events-none"
                style={{ fontSize: "0.42rem", letterSpacing: "0.04em" }}
              >
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </Link>

          <button
            className="text-[rgba(245,237,224,0.5)] hover:text-ivory transition-colors"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
              {menuOpen ? (
                <>
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6"  x2="17" y2="6"  />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <line x1="3" y1="14" x2="17" y2="14" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {menuOpen && (
        <div
          className="md:hidden border-t border-[rgba(196,163,115,0.12)] bg-damson"
          style={{ animation: "menu-enter 150ms ease-out" }}
        >
          <div className="px-6 py-3 flex flex-col">

            {/* Home */}
            <Link
              href="/"
              onClick={closeAll}
              className={[
                "py-3.5 font-display text-[0.62rem] tracking-[0.2em] uppercase border-b border-[rgba(196,163,115,0.08)] transition-colors duration-200",
                pathname === "/" ? "text-brass" : "text-[rgba(245,237,224,0.50)]",
              ].join(" ")}
            >
              Home
            </Link>

            {/* Account / Sign In */}
            {!authLoading && (
              user ? (
                <>
                  <Link href="/account/orders" onClick={closeAll} className="py-3.5 font-display text-[0.62rem] tracking-[0.2em] uppercase border-b border-[rgba(196,163,115,0.08)] text-[rgba(245,237,224,0.50)] hover:text-brass transition-colors duration-200">
                    My Account
                  </Link>
                  <button onClick={() => { signOut(); closeAll(); }} className="py-3.5 text-left font-display text-[0.62rem] tracking-[0.2em] uppercase border-b border-[rgba(196,163,115,0.08)] text-[rgba(245,237,224,0.36)] hover:text-[rgba(210,80,80,0.70)] transition-colors duration-200 w-full">
                    Sign Out
                  </button>
                </>
              ) : (
                <button onClick={() => { openModal(); setMenuOpen(false); }} className="py-3.5 text-left font-display text-[0.62rem] tracking-[0.2em] uppercase border-b border-[rgba(196,163,115,0.08)] text-[rgba(245,237,224,0.50)] hover:text-brass transition-colors duration-200 w-full">
                  Sign In
                </button>
              )
            )}

            {/* ── Shop accordion ── */}
            <div className="border-b border-[rgba(196,163,115,0.08)]">

              {/* Toggle */}
              <button
                onClick={() => setMobileShopOpen((v) => !v)}
                className={[
                  "w-full py-3.5 flex items-center justify-between font-display text-[0.62rem] tracking-[0.2em] uppercase transition-colors duration-200",
                  shopActive || mobileShopOpen ? "text-brass" : "text-[rgba(245,237,224,0.50)]",
                ].join(" ")}
              >
                Shop
                <ChevronDown open={mobileShopOpen} />
              </button>

              {/* Expanded */}
              {mobileShopOpen && (
                <div className="pb-4 flex flex-col">

                  {/* Shop All */}
                  <Link
                    href="/shop"
                    onClick={closeAll}
                    className="py-2.5 pl-4 font-display text-[0.57rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.50)] hover:text-brass transition-colors duration-150"
                  >
                    Shop All
                  </Link>

                  <div className="my-2 ml-4 mr-0 h-px bg-[rgba(196,163,115,0.10)]" />

                  {/* Categories */}
                  {shopNav.map((cat) => {
                    const expanded = mobileExpandedCats.has(cat.category);
                    return (
                      <div key={cat.category}>
                        <div className="flex items-center pr-1">
                          <Link
                            href={cat.href}
                            onClick={closeAll}
                            className="flex-1 py-2.5 pl-4 font-body text-[1.0rem] text-[rgba(245,237,224,0.58)] hover:text-ivory transition-colors duration-150"
                          >
                            {cat.title}
                          </Link>
                          <button
                            onClick={() => toggleMobileCat(cat.category)}
                            aria-label={`${expanded ? "Collapse" : "Expand"} ${cat.title}`}
                            className="p-3 text-[rgba(196,163,115,0.38)] hover:text-brass transition-colors duration-150"
                          >
                            <ChevronRight rotated={expanded} />
                          </button>
                        </div>

                        {/* Subcategories */}
                        {expanded && (
                          <div className="pl-8 pb-1 flex flex-col">
                            {cat.subcategories.map((sub) => (
                              <Link
                                key={sub.slug}
                                href={sub.href}
                                onClick={closeAll}
                                className="py-2 font-body italic text-[0.9rem] text-[rgba(245,237,224,0.40)] hover:text-ivory transition-colors duration-150"
                              >
                                {sub.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>


          </div>
        </div>
      )}
    </header>
  );
}
