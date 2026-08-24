"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type MutableRefObject,
} from "react";

export interface FlyItem {
  id: number;
  imageUrl: string;
  fromX: number;
  fromY: number;
}

interface CartFlyContextValue {
  cartRef: MutableRefObject<HTMLElement | null>;
  triggerFly: (imageUrl: string, fromX: number, fromY: number) => void;
  flyItems: FlyItem[];
  removeFlyItem: (id: number) => void;
}

const CartFlyContext = createContext<CartFlyContextValue | null>(null);

let nextId = 0;

export function CartFlyProvider({ children }: { children: React.ReactNode }) {
  const cartRef = useRef<HTMLElement | null>(null);
  const [flyItems, setFlyItems] = useState<FlyItem[]>([]);

  const triggerFly = useCallback((imageUrl: string, fromX: number, fromY: number) => {
    const id = nextId++;
    setFlyItems((prev) => [...prev, { id, imageUrl, fromX, fromY }]);
  }, []);

  const removeFlyItem = useCallback((id: number) => {
    setFlyItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <CartFlyContext.Provider value={{ cartRef, triggerFly, flyItems, removeFlyItem }}>
      {children}
    </CartFlyContext.Provider>
  );
}

export function useCartFly() {
  const ctx = useContext(CartFlyContext);
  if (!ctx) throw new Error("useCartFly must be inside CartFlyProvider");
  return ctx;
}
