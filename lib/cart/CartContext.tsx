"use client";

import { createContext, useContext, useReducer, useEffect, useState, ReactNode } from "react";

/* ── Hamper selection (one per slot) ─────────────────────────── */
export interface HamperSelection {
  slotId:       string;
  slotLabel:    string;
  productId:    string;
  productName:  string;
  productLabel: string; // fragrance / variant shown to customer
  imageUrl:     string;
}

/* ── Regular product cart item ───────────────────────────────── */
export interface ProductCartItem {
  kind:            "product";
  id:              string;  // product UUID — dedup key
  name:            string;
  price:           number;
  quantity:        number;
  category:        string;
  subcategorySlug: string;
  label:           string;
  imageUrl:        string;
}

/* ── Hamper cart item ─────────────────────────────────────────── */
export interface HamperCartItem {
  kind:             "hamper";
  id:               string;  // fresh UUID per instance — never deduped
  tierId:           string;
  tierName:         string;
  boxId:            string;
  boxName:          string;
  price:            number;
  quantity:         number;  // always 1
  imageUrl:         string;  // box image
  giftMessage:      string;
  hidePrices:       boolean;
  selections:       HamperSelection[];
  // For stock deduction in verify-payment
  hamperComponents: Array<{ id: string; quantity: number }>;
}

export type CartItem = ProductCartItem | HamperCartItem;

// Legacy plain shape (hydrated from localStorage before kind was added)
type LegacyItem = {
  id: string; name: string; price: number; quantity: number;
  category?: string; subcategorySlug?: string; label?: string; imageUrl?: string;
};

function normaliseLegacy(raw: unknown): CartItem {
  const r = raw as LegacyItem & Partial<HamperCartItem & { kind: string }>;
  if (r.kind === "hamper") return raw as HamperCartItem;
  // Old items have no `kind` — treat as product
  return {
    kind:            "product",
    id:              r.id,
    name:            r.name,
    price:           r.price,
    quantity:        r.quantity,
    category:        r.category        ?? "",
    subcategorySlug: r.subcategorySlug ?? "",
    label:           r.label           ?? "",
    imageUrl:        r.imageUrl        ?? "",
  };
}

type Action =
  | { type: "HYDRATE"; items: CartItem[] }
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "SET_QUANTITY"; id: string; quantity: number }
  | { type: "CLEAR" };

function reducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case "HYDRATE":
      return action.items;

    case "ADD_ITEM": {
      if (action.payload.kind === "hamper") {
        // Hampers are always unique instances — never merge
        return [...state, action.payload];
      }
      const idx = state.findIndex(
        (i) => i.kind === "product" && i.id === action.payload.id
      );
      if (idx >= 0) {
        return state.map((item, i) =>
          i === idx
            ? { ...item, quantity: Math.min(item.quantity + action.payload.quantity, 10) }
            : item
        );
      }
      return [...state, action.payload];
    }

    case "REMOVE_ITEM":
      return state.filter((i) => i.id !== action.id);

    case "SET_QUANTITY":
      return state.map((i) =>
        i.id === action.id
          ? { ...i, quantity: Math.max(1, Math.min(action.quantity, 10)) }
          : i
      );

    case "CLEAR":
      return [];

    default:
      return state;
  }
}

interface CartContextValue {
  items:       CartItem[];
  totalItems:  number;
  subtotal:    number;
  hydrated:    boolean;
  addItem:     (item: CartItem) => void;
  removeItem:  (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clearCart:   () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "dhyom_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items,    dispatch]  = useReducer(reducer, []);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown[];
        dispatch({ type: "HYDRATE", items: parsed.map(normaliseLegacy) });
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal   = items.reduce((s, i) => s + i.price * i.quantity, 0);

  function addItem(item: CartItem)              { dispatch({ type: "ADD_ITEM",     payload: item }); }
  function removeItem(id: string)              { dispatch({ type: "REMOVE_ITEM",  id }); }
  function setQuantity(id: string, qty: number){ dispatch({ type: "SET_QUANTITY", id, quantity: qty }); }
  function clearCart()                         { dispatch({ type: "CLEAR" }); }

  return (
    <CartContext.Provider
      value={{ items, totalItems, subtotal, hydrated, addItem, removeItem, setQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
