export interface NavSubcategory {
  slug: string;
  title: string;
  href: string;
}

export interface NavCategory {
  category: string;
  title: string;
  href: string;
  subcategories: NavSubcategory[];
}

export const SHOP_NAV: NavCategory[] = [
  {
    category: "candle",
    title: "Candles",
    href: "/shop/candle",
    subcategories: [
      { slug: "nakshatra", title: "Nakshatra Collection", href: "/shop/candle/nakshatra" },
      { slug: "mandala",   title: "Mandala Collection",   href: "/shop/candle/mandala" },
    ],
  },
  {
    category: "idol",
    title: "Idols",
    href: "/shop/idol",
    subcategories: [
      { slug: "ganesha", title: "Ganesha", href: "/shop/idol/ganesha" },
      { slug: "lakshmi", title: "Lakshmi", href: "/shop/idol/lakshmi" },
    ],
  },
  {
    category: "bracelet",
    title: "Spiritual Bracelets",
    href: "/shop/bracelet",
    subcategories: [
      { slug: "rudraksh",    title: "Rudraksh Mala", href: "/shop/bracelet/rudraksh" },
      { slug: "rose-quartz", title: "Rose Quartz",   href: "/shop/bracelet/rose-quartz" },
    ],
  },
  {
    category: "gift",
    title: "Gift Sets",
    href: "/shop/gift",
    subcategories: [
      { slug: "diwali",           title: "Diwali",           href: "/shop/gift/diwali" },
      { slug: "rakhi",            title: "Rakhi",            href: "/shop/gift/rakhi" },
      { slug: "chhath",           title: "Chhath Puja",      href: "/shop/gift/chhath" },
      { slug: "ganesh-chaturthi", title: "Ganesh Chaturthi", href: "/shop/gift/ganesh-chaturthi" },
      { slug: "dussehra",         title: "Dussehra",         href: "/shop/gift/dussehra" },
      { slug: "corporate",        title: "Corporate",        href: "/shop/gift/corporate" },
      { slug: "wedding",          title: "Wedding",          href: "/shop/gift/wedding" },
    ],
  },
  {
    category: "pooja-essentials",
    title: "Pooja Essentials",
    href: "/shop/pooja-essentials",
    subcategories: [
      { slug: "incense-sticks", title: "Incense Sticks", href: "/shop/pooja-essentials/incense-sticks" },
      { slug: "incense-cones",  title: "Incense Cones",  href: "/shop/pooja-essentials/incense-cones" },
      { slug: "ghee-batti",     title: "Ghee Batti",     href: "/shop/pooja-essentials/ghee-batti" },
      { slug: "camphor",        title: "Camphor",        href: "/shop/pooja-essentials/camphor" },
    ],
  },
];
