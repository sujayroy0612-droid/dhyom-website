"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import type { DbProductImage } from "@/lib/supabase/types";

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/* ── Category / subcategory display maps ── */
const CATEGORY_LABELS: Record<string, string> = {
  candle: "Candles", idol: "Idols", bracelet: "Bracelets",
  gift: "Gift Sets", "pooja-essentials": "Pooja Essentials",
};
const CATEGORY_ORDER = ["candle", "idol", "bracelet", "gift", "pooja-essentials"];

const SUBCAT_NAMES: Record<string, string> = {
  nakshatra: "Nakshatra", mandala: "Mandala",
  ganesha: "Ganesha", lakshmi: "Lakshmi", shiva: "Shiva", krishna: "Krishna",
  rudraksh: "Rudraksh Mala", "rose-quartz": "Rose Quartz",
  diwali: "Diwali", rakhi: "Rakhi", chhath: "Chhath Puja",
  "ganesh-chaturthi": "Ganesh Chaturthi", dussehra: "Dussehra",
  corporate: "Corporate", wedding: "Wedding",
  "incense-sticks": "Incense Sticks", "incense-cones": "Incense Cones",
  "ghee-batti": "Ghee Batti", camphor: "Camphor",
};

function subLabel(key: string) {
  return SUBCAT_NAMES[key] ?? key.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/* ── Types ── */
interface Product {
  id: string; name: string; category: string; type: string;
  subcategory: string | null; collection: string | null; fragrance: string | null;
  stock: number; price: number; mrp: number | null; image_url: string | null;
  bullet_points: string | null; is_visible: boolean; is_featured: boolean;
  sku: string | null; short_description: string | null; long_description: string | null;
  meta_title: string | null; meta_description: string | null;
  weight_grams: number | null; length_cm: number | null;
  width_cm: number | null; height_cm: number | null; hsn_code: string | null;
}

interface DrawerForm {
  name: string; category: string; type: string;
  subcat_value: string; fragrance: string;
  price: string; mrp: string; stock: string;
  is_visible: boolean; is_featured: boolean;
  bullet_points: string; sku: string; short_description: string;
  long_description: string; meta_title: string; meta_description: string;
  weight_grams: string; length_cm: string; width_cm: string; height_cm: string; hsn_code: string;
}

const EMPTY_DRAWER: DrawerForm = {
  name: "", category: "candle", type: "scented", subcat_value: "", fragrance: "",
  price: "", mrp: "", stock: "0", is_visible: true, is_featured: false,
  bullet_points: "", sku: "", short_description: "", long_description: "",
  meta_title: "", meta_description: "", weight_grams: "",
  length_cm: "", width_cm: "", height_cm: "", hsn_code: "",
};

function productToDrawer(p: Product): DrawerForm {
  return {
    name: p.name, category: p.category, type: p.type ?? "",
    subcat_value: p.collection ?? p.subcategory ?? "",
    fragrance: p.fragrance ?? "",
    price: String(p.price), mrp: p.mrp != null ? String(p.mrp) : "",
    stock: String(p.stock), is_visible: p.is_visible, is_featured: p.is_featured,
    bullet_points: p.bullet_points ?? "", sku: p.sku ?? "",
    short_description: p.short_description ?? "", long_description: p.long_description ?? "",
    meta_title: p.meta_title ?? "", meta_description: p.meta_description ?? "",
    weight_grams: p.weight_grams != null ? String(p.weight_grams) : "",
    length_cm: p.length_cm != null ? String(p.length_cm) : "",
    width_cm: p.width_cm != null ? String(p.width_cm) : "",
    height_cm: p.height_cm != null ? String(p.height_cm) : "",
    hsn_code: p.hsn_code ?? "",
  };
}

/* Returns the subcategory grouping key for a product */
function getSubkey(p: Product): string | null {
  return p.collection ?? p.subcategory ?? null;
}

interface CatOption { slug: string; name: string; }

/* ── Cloudinary ── */
async function uploadToCloudinary(file: File, publicId: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error("Cloudinary not configured.");
  const fd = new FormData();
  fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET); fd.append("public_id", publicId);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error?.message ?? "Upload failed"); }
  return (await res.json()).secure_url as string;
}

function slugify(v: string) { return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

/* ── Styles ── */
const FIELD = "w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.32)] focus:border-[rgba(196,163,115,0.55)] rounded-[3px] px-3 py-2 font-body font-light text-[rgba(245,237,224,0.75)] text-sm focus:outline-none transition-colors duration-150 placeholder:text-[rgba(245,237,224,0.18)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const LABEL = "block font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] mb-1";

export default function AdminProductsPage() {
  /* List */
  const [products,     setProducts]     = useState<Product[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set<string>(CATEGORY_ORDER));
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set<string>());
  const [uploading,    setUploading]    = useState<Record<string, boolean>>({});
  const [saving,       setSaving]       = useState<Record<string, Record<string, boolean>>>({});
  const [deltas,       setDeltas]       = useState<Record<string, number>>({});
  const [mrpDrafts,    setMrpDrafts]    = useState<Record<string, string>>({});
  const [priceDrafts,  setPriceDrafts]  = useState<Record<string, string>>({});
  const [toast,        setToast]        = useState("");
  const [bulletDrafts, setBulletDrafts] = useState<Record<string, string>>({});
  const [expandedDesc, setExpandedDesc] = useState<string | null>(null);

  /* Drawer */
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editingProd,  setEditingProd]  = useState<Product | null>(null);
  const [drawerForm,   setDrawerForm]   = useState<DrawerForm>(EMPTY_DRAWER);
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [drawerImages, setDrawerImages] = useState<DbProductImage[]>([]);
  const [imgsLoading,  setImgsLoading]  = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const imgFileRef = useRef<HTMLInputElement>(null);

  /* Category creation */
  const [extraCats,      setExtraCats]      = useState<CatOption[]>([]);
  const [catModal,       setCatModal]       = useState(false);
  const [catModalName,   setCatModalName]   = useState("");
  const [catModalSlug,   setCatModalSlug]   = useState("");
  const [catModalSaving, setCatModalSaving] = useState(false);
  const [showNewCat,     setShowNewCat]     = useState(false);
  const [newCatName,     setNewCatName]     = useState("");
  const [newCatSlug,     setNewCatSlug]     = useState("");
  const [creatingCat,    setCreatingCat]    = useState(false);

  const allCatOptions: CatOption[] = [
    ...CATEGORY_ORDER.map(s => ({ slug: s, name: CATEGORY_LABELS[s] ?? s })),
    ...extraCats,
  ];

  /* ── Load ── */
  useEffect(() => {
    supabase
      .from("products")
      .select("id,name,category,type,subcategory,collection,fragrance,stock,price,mrp,image_url,bullet_points,is_visible,is_featured,sku,short_description,long_description,meta_title,meta_description,weight_grams,length_cm,width_cm,height_cm,hsn_code")
      .order("category").order("name")
      .then(({ data }) => {
        const prods = (data ?? []) as Product[];
        setProducts(prods);
        const mrp: Record<string, string> = {};
        const price: Record<string, string> = {};
        const bullets: Record<string, string> = {};
        const subs = new Set<string>();
        for (const p of prods) {
          mrp[p.id]     = p.mrp != null ? String(p.mrp) : "";
          price[p.id]   = String(p.price);
          bullets[p.id] = p.bullet_points ?? "";
          const sk = getSubkey(p);
          if (sk) subs.add(`${p.category}::${sk}`);
        }
        setMrpDrafts(mrp); setPriceDrafts(price); setBulletDrafts(bullets);
        setExpandedSubs(subs); // all subs start expanded
        setLoading(false);
      });
  }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 5000); }
  function markSaving(id: string, field: string, val: boolean) {
    setSaving(s => ({ ...s, [id]: { ...(s[id] ?? {}), [field]: val } }));
  }
  function isSaving(id: string, field: string) { return !!saving[id]?.[field]; }

  /* ── Inline saves ── */
  async function saveMrp(product: Product) {
    const raw = (mrpDrafts[product.id] ?? "").trim();
    const val = raw === "" ? null : Number(raw);
    if (raw !== "" && (isNaN(val as number) || (val as number) < 0)) {
      setMrpDrafts(d => ({ ...d, [product.id]: product.mrp != null ? String(product.mrp) : "" })); return;
    }
    if (val === product.mrp) return;
    markSaving(product.id, "mrp", true);
    const { error } = await supabase.from("products").update({ mrp: val }).eq("id", product.id);
    if (error) showToast("Error saving MRP: " + error.message);
    else setProducts(prev => prev.map(p => p.id === product.id ? { ...p, mrp: val } : p));
    markSaving(product.id, "mrp", false);
  }

  async function savePrice(product: Product) {
    const raw = (priceDrafts[product.id] ?? "").trim();
    const val = Number(raw);
    if (isNaN(val) || val <= 0) { setPriceDrafts(d => ({ ...d, [product.id]: String(product.price) })); return; }
    if (val === product.price) return;
    markSaving(product.id, "price", true);
    const { error } = await supabase.from("products").update({ price: val }).eq("id", product.id);
    if (error) showToast("Error saving price: " + error.message);
    else setProducts(prev => prev.map(p => p.id === product.id ? { ...p, price: val } : p));
    markSaving(product.id, "price", false);
  }

  async function saveBullets(product: Product) {
    const val = (bulletDrafts[product.id] ?? "").trim() || null;
    if (val === (product.bullet_points ?? null)) return;
    markSaving(product.id, "bullets", true);
    const { error } = await supabase.from("products").update({ bullet_points: val }).eq("id", product.id);
    if (error) showToast("Error: " + error.message);
    else {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, bullet_points: val } : p));
      showToast("Description saved.");
    }
    markSaving(product.id, "bullets", false);
  }

  async function applyDelta(product: Product) {
    const delta = deltas[product.id] ?? 0;
    if (delta === 0) return;
    const newStock = Math.max(0, product.stock + delta);
    markSaving(product.id, "stock", true);
    const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", product.id);
    if (!error) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p));
      setDeltas(d => ({ ...d, [product.id]: 0 }));
    }
    markSaving(product.id, "stock", false);
  }

  async function handlePrimary(product: Product, file: File) {
    setUploading(u => ({ ...u, [product.id]: true }));
    try {
      const url = await uploadToCloudinary(file, `products/${product.id}_${Date.now()}`);
      await supabase.from("products").update({ image_url: url }).eq("id", product.id);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, image_url: url } : p));
    } catch (err) { showToast(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(u => ({ ...u, [product.id]: false })); }
  }

  async function toggleVisible(product: Product) {
    const next = !product.is_visible;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_visible: next } : p));
    const { error } = await supabase.from("products").update({ is_visible: next }).eq("id", product.id);
    if (error) {
      showToast("Error: " + error.message);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_visible: product.is_visible } : p));
    }
  }

  /* ── Expand/collapse ── */
  const allCatSlugs = [
    ...CATEGORY_ORDER,
    ...Array.from(new Set(products.map(p => p.category))).filter(c => !CATEGORY_ORDER.includes(c)),
  ];

  function toggleCat(cat: string) {
    setExpandedCats(prev => {
      const next = new Set<string>(Array.from(prev));
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  function toggleSub(catSlug: string, subkey: string) {
    const key = `${catSlug}::${subkey}`;
    setExpandedSubs(prev => {
      const next = new Set<string>(Array.from(prev));
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function expandAll() {
    setExpandedCats(new Set<string>(allCatSlugs));
    const allSubs = new Set<string>();
    products.forEach(p => { const sk = getSubkey(p); if (sk) allSubs.add(`${p.category}::${sk}`); });
    setExpandedSubs(allSubs);
  }
  function collapseAll() { setExpandedCats(new Set<string>()); setExpandedSubs(new Set<string>()); }

  /* ── Drawer ── */
  async function openEdit(product: Product) {
    setEditingProd(product); setDrawerForm(productToDrawer(product));
    setShowNewCat(false); setDrawerOpen(true); setImgsLoading(true);
    const { data } = await supabase.from("product_images").select("*").eq("product_id", product.id).order("display_order");
    setDrawerImages((data ?? []) as DbProductImage[]);
    setImgsLoading(false);
  }

  function openAdd(defaultCategory?: string, defaultSub?: string) {
    setEditingProd(null);
    setDrawerForm({ ...EMPTY_DRAWER, category: defaultCategory ?? "candle", subcat_value: defaultSub ?? "" });
    setDrawerImages([]); setShowNewCat(false); setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false); setEditingProd(null); setDrawerForm(EMPTY_DRAWER);
    setDrawerImages([]); setShowNewCat(false); setNewCatName(""); setNewCatSlug("");
  }

  /* ── Category creation ── */
  function openCatModal() { setCatModal(true); setCatModalName(""); setCatModalSlug(""); }
  function closeCatModal() { setCatModal(false); setCatModalName(""); setCatModalSlug(""); }

  async function saveCatModal() {
    if (!catModalName.trim() || !catModalSlug.trim()) { showToast("Name and slug required."); return; }
    setCatModalSaving(true);
    const { data, error } = await supabase.from("categories").insert({
      name: catModalName.trim(), slug: catModalSlug.trim(), display_order: 99, parent_id: null,
    }).select().single();
    setCatModalSaving(false);
    if (error) { showToast("Error: " + error.message); return; }
    const opt = { slug: data.slug as string, name: data.name as string };
    setExtraCats(prev => [...prev, opt]);
    closeCatModal();
    showToast(`Category "${opt.name}" created.`);
  }

  function handleNewCatName(val: string) { setNewCatName(val); setNewCatSlug(slugify(val)); }

  async function createCategory() {
    if (!newCatName.trim() || !newCatSlug.trim()) { showToast("Name and slug required."); return; }
    setCreatingCat(true);
    const { data, error } = await supabase.from("categories").insert({
      name: newCatName.trim(), slug: newCatSlug.trim(), display_order: 99, parent_id: null,
    }).select().single();
    setCreatingCat(false);
    if (error) { showToast("Error: " + error.message); return; }
    const opt = { slug: data.slug as string, name: data.name as string };
    setExtraCats(prev => [...prev, opt]);
    setDrawerForm(f => ({ ...f, category: opt.slug }));
    setShowNewCat(false); setNewCatName(""); setNewCatSlug("");
    showToast(`Category "${opt.name}" created and selected.`);
  }

  /* ── Drawer save ── */
  async function saveDrawer() {
    if (!drawerForm.name.trim()) { showToast("Product name is required."); return; }
    if (!drawerForm.price || Number(drawerForm.price) <= 0) { showToast("Valid price required."); return; }
    setDrawerSaving(true);

    const isCandle = drawerForm.category === "candle";
    const subVal   = drawerForm.subcat_value.trim() || null;

    const payload: Record<string, unknown> = {
      name: drawerForm.name.trim(), category: drawerForm.category,
      type: drawerForm.type.trim() || "general",
      collection:  isCandle ? subVal : null,
      subcategory: isCandle ? null   : subVal,
      fragrance: drawerForm.fragrance.trim() || null,
      price: Number(drawerForm.price),
      mrp: drawerForm.mrp ? Number(drawerForm.mrp) : null,
      stock: Number(drawerForm.stock) || 0,
      is_visible: drawerForm.is_visible, is_featured: drawerForm.is_featured,
      bullet_points: drawerForm.bullet_points.trim() || null,
      sku: drawerForm.sku.trim() || null,
      short_description: drawerForm.short_description.trim() || null,
      long_description:  drawerForm.long_description.trim()  || null,
      meta_title:        drawerForm.meta_title.trim()        || null,
      meta_description:  drawerForm.meta_description.trim()  || null,
      weight_grams: drawerForm.weight_grams ? Number(drawerForm.weight_grams) : null,
      length_cm:    drawerForm.length_cm    ? Number(drawerForm.length_cm)    : null,
      width_cm:     drawerForm.width_cm     ? Number(drawerForm.width_cm)     : null,
      height_cm:    drawerForm.height_cm    ? Number(drawerForm.height_cm)    : null,
      hsn_code:     drawerForm.hsn_code.trim() || null,
    };

    if (editingProd) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingProd.id);
      if (error) { showToast("Error: " + error.message); }
      else {
        setProducts(prev => prev.map(p => p.id === editingProd.id ? { ...p, ...(payload as Partial<Product>) } : p));
        setMrpDrafts(d => ({ ...d, [editingProd.id]: drawerForm.mrp }));
        setPriceDrafts(d => ({ ...d, [editingProd.id]: drawerForm.price }));
        setBulletDrafts(d => ({ ...d, [editingProd.id]: drawerForm.bullet_points }));
        showToast("Saved."); closeDrawer();
      }
    } else {
      const { data, error } = await supabase.from("products").insert({
        ...payload, description: "", image_url: "", image_urls: [],
      }).select().single();
      if (error) { showToast("Error: " + error.message); }
      else {
        const np = data as Product;
        setProducts(prev => [...prev, np].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
        setMrpDrafts(d => ({ ...d, [np.id]: np.mrp != null ? String(np.mrp) : "" }));
        setPriceDrafts(d => ({ ...d, [np.id]: String(np.price) }));
        setBulletDrafts(d => ({ ...d, [np.id]: np.bullet_points ?? "" }));
        setExpandedCats(prev => new Set<string>(Array.from(prev).concat(np.category)));
        const sk = getSubkey(np);
        if (sk) setExpandedSubs(prev => new Set<string>(Array.from(prev).concat(`${np.category}::${sk}`)));
        showToast("Product added."); closeDrawer();
      }
    }
    setDrawerSaving(false);
  }

  /* ── Product image management ── */
  async function uploadDrawerImage(file: File) {
    if (!editingProd) { showToast("Save the product first before uploading images."); return; }
    setImgUploading(true);
    try {
      const url = await uploadToCloudinary(file, `products/${editingProd.id}_img_${Date.now()}`);
      const isPrimary = drawerImages.length === 0;
      const { data, error } = await supabase.from("product_images").insert({
        product_id: editingProd.id, url, display_order: drawerImages.length, is_primary: isPrimary, alt_text: null,
      }).select().single();
      if (error) throw new Error(error.message);
      setDrawerImages(prev => [...prev, data as DbProductImage]);
      if (isPrimary) {
        await supabase.from("products").update({ image_url: url }).eq("id", editingProd.id);
        setProducts(prev => prev.map(p => p.id === editingProd.id ? { ...p, image_url: url } : p));
      }
    } catch (err) { showToast(err instanceof Error ? err.message : "Upload failed"); }
    finally { setImgUploading(false); if (imgFileRef.current) imgFileRef.current.value = ""; }
  }

  async function setPrimaryImage(img: DbProductImage) {
    if (!editingProd) return;
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", editingProd.id);
    await supabase.from("product_images").update({ is_primary: true }).eq("id", img.id);
    await supabase.from("products").update({ image_url: img.url }).eq("id", editingProd.id);
    setDrawerImages(prev => prev.map(i => ({ ...i, is_primary: i.id === img.id })));
    setProducts(prev => prev.map(p => p.id === editingProd.id ? { ...p, image_url: img.url } : p));
  }

  async function deleteImage(img: DbProductImage) {
    if (!editingProd || !confirm("Delete this image?")) return;
    const { error } = await supabase.from("product_images").delete().eq("id", img.id);
    if (error) { showToast("Error: " + error.message); return; }
    const remaining = drawerImages.filter(i => i.id !== img.id);
    setDrawerImages(remaining);
    if (img.is_primary && remaining.length > 0) {
      const next = remaining[0];
      await supabase.from("product_images").update({ is_primary: true }).eq("id", next.id);
      await supabase.from("products").update({ image_url: next.url }).eq("id", editingProd.id);
      setDrawerImages(prev => prev.filter(i => i.id !== img.id).map((i, idx) => idx === 0 ? { ...i, is_primary: true } : i));
      setProducts(prev => prev.map(p => p.id === editingProd.id ? { ...p, image_url: next.url } : p));
    }
    if (remaining.length === 0) setProducts(prev => prev.map(p => p.id === editingProd.id ? { ...p, image_url: null } : p));
  }

  /* ── Computed ── */
  const q        = search.trim().toLowerCase();
  const filtered = q ? products.filter(p => p.name.toLowerCase().includes(q)) : products;
  const lowCount = products.filter(p => p.stock < 10).length;

  /* ── Product row ── */
  function ProductRow({ product }: { product: Product }) {
    const low   = product.stock < 10;
    const delta = deltas[product.id] ?? 0;
    return (
      <React.Fragment>
        <div className="grid grid-cols-[56px_1fr_88px_88px_196px_36px_80px] gap-x-3 px-5 py-3 items-center hover:bg-[rgba(196,163,115,0.018)] transition-colors">
          {/* Thumb */}
          <div className="relative group/thumb flex-shrink-0">
            <div className={["w-14 h-14 rounded-[4px] border overflow-hidden relative bg-[#270b1b] flex items-center justify-center",
              product.image_url ? "border-[rgba(196,163,115,0.22)]" : "border-dashed border-[rgba(196,163,115,0.15)]"].join(" ")}>
              {product.image_url
                ? <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="56px" />
                : <span className="font-display text-[0.24rem] tracking-wide uppercase text-[rgba(196,163,115,0.18)]">img</span>}
              {uploading[product.id] && <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20"><div className="w-4 h-4 rounded-full border-2 border-[rgba(196,163,115,0.20)] border-t-brass animate-spin" /></div>}
              {!uploading[product.id] && <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/thumb:opacity-100 transition-opacity z-10 flex items-center justify-center pointer-events-none"><span className="font-display text-[0.24rem] uppercase text-ivory">Replace</span></div>}
            </div>
            {!uploading[product.id] && <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" style={{ fontSize: 0 }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePrimary(product, f); e.target.value = ""; }} />}
          </div>

          {/* Name */}
          <div className="min-w-0">
            <p className="font-display text-ivory leading-snug truncate" style={{ fontSize: "0.76rem", letterSpacing: "0.04em" }}>{product.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {product.fragrance && <span className="font-display text-[rgba(196,163,115,0.38)] text-[0.56rem] italic">{product.fragrance}</span>}
              {product.sku && <span className="font-mono text-[rgba(196,163,115,0.28)] text-[0.56rem]">{product.sku}</span>}
              <button onClick={() => setExpandedDesc(v => v === product.id ? null : product.id)}
                className={`font-display text-[0.32rem] tracking-[0.10em] uppercase px-1.5 py-0.5 rounded border transition-colors ${expandedDesc === product.id ? "border-brass text-brass bg-[rgba(196,163,115,0.08)]" : "border-[rgba(196,163,115,0.14)] text-[rgba(196,163,115,0.32)] hover:border-brass hover:text-brass"}`}>
                ✎ desc
              </button>
            </div>
          </div>

          {/* MRP */}
          <div className="relative">
            <input type="number" value={mrpDrafts[product.id] ?? ""} placeholder="—"
              onChange={e => setMrpDrafts(d => ({ ...d, [product.id]: e.target.value }))}
              onBlur={() => saveMrp(product)} onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="w-full bg-transparent border border-[rgba(196,163,115,0.14)] hover:border-[rgba(196,163,115,0.28)] focus:border-[rgba(196,163,115,0.48)] rounded-[3px] px-2 py-2 font-display text-[rgba(245,237,224,0.55)] text-[0.70rem] focus:outline-none transition-colors placeholder:text-[rgba(245,237,224,0.16)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            {isSaving(product.id, "mrp") && <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[rgba(196,163,115,0.45)] text-xs">…</span>}
          </div>

          {/* Price */}
          <div className="relative">
            <input type="number" value={priceDrafts[product.id] ?? ""}
              onChange={e => setPriceDrafts(d => ({ ...d, [product.id]: e.target.value }))}
              onBlur={() => savePrice(product)} onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="w-full bg-transparent border border-[rgba(196,163,115,0.14)] hover:border-[rgba(196,163,115,0.28)] focus:border-[rgba(196,163,115,0.48)] rounded-[3px] px-2 py-2 font-display text-brass text-[0.70rem] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            {isSaving(product.id, "price") && <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[rgba(196,163,115,0.45)] text-xs">…</span>}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setDeltas(d => ({ ...d, [product.id]: (d[product.id] ?? 0) - 1 }))} className="w-6 h-6 rounded-[3px] border border-[rgba(196,163,115,0.18)] text-[rgba(245,237,224,0.45)] hover:border-[rgba(196,163,115,0.40)] hover:text-ivory flex items-center justify-center text-sm leading-none transition-colors flex-shrink-0">−</button>
            <div className="flex flex-col items-center w-8 flex-shrink-0">
              <span className={`font-display text-[0.82rem] leading-none ${low ? "text-[rgba(200,80,80,0.85)]" : "text-ivory"}`}>{product.stock}</span>
              {delta !== 0 && <span className="font-display text-[0.34rem] text-brass mt-0.5">{delta > 0 ? `+${delta}` : delta}</span>}
            </div>
            <button onClick={() => setDeltas(d => ({ ...d, [product.id]: (d[product.id] ?? 0) + 1 }))} className="w-6 h-6 rounded-[3px] border border-[rgba(196,163,115,0.18)] text-[rgba(245,237,224,0.45)] hover:border-[rgba(196,163,115,0.40)] hover:text-ivory flex items-center justify-center text-sm leading-none transition-colors flex-shrink-0">+</button>
            <button disabled={delta === 0 || isSaving(product.id, "stock")} onClick={() => applyDelta(product)}
              className="font-display text-[0.36rem] tracking-[0.10em] uppercase px-1.5 py-1.5 border rounded-[3px] transition-all disabled:opacity-30 disabled:cursor-not-allowed border-[rgba(196,163,115,0.26)] text-brass hover:bg-[rgba(196,163,115,0.07)] flex-shrink-0">
              {isSaving(product.id, "stock") ? "…" : "Save"}
            </button>
            {low && delta === 0 && !isSaving(product.id, "stock") && <span className="font-display text-[0.30rem] uppercase text-[rgba(200,80,80,0.55)] flex-shrink-0">low</span>}
          </div>

          {/* Visible toggle */}
          <button onClick={() => toggleVisible(product)}
            className={`w-9 h-5 rounded-full border transition-all duration-200 flex-shrink-0 relative ${product.is_visible ? "bg-[rgba(196,163,115,0.14)] border-brass" : "bg-transparent border-[rgba(196,163,115,0.18)]"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${product.is_visible ? "left-[calc(100%-18px)] bg-brass" : "left-0.5 bg-[rgba(245,237,224,0.20)]"}`} />
          </button>

          {/* Edit */}
          <button onClick={() => openEdit(product)}
            className="font-display text-[0.36rem] tracking-[0.10em] uppercase px-2 py-1.5 border border-[rgba(196,163,115,0.18)] text-[rgba(245,237,224,0.40)] rounded-[3px] hover:border-brass hover:text-brass transition-colors whitespace-nowrap">
            Edit →
          </button>
        </div>

        {expandedDesc === product.id && (
          <div className="px-5 pb-3 pt-0.5 border-t border-[rgba(196,163,115,0.04)]">
            <textarea rows={4} value={bulletDrafts[product.id] ?? ""}
              onChange={e => setBulletDrafts(d => ({ ...d, [product.id]: e.target.value }))}
              onBlur={() => saveBullets(product)}
              placeholder={"100% natural soy wax\nBurns for up to 40 hours"}
              className="w-full bg-[rgba(245,237,224,0.02)] border border-[rgba(196,163,115,0.14)] hover:border-[rgba(196,163,115,0.28)] focus:border-[rgba(196,163,115,0.48)] rounded-[4px] px-3 py-2.5 font-body font-light text-[rgba(245,237,224,0.68)] text-sm leading-[1.75] placeholder:text-[rgba(245,237,224,0.14)] focus:outline-none resize-none transition-colors" />
            <p className="mt-1 font-display text-[0.30rem] uppercase text-[rgba(196,163,115,0.25)]">
              Auto-saves on blur · {isSaving(product.id, "bullets") ? "Saving…" : "Saved"}
            </p>
          </div>
        )}
      </React.Fragment>
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-[#12060e] flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
    </div>
  );

  /* ── Page ── */
  return (
    <>
    <div className="px-8 pt-8 pb-20">

      {/* Toast */}
      {toast && (
        <div className="mb-5 bg-[rgba(200,60,60,0.12)] border border-[rgba(200,60,60,0.28)] rounded-[6px] px-5 py-3 flex items-center justify-between">
          <p className="font-body font-light text-[rgba(220,80,80,0.90)] text-sm">{toast}</p>
          <button onClick={() => setToast("")} className="text-[rgba(220,80,80,0.55)] hover:text-[rgba(220,80,80,0.90)] text-lg leading-none ml-4">×</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Management</p>
          <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Products</h1>
        </div>
        <div className="flex items-center gap-2">
          {lowCount > 0 && (
            <span className="font-display text-[0.44rem] tracking-[0.14em] uppercase text-[rgba(200,80,80,0.72)] bg-[rgba(200,80,80,0.08)] border border-[rgba(200,80,80,0.20)] px-3 py-1.5 rounded-full">{lowCount} low stock</span>
          )}
          <button onClick={openCatModal} className="font-display text-[0.44rem] tracking-[0.16em] uppercase px-4 py-2.5 border border-[rgba(196,163,115,0.28)] text-[rgba(245,237,224,0.55)] rounded-[4px] hover:border-brass hover:text-brass transition-colors">+ Add Category</button>
          <button onClick={() => openAdd()} className="font-display text-[0.44rem] tracking-[0.16em] uppercase px-5 py-2.5 border border-brass text-brass bg-[rgba(196,163,115,0.05)] rounded-[4px] hover:bg-[rgba(196,163,115,0.12)] transition-colors">+ Add Product</button>
        </div>
      </div>

      {/* Cloudinary warning */}
      {(!CLOUD_NAME || !UPLOAD_PRESET) && (
        <div className="mb-5 bg-[rgba(200,140,40,0.10)] border border-[rgba(200,140,40,0.28)] rounded-[6px] px-5 py-3">
          <p className="font-body font-light text-[rgba(220,160,60,0.90)] text-sm">
            Image uploads require <code className="font-mono text-xs bg-[rgba(255,255,255,0.08)] px-1 py-0.5 rounded">NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code> and <code className="font-mono text-xs bg-[rgba(255,255,255,0.08)] px-1 py-0.5 rounded">NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</code>
          </p>
        </div>
      )}

      {/* Search + controls */}
      <div className="flex gap-3 mb-6 items-center">
        <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
          className="flex-1 bg-[#1e0c17] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.30)] focus:border-[rgba(196,163,115,0.50)] rounded-[4px] px-4 py-2.5 font-body font-light text-[rgba(245,237,224,0.72)] text-sm focus:outline-none transition-colors placeholder:text-[rgba(245,237,224,0.20)]" />
        <button onClick={expandAll}   className="font-display text-[0.40rem] tracking-[0.12em] uppercase px-3 py-2 border border-[rgba(196,163,115,0.18)] text-[rgba(245,237,224,0.35)] rounded-[3px] hover:border-[rgba(196,163,115,0.35)] hover:text-[rgba(245,237,224,0.60)] transition-colors whitespace-nowrap">Expand All</button>
        <button onClick={collapseAll} className="font-display text-[0.40rem] tracking-[0.12em] uppercase px-3 py-2 border border-[rgba(196,163,115,0.18)] text-[rgba(245,237,224,0.35)] rounded-[3px] hover:border-[rgba(196,163,115,0.35)] hover:text-[rgba(245,237,224,0.60)] transition-colors whitespace-nowrap">Collapse All</button>
      </div>

      {/* ── 2-level tree: Category → Subcategory → Products ── */}
      <div className="space-y-4">
        {allCatSlugs.map(catSlug => {
          const catLabel    = CATEGORY_LABELS[catSlug] ?? catSlug;
          const catProducts = filtered.filter(p => p.category === catSlug);
          const allInCat    = products.filter(p => p.category === catSlug);
          const isExpanded  = expandedCats.has(catSlug);

          if (q && catProducts.length === 0) return null;

          // Group by subcategory within this category
          const subGroups = new Map<string | null, Product[]>();
          catProducts.forEach(p => {
            const sk = getSubkey(p);
            if (!subGroups.has(sk)) subGroups.set(sk, []);
            subGroups.get(sk)!.push(p);
          });

          // Order: subcategories with a key first (alphabetically), then null (ungrouped)
          const sortedSubKeys = [
            ...Array.from(subGroups.keys()).filter(k => k !== null).sort() as string[],
            ...(subGroups.has(null) ? [null] : []),
          ];

          const hasSubcategories = sortedSubKeys.length > 1 || (sortedSubKeys.length === 1 && sortedSubKeys[0] !== null);

          return (
            <div key={catSlug} className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">

              {/* ── Category header ── */}
              <button onClick={() => toggleCat(catSlug)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[rgba(196,163,115,0.04)] transition-colors group">
                <div className="flex items-center gap-4">
                  <span className="font-display text-brass text-[0.65rem] opacity-50 group-hover:opacity-100 transition-opacity">
                    {isExpanded ? "▾" : "▸"}
                  </span>
                  <div className="text-left">
                    <p className="font-display text-ivory" style={{ fontSize: "1.0rem", letterSpacing: "0.06em" }}>{catLabel}</p>
                    <p className="font-display text-[0.36rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.35)] mt-0.5">
                      {allInCat.length} {allInCat.length === 1 ? "product" : "products"}
                      {hasSubcategories && <span className="ml-2 text-[rgba(196,163,115,0.25)]">· {sortedSubKeys.filter(k => k !== null).length} {sortedSubKeys.filter(k => k !== null).length === 1 ? "variation" : "variations"}</span>}
                      {allInCat.filter(p => p.stock < 10).length > 0 && <span className="ml-2 text-[rgba(200,80,80,0.55)]">· {allInCat.filter(p => p.stock < 10).length} low stock</span>}
                    </p>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); openAdd(catSlug); }}
                  className="font-display text-[0.36rem] tracking-[0.10em] uppercase px-3 py-1.5 border border-[rgba(196,163,115,0.18)] text-[rgba(196,163,115,0.40)] rounded-[3px] hover:border-brass hover:text-brass transition-colors opacity-0 group-hover:opacity-100">
                  + Add to {catLabel.replace(/s$/, "")}
                </button>
              </button>

              {/* ── Expanded content ── */}
              {isExpanded && (
                <div className="border-t border-[rgba(196,163,115,0.08)]">
                  {sortedSubKeys.map(subkey => {
                    const subProds  = subGroups.get(subkey) ?? [];
                    const subExpKey = subkey ? `${catSlug}::${subkey}` : null;
                    const subIsOpen = subExpKey ? expandedSubs.has(subExpKey) : true; // ungrouped always open

                    if (hasSubcategories && subkey !== null) {
                      /* ── Subcategory header ── */
                      return (
                        <div key={subkey} className="border-b border-[rgba(196,163,115,0.06)] last:border-b-0">
                          <button onClick={() => toggleSub(catSlug, subkey)}
                            className="w-full flex items-center justify-between pl-[52px] pr-5 py-3 hover:bg-[rgba(196,163,115,0.03)] transition-colors group/sub">
                            <div className="flex items-center gap-3">
                              <span className="font-display text-[rgba(196,163,115,0.45)] text-[0.55rem] opacity-60 group-hover/sub:opacity-100 transition-opacity">
                                {subIsOpen ? "▾" : "▸"}
                              </span>
                              <div className="text-left">
                                <p className="font-display text-[rgba(245,237,224,0.72)] text-[0.75rem] tracking-wide">{subLabel(subkey)}</p>
                                <p className="font-display text-[0.32rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.30)] mt-0.5">
                                  {subProds.length} {subProds.length === 1 ? "product" : "products"}
                                </p>
                              </div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); openAdd(catSlug, subkey); }}
                              className="font-display text-[0.32rem] tracking-[0.08em] uppercase px-2.5 py-1 border border-[rgba(196,163,115,0.15)] text-[rgba(196,163,115,0.35)] rounded-[3px] hover:border-brass hover:text-brass transition-colors opacity-0 group-hover/sub:opacity-100">
                              + Add here
                            </button>
                          </button>

                          {/* Sub product rows */}
                          {subIsOpen && (
                            <div className="divide-y divide-[rgba(196,163,115,0.04)]">
                              <div className="grid grid-cols-[56px_1fr_88px_88px_196px_36px_80px] gap-x-3 pl-[52px] pr-5 py-2 items-center">
                                {["", "Product", "MRP (₹)", "Price (₹)", "Stock", "", ""].map((h, i) => (
                                  <span key={i} className="font-display text-[0.32rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.22)]">{h}</span>
                                ))}
                              </div>
                              <div className="divide-y divide-[rgba(196,163,115,0.04)]">
                                {subProds.map(p => (
                                  <div key={p.id} className="pl-[52px] pr-5">
                                    <div className="grid grid-cols-[56px_1fr_88px_88px_196px_36px_80px] gap-x-3 py-3 items-center hover:bg-[rgba(196,163,115,0.018)] transition-colors -ml-[52px] -mr-5 pl-[52px] pr-5">
                                      {/* Thumb */}
                                      <div className="relative group/thumb flex-shrink-0">
                                        <div className={["w-14 h-14 rounded-[4px] border overflow-hidden relative bg-[#270b1b] flex items-center justify-center",
                                          p.image_url ? "border-[rgba(196,163,115,0.22)]" : "border-dashed border-[rgba(196,163,115,0.15)]"].join(" ")}>
                                          {p.image_url ? <Image src={p.image_url} alt={p.name} fill className="object-cover" sizes="56px" /> : <span className="font-display text-[0.24rem] uppercase text-[rgba(196,163,115,0.18)]">img</span>}
                                          {uploading[p.id] && <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20"><div className="w-4 h-4 rounded-full border-2 border-[rgba(196,163,115,0.20)] border-t-brass animate-spin" /></div>}
                                          {!uploading[p.id] && <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/thumb:opacity-100 transition-opacity z-10 flex items-center justify-center pointer-events-none"><span className="font-display text-[0.22rem] uppercase text-ivory">Replace</span></div>}
                                        </div>
                                        {!uploading[p.id] && <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" style={{ fontSize: 0 }} onChange={e => { const f = e.target.files?.[0]; if (f) handlePrimary(p, f); e.target.value = ""; }} />}
                                      </div>
                                      {/* Name */}
                                      <div className="min-w-0">
                                        <p className="font-display text-ivory leading-snug truncate" style={{ fontSize: "0.74rem", letterSpacing: "0.04em" }}>{p.name}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          {p.fragrance && <span className="font-display text-[rgba(196,163,115,0.35)] text-[0.52rem] italic">{p.fragrance}</span>}
                                          <button onClick={() => setExpandedDesc(v => v === p.id ? null : p.id)}
                                            className={`font-display text-[0.30rem] tracking-[0.08em] uppercase px-1 py-0.5 rounded border transition-colors ${expandedDesc === p.id ? "border-brass text-brass" : "border-[rgba(196,163,115,0.12)] text-[rgba(196,163,115,0.28)] hover:border-brass hover:text-brass"}`}>✎</button>
                                        </div>
                                      </div>
                                      {/* MRP */}
                                      <div className="relative">
                                        <input type="number" value={mrpDrafts[p.id] ?? ""} placeholder="—" onChange={e => setMrpDrafts(d => ({ ...d, [p.id]: e.target.value }))} onBlur={() => saveMrp(p)} onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                          className="w-full bg-transparent border border-[rgba(196,163,115,0.12)] hover:border-[rgba(196,163,115,0.26)] focus:border-[rgba(196,163,115,0.46)] rounded-[3px] px-2 py-2 font-display text-[rgba(245,237,224,0.52)] text-[0.68rem] focus:outline-none transition-colors placeholder:text-[rgba(245,237,224,0.14)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                        {isSaving(p.id, "mrp") && <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[rgba(196,163,115,0.45)] text-xs">…</span>}
                                      </div>
                                      {/* Price */}
                                      <div className="relative">
                                        <input type="number" value={priceDrafts[p.id] ?? ""} onChange={e => setPriceDrafts(d => ({ ...d, [p.id]: e.target.value }))} onBlur={() => savePrice(p)} onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                          className="w-full bg-transparent border border-[rgba(196,163,115,0.12)] hover:border-[rgba(196,163,115,0.26)] focus:border-[rgba(196,163,115,0.46)] rounded-[3px] px-2 py-2 font-display text-brass text-[0.68rem] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                        {isSaving(p.id, "price") && <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[rgba(196,163,115,0.45)] text-xs">…</span>}
                                      </div>
                                      {/* Stock */}
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => setDeltas(d => ({ ...d, [p.id]: (d[p.id] ?? 0) - 1 }))} className="w-6 h-6 rounded-[3px] border border-[rgba(196,163,115,0.16)] text-[rgba(245,237,224,0.42)] hover:border-[rgba(196,163,115,0.38)] hover:text-ivory flex items-center justify-center text-sm leading-none transition-colors flex-shrink-0">−</button>
                                        <div className="flex flex-col items-center w-8 flex-shrink-0">
                                          <span className={`font-display text-[0.80rem] leading-none ${p.stock < 10 ? "text-[rgba(200,80,80,0.82)]" : "text-ivory"}`}>{p.stock}</span>
                                          {(deltas[p.id] ?? 0) !== 0 && <span className="font-display text-[0.32rem] text-brass mt-0.5">{(deltas[p.id] ?? 0) > 0 ? `+${deltas[p.id]}` : deltas[p.id]}</span>}
                                        </div>
                                        <button onClick={() => setDeltas(d => ({ ...d, [p.id]: (d[p.id] ?? 0) + 1 }))} className="w-6 h-6 rounded-[3px] border border-[rgba(196,163,115,0.16)] text-[rgba(245,237,224,0.42)] hover:border-[rgba(196,163,115,0.38)] hover:text-ivory flex items-center justify-center text-sm leading-none transition-colors flex-shrink-0">+</button>
                                        <button disabled={(deltas[p.id] ?? 0) === 0 || isSaving(p.id, "stock")} onClick={() => applyDelta(p)}
                                          className="font-display text-[0.34rem] uppercase px-1.5 py-1.5 border rounded-[3px] transition-all disabled:opacity-30 disabled:cursor-not-allowed border-[rgba(196,163,115,0.24)] text-brass hover:bg-[rgba(196,163,115,0.07)] flex-shrink-0">
                                          {isSaving(p.id, "stock") ? "…" : "Save"}
                                        </button>
                                        {p.stock < 10 && (deltas[p.id] ?? 0) === 0 && <span className="font-display text-[0.28rem] uppercase text-[rgba(200,80,80,0.52)] flex-shrink-0">low</span>}
                                      </div>
                                      {/* Toggle */}
                                      <button onClick={() => toggleVisible(p)}
                                        className={`w-9 h-5 rounded-full border transition-all duration-200 flex-shrink-0 relative ${p.is_visible ? "bg-[rgba(196,163,115,0.14)] border-brass" : "bg-transparent border-[rgba(196,163,115,0.16)]"}`}>
                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${p.is_visible ? "left-[calc(100%-18px)] bg-brass" : "left-0.5 bg-[rgba(245,237,224,0.18)]"}`} />
                                      </button>
                                      {/* Edit */}
                                      <button onClick={() => openEdit(p)} className="font-display text-[0.34rem] uppercase px-2 py-1.5 border border-[rgba(196,163,115,0.16)] text-[rgba(245,237,224,0.38)] rounded-[3px] hover:border-brass hover:text-brass transition-colors whitespace-nowrap">Edit →</button>
                                    </div>
                                    {/* Bullet editor */}
                                    {expandedDesc === p.id && (
                                      <div className="py-2">
                                        <textarea rows={4} value={bulletDrafts[p.id] ?? ""} onChange={e => setBulletDrafts(d => ({ ...d, [p.id]: e.target.value }))} onBlur={() => saveBullets(p)}
                                          placeholder="One bullet per line" className="w-full bg-[rgba(245,237,224,0.02)] border border-[rgba(196,163,115,0.12)] hover:border-[rgba(196,163,115,0.26)] focus:border-[rgba(196,163,115,0.46)] rounded-[4px] px-3 py-2.5 font-body font-light text-[rgba(245,237,224,0.65)] text-sm leading-[1.75] placeholder:text-[rgba(245,237,224,0.12)] focus:outline-none resize-none transition-colors" />
                                        <p className="mt-0.5 font-display text-[0.28rem] uppercase text-[rgba(196,163,115,0.22)]">Auto-saves on blur · {isSaving(p.id, "bullets") ? "Saving…" : "Saved"}</p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      /* ── Products with no subcategory (or only subcategory group) ── */
                      return (
                        <div key="ungrouped">
                          {!hasSubcategories && (
                            <div className="grid grid-cols-[56px_1fr_88px_88px_196px_36px_80px] gap-x-3 px-5 py-2 items-center border-b border-[rgba(196,163,115,0.05)]">
                              {["", "Product", "MRP (₹)", "Price (₹)", "Stock", "", ""].map((h, i) => (
                                <span key={i} className="font-display text-[0.34rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.25)]">{h}</span>
                              ))}
                            </div>
                          )}
                          <div className="divide-y divide-[rgba(196,163,115,0.04)]">
                            {subProds.map(p => <ProductRow key={p.id} product={p} />)}
                          </div>
                        </div>
                      );
                    }
                  })}

                  {catProducts.length === 0 && (
                    <div className="px-5 py-8 text-center">
                      <p className="font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.20)]">{q ? "No products match" : "No products yet"}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    {/* ── Edit / Add Drawer ── */}
    {drawerOpen && (
      <>
        <div className="fixed inset-0 bg-black/55 z-40 backdrop-blur-sm" onClick={closeDrawer} />
        <div className="fixed top-0 right-0 bottom-0 w-full max-w-[520px] border-l border-[rgba(196,163,115,0.14)] z-50 flex flex-col overflow-hidden"
          style={{ background: '#1a0a12', boxShadow: '-16px 0 48px rgba(0,0,0,0.55)' }}>

          <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(196,163,115,0.10)] flex-shrink-0">
            <div>
              <p className="font-display text-[0.40rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.38)] mb-0.5">{editingProd ? "Edit Product" : "Add Product"}</p>
              <p className="font-display text-ivory text-[0.85rem] tracking-wide truncate max-w-[320px]">{editingProd ? editingProd.name : "New Product"}</p>
            </div>
            <button onClick={closeDrawer} className="w-9 h-9 flex items-center justify-center rounded-full text-[rgba(245,237,224,0.35)] hover:text-ivory hover:bg-[rgba(255,255,255,0.05)] transition-colors text-xl leading-none">×</button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Basic Info */}
            <section>
              <p className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-brass mb-3">Basic Info</p>
              <div className="space-y-3">
                <div><label className={LABEL}>Product Name *</label><input className={FIELD} value={drawerForm.name} onChange={e => setDrawerForm(f => ({ ...f, name: e.target.value }))} placeholder="Nakshatra Candle — Rose" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={LABEL}>SKU</label><input className={FIELD} value={drawerForm.sku} onChange={e => setDrawerForm(f => ({ ...f, sku: e.target.value }))} placeholder="NK-ROSE-001" /></div>
                  <div><label className={LABEL}>Type</label><input className={FIELD} value={drawerForm.type} onChange={e => setDrawerForm(f => ({ ...f, type: e.target.value }))} placeholder="scented" /></div>
                </div>

                {/* Category */}
                <div>
                  <div className="flex items-end justify-between mb-1">
                    <label className={LABEL + " mb-0"}>Category *</label>
                    {!showNewCat && <button onClick={() => setShowNewCat(true)} className="font-display text-[0.36rem] tracking-[0.10em] uppercase text-[rgba(196,163,115,0.42)] hover:text-brass transition-colors">+ Create new</button>}
                  </div>
                  <select className={FIELD} style={{ background: '#1a0a12' }} value={drawerForm.category} onChange={e => setDrawerForm(f => ({ ...f, category: e.target.value }))}>
                    {allCatOptions.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                  {showNewCat && (
                    <div className="mt-2 p-3 border border-[rgba(196,163,115,0.16)] rounded-[4px] bg-[rgba(196,163,115,0.02)]">
                      <p className="font-display text-[0.36rem] tracking-[0.14em] uppercase text-brass mb-2">New Category</p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div><label className={LABEL}>Name *</label><input className={FIELD} value={newCatName} onChange={e => handleNewCatName(e.target.value)} placeholder="Dhoop" autoFocus /></div>
                        <div><label className={LABEL}>Slug *</label><input className={FIELD} value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} placeholder="dhoop" /></div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={createCategory} disabled={creatingCat} className="font-display text-[0.36rem] tracking-[0.10em] uppercase px-3 py-1.5 border border-brass text-brass bg-[rgba(196,163,115,0.05)] rounded-[3px] hover:bg-[rgba(196,163,115,0.12)] disabled:opacity-40 transition-colors">{creatingCat ? "Creating…" : "Create & Select"}</button>
                        <button onClick={() => { setShowNewCat(false); setNewCatName(""); setNewCatSlug(""); }} className="font-display text-[0.36rem] tracking-[0.10em] uppercase px-3 py-1.5 border border-[rgba(196,163,115,0.16)] text-[rgba(245,237,224,0.36)] rounded-[3px] hover:border-[rgba(196,163,115,0.32)] transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subcategory / Collection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>
                      {drawerForm.category === "candle" ? "Collection" : "Subcategory"}
                    </label>
                    <input className={FIELD} value={drawerForm.subcat_value}
                      onChange={e => setDrawerForm(f => ({ ...f, subcat_value: e.target.value }))}
                      placeholder={drawerForm.category === "candle" ? "nakshatra" : "ganesha"} />
                    <p className="mt-0.5 font-display text-[0.32rem] tracking-[0.08em] uppercase text-[rgba(196,163,115,0.25)]">
                      {drawerForm.category === "candle" ? "nakshatra · mandala" : "Used for grouping in admin"}
                    </p>
                  </div>
                  <div>
                    <label className={LABEL}>Fragrance / Variant</label>
                    <input className={FIELD} value={drawerForm.fragrance} onChange={e => setDrawerForm(f => ({ ...f, fragrance: e.target.value }))} placeholder="Rose, Lavender…" />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <button type="button" onClick={() => setDrawerForm(f => ({ ...f, is_visible: !f.is_visible }))}
                      className={`w-10 h-5 rounded-full border transition-all duration-200 relative ${drawerForm.is_visible ? "bg-[rgba(196,163,115,0.15)] border-brass" : "bg-transparent border-[rgba(196,163,115,0.20)]"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${drawerForm.is_visible ? "left-[calc(100%-18px)] bg-brass" : "left-0.5 bg-[rgba(245,237,224,0.22)]"}`} />
                    </button>
                    <span className="font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(245,237,224,0.50)]">Visible on storefront</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <button type="button" onClick={() => setDrawerForm(f => ({ ...f, is_featured: !f.is_featured }))}
                      className={`w-10 h-5 rounded-full border transition-all duration-200 relative ${drawerForm.is_featured ? "bg-[rgba(196,163,115,0.15)] border-brass" : "bg-transparent border-[rgba(196,163,115,0.20)]"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${drawerForm.is_featured ? "left-[calc(100%-18px)] bg-brass" : "left-0.5 bg-[rgba(245,237,224,0.22)]"}`} />
                    </button>
                    <span className="font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(245,237,224,0.50)]">Featured</span>
                  </label>
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section>
              <p className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-brass mb-3">Pricing & Stock</p>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={LABEL}>Price (₹) *</label><input type="number" className={FIELD} value={drawerForm.price} onChange={e => setDrawerForm(f => ({ ...f, price: e.target.value }))} placeholder="999" /></div>
                <div><label className={LABEL}>MRP (₹)</label><input type="number" className={FIELD} value={drawerForm.mrp} onChange={e => setDrawerForm(f => ({ ...f, mrp: e.target.value }))} placeholder="1299" /></div>
                <div><label className={LABEL}>Stock</label><input type="number" className={FIELD} value={drawerForm.stock} onChange={e => setDrawerForm(f => ({ ...f, stock: e.target.value }))} placeholder="50" /></div>
              </div>
            </section>

            {/* Description */}
            <section>
              <p className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-brass mb-3">Description</p>
              <div className="space-y-3">
                <div><label className={LABEL}>Short Description</label><input className={FIELD} value={drawerForm.short_description} onChange={e => setDrawerForm(f => ({ ...f, short_description: e.target.value }))} placeholder="A divine candle for your sacred space" /></div>
                <div><label className={LABEL}>Bullet Points (one per line)</label>
                  <textarea rows={5} className={FIELD + " resize-none leading-[1.7]"} value={drawerForm.bullet_points} onChange={e => setDrawerForm(f => ({ ...f, bullet_points: e.target.value }))} placeholder={"100% natural soy wax\nBurns for up to 40 hours\nHand-poured in small batches"} />
                </div>
                <div><label className={LABEL}>Long Description</label>
                  <textarea rows={4} className={FIELD + " resize-none leading-[1.7]"} value={drawerForm.long_description} onChange={e => setDrawerForm(f => ({ ...f, long_description: e.target.value }))} placeholder="Detailed product description…" />
                </div>
              </div>
            </section>

            {/* Images (edit only) */}
            {editingProd && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-brass">Images</p>
                  <label className={["font-display text-[0.38rem] tracking-[0.12em] uppercase px-3 py-1.5 border rounded-[3px] cursor-pointer transition-colors",
                    imgUploading ? "border-[rgba(196,163,115,0.18)] text-[rgba(196,163,115,0.30)] cursor-not-allowed" : "border-[rgba(196,163,115,0.25)] text-[rgba(245,237,224,0.50)] hover:border-brass hover:text-brass"].join(" ")}>
                    {imgUploading ? "Uploading…" : "+ Upload"}
                    <input ref={imgFileRef} type="file" accept="image/*" className="hidden" disabled={imgUploading} onChange={e => { const f = e.target.files?.[0]; if (f) uploadDrawerImage(f); }} />
                  </label>
                </div>
                {imgsLoading ? <div className="h-20 flex items-center justify-center"><div className="w-4 h-4 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" /></div>
                : drawerImages.length === 0 ? (
                  <div className="border border-dashed border-[rgba(196,163,115,0.15)] rounded-[6px] p-5 text-center">
                    <p className="font-display text-[0.36rem] uppercase text-[rgba(196,163,115,0.22)]">No images yet — upload above</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {drawerImages.map(img => (
                      <div key={img.id} className="relative group">
                        <div className={`aspect-square rounded-[4px] overflow-hidden border relative ${img.is_primary ? "border-brass" : "border-[rgba(196,163,115,0.18)]"}`}>
                          <Image src={img.url} alt="" fill className="object-cover" sizes="160px" />
                          {img.is_primary && <div className="absolute top-1 left-1 bg-brass/90 text-[#1a0a12] font-display text-[0.26rem] uppercase px-1.5 py-0.5 rounded-sm">Primary</div>}
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-[4px] flex items-center justify-center gap-1">
                          {!img.is_primary && <button onClick={() => setPrimaryImage(img)} className="font-display text-[0.26rem] uppercase px-2 py-1 bg-brass text-[#1a0a12] rounded-[2px]">Set Primary</button>}
                          <button onClick={() => deleteImage(img)} className="font-display text-[0.26rem] uppercase px-2 py-1 bg-[rgba(200,60,60,0.80)] text-ivory rounded-[2px]">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* SEO */}
            <section>
              <p className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-brass mb-3">SEO</p>
              <div className="space-y-3">
                <div>
                  <div className="flex items-end justify-between mb-1"><label className={LABEL + " mb-0"}>Meta Title</label><span className={`font-display text-[0.32rem] ${drawerForm.meta_title.length > 60 ? "text-[rgba(200,80,80,0.65)]" : "text-[rgba(196,163,115,0.28)]"}`}>{drawerForm.meta_title.length}/60</span></div>
                  <input className={FIELD} value={drawerForm.meta_title} onChange={e => setDrawerForm(f => ({ ...f, meta_title: e.target.value }))} placeholder="Nakshatra Candle — Rose | Dhyom" />
                </div>
                <div>
                  <div className="flex items-end justify-between mb-1"><label className={LABEL + " mb-0"}>Meta Description</label><span className={`font-display text-[0.32rem] ${drawerForm.meta_description.length > 160 ? "text-[rgba(200,80,80,0.65)]" : "text-[rgba(196,163,115,0.28)]"}`}>{drawerForm.meta_description.length}/160</span></div>
                  <textarea rows={3} className={FIELD + " resize-none leading-[1.7]"} value={drawerForm.meta_description} onChange={e => setDrawerForm(f => ({ ...f, meta_description: e.target.value }))} placeholder="A hand-poured soy wax candle with rose fragrance." />
                </div>
              </div>
            </section>

            {/* Shipping */}
            <section>
              <p className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-brass mb-3">Shipping</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={LABEL}>Weight (grams)</label><input type="number" className={FIELD} value={drawerForm.weight_grams} onChange={e => setDrawerForm(f => ({ ...f, weight_grams: e.target.value }))} placeholder="350" /></div>
                  <div><label className={LABEL}>HSN Code</label><input className={FIELD} value={drawerForm.hsn_code} onChange={e => setDrawerForm(f => ({ ...f, hsn_code: e.target.value }))} placeholder="3406" /></div>
                </div>
                <div>
                  <label className={LABEL}>Dimensions (cm) — L × W × H</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" className={FIELD} value={drawerForm.length_cm} onChange={e => setDrawerForm(f => ({ ...f, length_cm: e.target.value }))} placeholder="10" />
                    <input type="number" className={FIELD} value={drawerForm.width_cm} onChange={e => setDrawerForm(f => ({ ...f, width_cm: e.target.value }))} placeholder="10" />
                    <input type="number" className={FIELD} value={drawerForm.height_cm} onChange={e => setDrawerForm(f => ({ ...f, height_cm: e.target.value }))} placeholder="12" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="flex-shrink-0 px-6 py-4 border-t border-[rgba(196,163,115,0.10)] flex items-center justify-between gap-3">
            <button onClick={closeDrawer} className="font-display text-[0.42rem] tracking-[0.14em] uppercase px-4 py-2.5 border border-[rgba(196,163,115,0.18)] text-[rgba(245,237,224,0.38)] rounded-[3px] hover:border-[rgba(196,163,115,0.35)] hover:text-[rgba(245,237,224,0.62)] transition-colors">Cancel</button>
            <button onClick={saveDrawer} disabled={drawerSaving} className="flex-1 font-display text-[0.44rem] tracking-[0.16em] uppercase py-2.5 border border-brass text-brass bg-[rgba(196,163,115,0.06)] rounded-[3px] hover:bg-[rgba(196,163,115,0.14)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {drawerSaving ? "Saving…" : editingProd ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </div>
      </>
    )}

    {/* ── Add Category Modal ── */}
    {catModal && (
      <>
        <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={closeCatModal} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="w-full max-w-sm pointer-events-auto rounded-[8px] border border-[rgba(196,163,115,0.18)] overflow-hidden" style={{ background: '#1a0a12' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(196,163,115,0.10)]">
              <div>
                <p className="font-display text-[0.40rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.38)] mb-0.5">Management</p>
                <p className="font-display text-ivory text-[0.85rem] tracking-wide">Add Category</p>
              </div>
              <button onClick={closeCatModal} className="w-8 h-8 flex items-center justify-center text-[rgba(245,237,224,0.35)] hover:text-ivory hover:bg-[rgba(255,255,255,0.05)] rounded-full transition-colors text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={LABEL}>Category Name *</label>
                <input className={FIELD} value={catModalName} autoFocus
                  onChange={e => { setCatModalName(e.target.value); setCatModalSlug(slugify(e.target.value)); }}
                  onKeyDown={e => { if (e.key === "Enter") saveCatModal(); if (e.key === "Escape") closeCatModal(); }}
                  placeholder="Dhoop Sticks" />
              </div>
              <div>
                <label className={LABEL}>Slug</label>
                <input className={FIELD} value={catModalSlug} onChange={e => setCatModalSlug(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveCatModal(); if (e.key === "Escape") closeCatModal(); }} placeholder="dhoop-sticks" />
                <p className="mt-1 font-display text-[0.32rem] uppercase text-[rgba(196,163,115,0.25)]">Lowercase, hyphens only · used in product URLs</p>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-[rgba(196,163,115,0.08)]">
              <button onClick={closeCatModal} className="font-display text-[0.42rem] tracking-[0.14em] uppercase px-4 py-2.5 border border-[rgba(196,163,115,0.18)] text-[rgba(245,237,224,0.38)] rounded-[3px] hover:border-[rgba(196,163,115,0.35)] hover:text-[rgba(245,237,224,0.62)] transition-colors">Cancel</button>
              <button onClick={saveCatModal} disabled={catModalSaving} className="flex-1 font-display text-[0.44rem] tracking-[0.16em] uppercase py-2.5 border border-brass text-brass bg-[rgba(196,163,115,0.06)] rounded-[3px] hover:bg-[rgba(196,163,115,0.14)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {catModalSaving ? "Creating…" : "Create Category"}
              </button>
            </div>
          </div>
        </div>
      </>
    )}
    </>
  );
}
