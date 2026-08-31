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

const TALLES = ["M", "L", "XL", "XXL", "6", "7", "8"];

/** Una fila de la matriz: un color, con una variante por talle. */
type Fila = {
  color: string;
  porTalle: Map<string, Variant>;
};

/** Una tarjeta = un producto + un diseño. Adentro, colores x talles. */
type Diseno = {
  key: string;
  productId: string;
  productName: string;
  productType: "tee" | "cap";
  design: string;
  talles: string[];
  filas: Fila[];
};

const ordenTalle = (s: string) => {
  const i = TALLES.indexOf(s);
  return i === -1 ? 99 : i;
};

export default function AdminVariants() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");

  // Cambios pendientes. Se guardan por diseño.
  const [stockEdit, setStockEdit] = useState<Record<string, number>>({});
  const [activeEdit, setActiveEdit] = useState<Record<string, boolean>>({});
  const [priceEdit, setPriceEdit] = useState<Record<string, { bundle?: number; standalone?: number }>>({});
  const [photoEdit, setPhotoEdit] = useState<Record<string, string>>({});
  const [nuevoColor, setNuevoColor] = useState<Record<string, string>>({});

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
      setStockEdit({});
      setActiveEdit({});
      setPriceEdit({});
      setPhotoEdit({});
      setNuevoColor({});
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

  const disenos: Diseno[] = useMemo(() => {
    const map = new Map<string, Diseno>();

    for (const v of filtradas) {
      const key = `${v.productId}|${v.attributes.design}`;
      const size = String(v.attributes.size || "");

      let d = map.get(key);
      if (!d) {
        d = {
          key,
          productId: v.productId,
          productName: v.productName,
          productType: v.productType,
          design: v.attributes.design,
          talles: [],
          filas: [],
        };
        map.set(key, d);
      }

      if (!d.talles.includes(size)) d.talles.push(size);

      let fila = d.filas.find((f) => f.color === v.attributes.color);
      if (!fila) {
        fila = { color: v.attributes.color, porTalle: new Map() };
        d.filas.push(fila);
      }
      fila.porTalle.set(size, v);
    }

    return Array.from(map.values())
      .map((d) => ({
        ...d,
        talles: [...d.talles].sort((a, b) => ordenTalle(a) - ordenTalle(b)),
        filas: [...d.filas].sort((a, b) => a.color.localeCompare(b.color)),
      }))
      .sort((a, b) => `${a.productName}${a.design}`.localeCompare(`${b.productName}${b.design}`));
  }, [filtradas]);

  // ---- claves de edicion ----
  const kCell = (d: Diseno, color: string, size: string) => `${d.key}|${color}|${size}`;
  const kColor = (d: Diseno, color: string) => `${d.key}|${color}`;

  function getStock(d: Diseno, fila: Fila, size: string): number | null {
    const k = kCell(d, fila.color, size);
    if (k in stockEdit) return stockEdit[k];
    const v = fila.porTalle.get(size);
    return v ? Number(v.stock || 0) : null;
  }

  function getActive(d: Diseno, fila: Fila): boolean {
    const k = kColor(d, fila.color);
    if (k in activeEdit) return activeEdit[k];
    const alguna = [...fila.porTalle.values()][0];
    return alguna ? alguna.isActive : true;
  }

  function getPhoto(d: Diseno, fila: Fila): string {
    const k = kColor(d, fila.color);
    if (k in photoEdit) return photoEdit[k];
    const conFoto = [...fila.porTalle.values()].find((v) => v.photoUrl);
    return conFoto?.photoUrl || "";
  }

  /** Precio comun del diseño, o null si hay variantes con precios distintos. */
  function getPrecio(d: Diseno, campo: "bundle" | "standalone"): number | null {
    const edit = priceEdit[d.key]?.[campo];
    if (typeof edit === "number") return edit;

    const todas = d.filas.flatMap((f) => [...f.porTalle.values()]);
    const vals = todas.map((v) => Number(campo === "bundle" ? v.priceBundle : v.priceStandalone) || 0);
    if (!vals.length) return 0;
    return vals.every((x) => x === vals[0]) ? vals[0] : null;
  }

  function stockDelDiseno(d: Diseno) {
    return d.filas.reduce(
      (acc, f) => acc + d.talles.reduce((a, s) => a + (getStock(d, f, s) || 0), 0),
      0
    );
  }

  function sucio(d: Diseno) {
    const pref = `${d.key}|`;
    return (
      Object.keys(stockEdit).some((k) => k.startsWith(pref)) ||
      Object.keys(activeEdit).some((k) => k.startsWith(pref)) ||
      Object.keys(photoEdit).some((k) => k.startsWith(pref)) ||
      Boolean(priceEdit[d.key])
    );
  }

  // ---- guardado ----
  async function guardarDiseno(d: Diseno) {
    setSaving(d.key);
    try {
      const bundle = getPrecio(d, "bundle");
      const standalone = getPrecio(d, "standalone");

      for (const fila of d.filas) {
        const activo = getActive(d, fila);
        const foto = getPhoto(d, fila);

        for (const size of d.talles) {
          const existente = fila.porTalle.get(size);
          const st = getStock(d, fila, size);

          // Celda vacia que sigue vacia: no hay nada que hacer.
          if (!existente && st === null) continue;

          const body = {
            photoUrl: foto,
            stock: Number(st || 0),
            priceBundle: bundle ?? (existente ? existente.priceBundle : 0),
            priceStandalone: standalone ?? (existente ? existente.priceStandalone : 0),
            isActive: activo,
          };

          const r = existente
            ? await fetch("/api/admin/variants", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: existente.id, ...body }),
              })
            : await fetch("/api/admin/variants", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productId: d.productId,
                  design: d.design,
                  color: fila.color,
                  size,
                  ...body,
                }),
              });

          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.error || "No se pudo guardar");
        }
      }

      await loadAll();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving("");
    }
  }

  async function borrarColor(d: Diseno, fila: Fila) {
    const ids = [...fila.porTalle.values()].map((v) => v.id);
    if (!ids.length) return;
    if (!confirm(`¿Borrar ${d.design} · ${fila.color} (${ids.length} variante/s)?`)) return;

    setSaving(d.key);
    try {
      for (const id of ids) {
        const r = await fetch("/api/admin/variants", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "No se pudo borrar");
      }
      await loadAll();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No se pudo borrar");
    } finally {
      setSaving("");
    }
  }

  /** Suma un color al diseño, con los mismos talles y precios que ya tiene. */
  async function agregarColor(d: Diseno) {
    const nombre = String(nuevoColor[d.key] || "").trim();
    if (!nombre) return alert("Escribí el color");

    setSaving(d.key);
    try {
      for (const size of d.talles) {
        const r = await fetch("/api/admin/variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: d.productId,
            design: d.design,
            color: nombre,
            size,
            photoUrl: "",
            stock: 0,
            priceBundle: getPrecio(d, "bundle") ?? 0,
            priceStandalone: getPrecio(d, "standalone") ?? 0,
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "No se pudo agregar el color");
      }
      await loadAll();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No se pudo agregar el color");
    } finally {
      setSaving("");
    }
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

  const totalStock = disenos.reduce((acc, d) => acc + stockDelDiseno(d), 0);
  const totalColores = disenos.reduce((acc, d) => acc + d.filas.length, 0);

  return (
    <Layout title="Admin - Productos">
      <div className="row-between" style={{ marginBottom: 4 }}>
        <div>
          <h2 style={{ margin: 0 }}>Productos</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Una tarjeta por diseño. Adentro, un color por fila y el stock de cada talle.
          </div>
        </div>
        <div className="row">
          <button className="btn" type="button" onClick={() => setOpenNew((v) => !v)}>
            {openNew ? "Cerrar" : "＋ Nuevo diseño"}
          </button>
          <Link className="btn secondary" href="/admin">Volver</Link>
        </div>
      </div>

      {/* ALTA */}
      {openNew ? (
        <div className="card cardTight">
          <h3 style={{ marginTop: 0 }}>Cargar diseño nuevo</h3>
          <p className="muted" style={{ fontSize: 13.5 }}>
            {isTee
              ? "Elegí todos los talles de una: se crea una variante por talle. Después sumás más colores desde la tarjeta."
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
              <input value={design} onChange={(e) => setDesign(e.target.value)} placeholder="Ej: Acampar / León / Logo" />
            </div>
            <div>
              <label>Color</label>
              <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ej: Negro / Blanco" />
            </div>
            <div>
              <label>Stock por talle</label>
              <input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value || 0))} />
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
            <AdminImageUploader folder="products" value={photoUrl} onChange={setPhotoUrl} label="Foto" />
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
          <select value={fEstado} onChange={(e) => setFEstado(e.target.value as typeof fEstado)}>
            <option value="todas">Todas</option>
            <option value="activas">Solo activas</option>
            <option value="inactivas">Solo inactivas</option>
            <option value="sin-stock">Sin stock</option>
          </select>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <span className="badge">{disenos.length} diseño(s)</span>
          <span className="badge">{totalColores} color(es)</span>
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

      {!loading && !disenos.length ? (
        <div className="card cardTight muted">No hay productos que coincidan con el filtro.</div>
      ) : null}

      {/* UNA TARJETA POR DISEÑO */}
      {disenos.map((d) => {
        const bundle = getPrecio(d, "bundle");
        const standalone = getPrecio(d, "standalone");

        return (
          <div className="card cardTight" key={d.key}>
            <div className="grpHead">
              <div className="grpTitle">
                <b>{d.design}</b>
                <div className="muted" style={{ fontSize: 12.5 }}>{d.productName}</div>
                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                  <span className="badge">{d.filas.length} color(es)</span>
                  {d.productType === "tee" ? (
                    <span className="badge">{d.talles.length} talle(s)</span>
                  ) : null}
                  <span className={`badge ${stockDelDiseno(d) > 0 ? "success" : "danger"}`}>
                    {stockDelDiseno(d)} en stock
                  </span>
                </div>
              </div>

              {/* Precios del diseño: valen para todos sus colores y talles. */}
              <div className="grpPrices">
                <label className="varField">
                  <span>$ con inscripción</span>
                  <input
                    type="number"
                    min={0}
                    value={bundle ?? ""}
                    placeholder="Varios"
                    onChange={(e) =>
                      setPriceEdit((p) => ({ ...p, [d.key]: { ...p[d.key], bundle: Number(e.target.value || 0) } }))
                    }
                  />
                </label>
                <label className="varField">
                  <span>$ aparte</span>
                  <input
                    type="number"
                    min={0}
                    value={standalone ?? ""}
                    placeholder="Varios"
                    onChange={(e) =>
                      setPriceEdit((p) => ({ ...p, [d.key]: { ...p[d.key], standalone: Number(e.target.value || 0) } }))
                    }
                  />
                </label>
              </div>

              {sucio(d) ? (
                <button className="btn sm" type="button" onClick={() => guardarDiseno(d)} disabled={saving === d.key}>
                  {saving === d.key ? "Guardando..." : "Guardar"}
                </button>
              ) : null}
            </div>

            {/* MATRIZ color x talle */}
            <div className="tableWrap matrixWrap">
              <table className="matrix">
                <thead>
                  <tr>
                    <th className="mxColor">Color</th>
                    {d.talles.map((s) => (
                      <th key={s || "unica"}>{s || "Única"}</th>
                    ))}
                    <th>Total</th>
                    <th>A la venta</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.filas.map((f) => {
                    const total = d.talles.reduce((a, s) => a + (getStock(d, f, s) || 0), 0);
                    const foto = getPhoto(d, f);
                    return (
                      <tr key={f.color}>
                        <td className="mxColor">
                          <div className="mxColorCell">
                            {foto ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img className="mxThumb" src={foto} alt="" />
                            ) : (
                              <div className="mxThumb is-empty" aria-hidden />
                            )}
                            <b>{f.color}</b>
                          </div>
                        </td>

                        {d.talles.map((s) => {
                          const val = getStock(d, f, s);
                          return (
                            <td key={s || "unica"}>
                              <input
                                className="mxStock"
                                type="number"
                                min={0}
                                value={val === null ? "" : val}
                                placeholder="—"
                                title={val === null ? "No existe: escribí para crearlo" : undefined}
                                onChange={(e) =>
                                  setStockEdit((p) => ({
                                    ...p,
                                    [kCell(d, f.color, s)]: Number(e.target.value || 0),
                                  }))
                                }
                              />
                            </td>
                          );
                        })}

                        <td><b>{total}</b></td>

                        <td>
                          <input
                            type="checkbox"
                            checked={getActive(d, f)}
                            aria-label={`${f.color} a la venta`}
                            onChange={(e) =>
                              setActiveEdit((p) => ({ ...p, [kColor(d, f.color)]: e.target.checked }))
                            }
                          />
                        </td>

                        <td>
                          <button
                            className="btn sm secondary"
                            type="button"
                            onClick={() => borrarColor(d, f)}
                            title={`Borrar ${f.color}`}
                            aria-label={`Borrar ${f.color}`}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mxFoot">
              <div className="row" style={{ gap: 8 }}>
                <input
                  placeholder="Sumar color..."
                  value={nuevoColor[d.key] || ""}
                  onChange={(e) => setNuevoColor((p) => ({ ...p, [d.key]: e.target.value }))}
                  style={{ width: 180 }}
                />
                <button
                  className="btn sm secondary"
                  type="button"
                  onClick={() => agregarColor(d)}
                  disabled={saving === d.key}
                >
                  ＋ Agregar
                </button>
              </div>

              <details className="grpPhoto">
                <summary>Fotos por color</summary>
                <div className="mxPhotos">
                  {d.filas.map((f) => (
                    <div className="mxPhotoItem" key={f.color}>
                      <AdminImageUploader
                        folder="products"
                        value={getPhoto(d, f)}
                        onChange={(url) => setPhotoEdit((p) => ({ ...p, [kColor(d, f.color)]: url }))}
                        label={f.color}
                      />
                    </div>
                  ))}
                </div>
                <div className="fieldHint">Se aplican al guardar el diseño.</div>
              </details>
            </div>
          </div>
        );
      })}
    </Layout>
  );
}
