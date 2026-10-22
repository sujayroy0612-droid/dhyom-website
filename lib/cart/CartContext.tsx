"use client";

import { createContext, useContext, useReducer, useEffect, useState, ReactNode } from "react";

/* ── Cart item ────────────────────────────────────────── */
export interface ProductCartItem {
  kind:            "product";
  id:              string;        // product UUID — dedup key for non-hamper items
  cartItemId:      string;        // unique per cart slot — key for remove/setQty
  name:            string;
  price:           number;
  quantity:        number;
  category:        string;
  subcategorySlug: string;
  label:           string;
  imageUrl:        string;
  // Optional hamper group fields
  hamperGroupId?:  string;        // UUID shared by all items in one hamper build
  hamperGroup?:    string;        // display name e.g. "Diwali Signature Hamper"
  isHamperBox?:    boolean;       // true for the box item in a hamper group
  giftMessage?:    string;        // stored on the box item
  hidePrices?:     boolean;       // stored on the box item
}

export type CartItem = ProductCartItem;

/* ── Legacy item migration ────────────────────────────── */
type LegacyItem = {
  id?: string; name?: string; price?: number; quantity?: number;
  category?: string; subcategorySlug?: string; label?: string; imageUrl?: string;
  cartItemId?: string; kind?: string;
  hamperGroupId?: string; hamperGroup?: string; isHamperBox?: boolean;
  giftMessage?: string; hidePrices?: boolean;
};

function normaliseLegacy(raw: unknown): CartItem | null {
  const r = raw as LegacyItem;
  if (r.kind === "hamper") return null;  // drop old-format hamper items
  if (!r.id) return null;
  return {
    kind:            "product",
    id:              r.id,
    cartItemId:      r.cartItemId ?? r.id,
    name:            r.name            ?? "",
    price:           r.price           ?? 0,
    quantity:        r.quantity        ?? 1,
    category:        r.category        ?? "",
    subcategorySlug: r.subcategorySlug ?? "",
    label:           r.label           ?? "",
    imageUrl:        r.imageUrl        ?? "",
    hamperGroupId:   r.hamperGroupId,
    hamperGroup:     r.hamperGroup,
    isHamperBox:     r.isHamperBox,
    giftMessage:     r.giftMessage,
    hidePrices:      r.hidePrices,
  };
}

/* ── Reducer ──────────────────────────────────────────── */
type Action =
  | { type: "HYDRATE";             items: CartItem[] }
  | { type: "ADD_ITEM";            payload: CartItem }
  | { type: "ADD_ITEMS";           payload: CartItem[] }
  | { type: "REMOVE_ITEM";         cartItemId: string }
  | { type: "REMOVE_HAMPER_GROUP"; hamperGroupId: string }
  | { type: "SET_QUANTITY";        cartItemId: string; quantity: number }
  | { type: "CLEAR" };

function reducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case "HYDRATE":
      return action.items;

    case "ADD_ITEM": {
      const item = action.payload;
      // Non-hamper items merge by product id
      if (!item.hamperGroupId) {
        const idx = state.findIndex(i => !i.hamperGroupId && i.id === item.id);
        if (idx >= 0) {
          return state.map((it, i) =>
            i === idx ? { ...it, quantity: Math.min(it.quantity + item.quantity, 10) } : it
          );
        }
      }
      return [...state, item];
    }

    case "ADD_ITEMS":
      return [...state, ...action.payload];

    case "REMOVE_ITEM":
      return state.filter(i => i.cartItemId !== action.cartItemId);

    case "REMOVE_HAMPER_GROUP":
      return state.filter(i => i.hamperGroupId !== action.hamperGroupId);

    case "SET_QUANTITY":
      return state.map(i =>
        i.cartItemId === action.cartItemId
          ? { ...i, quantity: Math.max(1, Math.min(action.quantity, 10)) }
          : i
      );

    case "CLEAR":
      return [];

    default:
      return state;
  }
}

/* ── Context ──────────────────────────────────────────── */
interface CartContextValue {
  items:             CartItem[];
  totalItems:        number;
  subtotal:          number;
  hydrated:          boolean;
  addItem:           (item: CartItem) => void;
  addItems:          (items: CartItem[]) => void;
  removeItem:        (cartItemId: string) => void;
  removeHamperGroup: (hamperGroupId: string) => void;
  setQuantity:       (cartItemId: string, quantity: number) => void;
  clearCart:         () => void;
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
        const normalised = parsed.map(normaliseLegacy).filter(Boolean) as CartItem[];
        dispatch({ type: "HYDRATE", items: normalised });
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, hydrated]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal   = items.reduce((s, i) => s + i.price * i.quantity, 0);

  function addItem(item: CartItem)                    { dispatch({ type: "ADD_ITEM",            payload: item }); }
  function addItems(batch: CartItem[])               { dispatch({ type: "ADD_ITEMS",            payload: batch }); }
  function removeItem(cartItemId: string)            { dispatch({ type: "REMOVE_ITEM",         cartItemId }); }
  function removeHamperGroup(hamperGroupId: string)  { dispatch({ type: "REMOVE_HAMPER_GROUP", hamperGroupId }); }
  function setQuantity(cartItemId: string, qty: number) { dispatch({ type: "SET_QUANTITY",     cartItemId, quantity: qty }); }
  function clearCart()                               { dispatch({ type: "CLEAR" }); }

  return (
    <CartContext.Provider value={{ items, totalItems, subtotal, hydrated, addItem, addItems, removeItem, removeHamperGroup, setQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
