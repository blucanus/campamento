import Layout from "@/components/Layout";
import AdminImageUploader from "@/components/AdminImageUploader";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Product = { id: string; name: string; type: "tee" | "cap"; isActive: boolean };

type Variant = {
  id: string;
  productId: string;
  productType: "tee" | "cap";
  productName: string;
  sku: string;
  attributes: { design: string; color: string; size?: string };
  photoUrl: string;
  stock: number;
  priceBundle: number;
  priceStandalone: number;
  isActive: boolean;
};

type Edit = Partial<Pick<Variant, "stock" | "priceBundle" | "priceStandalone" | "isActive" | "photoUrl">>;

const TALLES = ["M", "L", "XL", "XXL", "6", "7", "8"];

/** Un grupo = un producto + diseño + color. Adentro van los talles. */
type Grupo = {
  key: string;
  productName: string;
  productType: "tee" | "cap";
  design: string;
  color: string;
  photoUrl: string;
  items: Variant[];
};

export default function AdminVariants() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");

  // Cambios pendientes por variante (se guardan por grupo).
  const [edits, setEdits] = useState<Record<string, Edit>>({});

  // Alta
  const [creating, setCreating] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [productId, setProductId] = useState("");
  const [design, setDesign] = useState("");
  const [color, setColor] = useState("");
  const [sizes, setSizes] = useState<string[]>(["M"]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [stock, setStock] = useState(0);
  const [priceBundle, setPriceBundle] = useState(0);
  const [priceStandalone, setPriceStandalone] = useState(0);

  // Filtros
  const [q, setQ] = useState("");
  const [fProduct, setFProduct] = useState("todos");
  const [fEstado, setFEstado] = useState<"todas" | "activas" | "inactivas" | "sin-stock">("todas");

  async function loadAll() {
    setLoading(true);
    try {
      const [p, v] = await Promise.all([
        fetch("/api/admin/products").then((r) => r.json()),
        fetch("/api/admin/variants").then((r) => r.json()),
      ]);
      setProducts(p || []);
      setVariants(v || []);
      setEdits({});
      if (!productId && p?.[0]?.id) setProductId(p[0].id);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const isTee = selectedProduct?.type === "tee";

  const filtradas = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return variants.filter((v) => {
      if (fProduct !== "todos" && v.productId !== fProduct) return false;
      if (fEstado === "activas" && !v.isActive) return false;
      if (fEstado === "inactivas" && v.isActive) return false;
      if (fEstado === "sin-stock" && Number(v.stock) > 0) return false;
      if (!needle) return true;
      const hay = `${v.sku} ${v.productName} ${v.attributes.design} ${v.attributes.color} ${v.attributes.size || ""}`;
      return hay.toLowerCase().includes(needle);
    });
  }, [variants, q, fProduct, fEstado]);

  const grupos = useMemo(() => {
    const map = new Map<string, Grupo>();
    for (const v of filtradas) {
      const key = `${v.productId}|${v.attributes.design}|${v.attributes.color}`;
      const g = map.get(key);
      if (g) {
        g.items.push(v);
        if (!g.photoUrl && v.photoUrl) g.photoUrl = v.photoUrl;
      } else {
        map.set(key, {
          key,
          productName: v.productName,
          productType: v.productType,
          design: v.attributes.design,
          color: v.attributes.color,
          photoUrl: v.photoUrl,
          items: [v],
        });
      }
    }

    const orden = (s?: string) => {
      const i = TALLES.indexOf(String(s || ""));
      return i === -1 ? 99 : i;
    };

    return Array.from(map.values())
      .map((g) => ({ ...g, items: [...g.items].sort((a, b) => orden(a.attributes.size) - orden(b.attributes.size)) }))
      .sort((a, b) =>
        `${a.productName}${a.design}${a.color}`.localeCompare(`${b.productName}${b.design}${b.color}`)
      );
  }, [filtradas]);

  function valor(v: Variant): Variant {
    return { ...v, ...edits[v.id] };
  }

  function editar(id: string, patch: Edit) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function grupoSucio(g: Grupo) {
    return g.items.some((v) => edits[v.id]);
  }

  async function guardarGrupo(g: Grupo) {
    const pendientes = g.items.filter((v) => edits[v.id]);
    if (!pendientes.length) return;

    setSaving(g.key);
    try {
      for (const v of pendientes) {
        const x = valor(v);
        const r = await fetch("/api/admin/variants", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: x.id,
            photoUrl: x.photoUrl,
            stock: x.stock,
            priceBundle: x.priceBundle,
            priceStandalone: x.priceStandalone,
            isActive: x.isActive,
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Error actualizando");
      }
      await loadAll();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error actualizando");
    } finally {
      setSaving("");
    }
  }

  /** La foto es por variante, pero en la practica es la misma para todo el grupo. */
  function fotoDelGrupo(g: Grupo, url: string) {
    for (const v of g.items) editar(v.id, { photoUrl: url });
  }

  /** Precio comun del grupo, o null si los talles tienen precios distintos. */
  function precioComun(g: Grupo, campo: "priceBundle" | "priceStandalone"): number | null {
    const vals = g.items.map((v) => Number(valor(v)[campo] || 0));
    return vals.every((x) => x === vals[0]) ? vals[0] : null;
  }

  function precioDelGrupo(g: Grupo, campo: "priceBundle" | "priceStandalone", n: number) {
    for (const v of g.items) editar(v.id, { [campo]: n });
  }

  async function deleteVariant(id: string) {
    if (!confirm("¿Borrar esta variante?")) return;
    const r = await fetch("/api/admin/variants", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return alert(j.error || "Error borrando");
    await loadAll();
  }

  function toggleSize(s: string) {
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  /** Para remeras crea una variante por talle elegido, con los mismos datos. */
  async function createVariant() {
    if (!productId || !design.trim() || !color.trim()) {
      return alert("Completá producto, diseño y color");
    }
    if (isTee && !sizes.length) return alert("Elegí al menos un talle");

    setCreating(true);
    try {
      const lote = isTee ? sizes : [""];
      for (const size of lote) {
        const r = await fetch("/api/admin/variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            design: design.trim(),
            color: color.trim(),
            size,
            photoUrl,
            stock,
            priceBundle,
            priceStandalone,
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Error creando variante");
      }

      setDesign("");
      setColor("");
      setPhotoUrl("");
      setStock(0);
      setOpenNew(false);
      await loadAll();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error creando variante");
    } finally {
      setCreating(false);
    }
  }

  const totalStock = filtradas.reduce((acc, v) => acc + Number(valor(v).stock || 0), 0);

  return (
    <Layout title="Admin - Productos">
      <div className="row-between" style={{ marginBottom: 4 }}>
        <div>
          <h2 style={{ margin: 0 }}>Productos</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Cada diseño y color es una sección. Adentro cambiás stock y precios por talle.
          </div>
        </div>
        <div className="row">
          <button className="btn" type="button" onClick={() => setOpenNew((v) => !v)}>
            {openNew ? "Cerrar" : "＋ Nuevo"}
          </button>
          <Link className="btn secondary" href="/admin">Volver</Link>
        </div>
      </div>

      {/* ALTA */}
      {openNew ? (
        <div className="card cardTight">
          <h3 style={{ marginTop: 0 }}>Cargar producto nuevo</h3>
          <p className="muted" style={{ fontSize: 13.5 }}>
            {isTee
              ? "Elegí todos los talles de una: se crea una variante por talle con estos mismos datos."
              : "Las gorras no llevan talle."}
          </p>

          <div className="formGrid">
            <div>
              <label>Producto</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type === "tee" ? "remera" : "gorra"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Diseño</label>
              <input value={design} onChange={(e) => setDesign(e.target.value)} placeholder="Ej: León / Logo / Fuego" />
            </div>
            <div>
              <label>Color</label>
              <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ej: Negro / Blanco" />
            </div>
            <div>
              <label>Stock por talle</label>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(Number(e.target.value || 0))}
              />
            </div>
            <div>
              <label>Precio con inscripción</label>
              <input
                type="number"
                min={0}
                value={priceBundle}
                onChange={(e) => setPriceBundle(Number(e.target.value || 0))}
              />
            </div>
            <div>
              <label>Precio comprando aparte</label>
              <input
                type="number"
                min={0}
                value={priceStandalone}
                onChange={(e) => setPriceStandalone(Number(e.target.value || 0))}
              />
            </div>
          </div>

          {isTee ? (
            <div>
              <label>Talles</label>
              <div className="segment">
                {TALLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`segBtn sizeBtn ${sizes.includes(s) ? "isActive" : ""}`}
                    onClick={() => toggleSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="fieldHint">
                {sizes.length ? `Se crean ${sizes.length} variante(s).` : "Elegí al menos un talle."}
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 14 }}>
            <AdminImageUploader
              folder="products"
              value={photoUrl}
              onChange={setPhotoUrl}
              label="Foto"
            />
          </div>

          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" type="button" onClick={createVariant} disabled={creating}>
              {creating ? "Guardando..." : "Crear"}
            </button>
            <button className="btn secondary" type="button" onClick={() => setOpenNew(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {/* FILTROS */}
      <div className="card cardTight">
        <div className="filtersRow">
          <input
            placeholder="Buscar por diseño, color, talle o SKU..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select value={fProduct} onChange={(e) => setFProduct(e.target.value)}>
            <option value="todos">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={fEstado}
            onChange={(e) => setFEstado(e.target.value as typeof fEstado)}
          >
            <option value="todas">Todas</option>
            <option value="activas">Solo activas</option>
            <option value="inactivas">Solo inactivas</option>
            <option value="sin-stock">Sin stock</option>
          </select>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <span className="badge">{grupos.length} sección(es)</span>
          <span className="badge">{filtradas.length} variante(s)</span>
          <span className="badge success">{totalStock} en stock</span>
          {q || fProduct !== "todos" || fEstado !== "todas" ? (
            <button
              className="btn ghost sm"
              type="button"
              onClick={() => { setQ(""); setFProduct("todos"); setFEstado("todas"); }}
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      </div>

      {loading ? <div className="card cardTight muted">Cargando...</div> : null}

      {!loading && !grupos.length ? (
        <div className="card cardTight muted">
          No hay productos que coincidan con el filtro.
        </div>
      ) : null}

      {/* GRUPOS */}
      {grupos.map((g) => {
        const stockGrupo = g.items.reduce((acc, v) => acc + Number(valor(v).stock || 0), 0);
        const sucio = grupoSucio(g);
        const foto = valor(g.items[0]).photoUrl;

        return (
          <div className="card cardTight" key={g.key}>
            <div className="grpHead">
              {foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="grpThumb" src={foto} alt="" />
              ) : (
                <div className="grpThumb is-empty" aria-hidden />
              )}

              <div className="grpTitle">
                <b>{g.design} · {g.color}</b>
                <div className="muted" style={{ fontSize: 12.5 }}>{g.productName}</div>
                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                  <span className="badge">{g.items.length} {g.productType === "tee" ? "talle(s)" : "variante"}</span>
                  <span className={`badge ${stockGrupo > 0 ? "success" : "danger"}`}>
                    {stockGrupo} en stock
                  </span>
                </div>
              </div>

              {/* Los precios van por seccion: casi siempre son iguales en todos los talles. */}
              <div className="grpPrices">
                <label className="varField">
                  <span>$ con inscripción</span>
                  <input
                    type="number"
                    min={0}
                    value={precioComun(g, "priceBundle") ?? ""}
                    placeholder="Varios"
                    onChange={(e) => precioDelGrupo(g, "priceBundle", Number(e.target.value || 0))}
                  />
                </label>
                <label className="varField">
                  <span>$ aparte</span>
                  <input
                    type="number"
                    min={0}
                    value={precioComun(g, "priceStandalone") ?? ""}
                    placeholder="Varios"
                    onChange={(e) => precioDelGrupo(g, "priceStandalone", Number(e.target.value || 0))}
                  />
                </label>
              </div>

              {sucio ? (
                <button
                  className="btn sm"
                  type="button"
                  onClick={() => guardarGrupo(g)}
                  disabled={saving === g.key}
                >
                  {saving === g.key ? "Guardando..." : "Guardar"}
                </button>
              ) : null}
            </div>

            <div className="varList">
              {g.items.map((v0) => {
                const v = valor(v0);
                return (
                  <div className="varRow" key={v.id}>
                    <div className="varSize">
                      {v.attributes.size ? (
                        <span className="badge info">{v.attributes.size}</span>
                      ) : (
                        <span className="badge">Única</span>
                      )}
                    </div>

                    <label className="varField">
                      <span>Stock</span>
                      <input
                        type="number"
                        min={0}
                        value={v.stock}
                        onChange={(e) => editar(v.id, { stock: Number(e.target.value || 0) })}
                      />
                    </label>

                    <label className="varCheck">
                      <input
                        type="checkbox"
                        checked={v.isActive}
                        onChange={(e) => editar(v.id, { isActive: e.target.checked })}
                      />
                      <span>A la venta</span>
                    </label>

                    <button
                      className="btn sm secondary"
                      type="button"
                      onClick={() => deleteVariant(v.id)}
                      title="Borrar variante"
                      aria-label="Borrar variante"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>

            <details className="grpPhoto">
              <summary>Cambiar la foto de esta sección</summary>
              <div style={{ marginTop: 10 }}>
                <AdminImageUploader
                  folder="products"
                  value={foto}
                  onChange={(url) => fotoDelGrupo(g, url)}
                  label="Foto"
                />
                <div className="fieldHint">
                  Se aplica a los {g.items.length} talle(s) al guardar los cambios.
                </div>
              </div>
            </details>
          </div>
        );
      })}
    </Layout>
  );
}
