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

export default function AdminVariants() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);

  // form create
  const [productId, setProductId] = useState("");
  const [design, setDesign] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("M");
  const [photoUrl, setPhotoUrl] = useState("");
  const [stock, setStock] = useState(0);
  const [priceBundle, setPriceBundle] = useState(0);
  const [priceStandalone, setPriceStandalone] = useState(0);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, v] = await Promise.all([
        fetch("/api/admin/products").then((r) => r.json()),
        fetch("/api/admin/variants").then((r) => r.json()),
      ]);
      setProducts(p || []);
      setVariants(v || []);
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

  async function createVariant() {
    if (!productId || !design || !color) return alert("Completá producto, diseño y color");

    const r = await fetch("/api/admin/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        design,
        color,
        size: isTee ? size : "",
        photoUrl,
        stock,
        priceBundle,
        priceStandalone,
      }),
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) return alert(j.error || "Error creando variante");

    setDesign("");
    setColor("");
    setPhotoUrl("");
    setStock(0);
    await loadAll();
  }

  async function updateVariant(v: Variant) {
    const r = await fetch("/api/admin/variants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: v.id,
        photoUrl: v.photoUrl,
        stock: v.stock,
        priceBundle: v.priceBundle,
        priceStandalone: v.priceStandalone,
        isActive: v.isActive,
      }),
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) return alert(j.error || "Error actualizando");
    await loadAll();
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

  return (
    <Layout title="Admin - Variantes de productos">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Variantes de productos</h2>
          <Link className="btn secondary" href="/admin">
            Volver
          </Link>
        </div>

        <p style={{ opacity: 0.8 }}>
          Creá variantes por diseño/color/talle (remeras) y diseño/color (gorras). Stock y foto por variante.
        </p>

        {/* CREAR */}
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Crear variante</h3>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr" }}>
            <label>
              Producto
              <select value={productId} onChange={(e) => setProductId(e.target.value)}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Diseño
              <input value={design} onChange={(e) => setDesign(e.target.value)} placeholder="Ej: León / Logo / Fuego" />
            </label>

            <label>
              Color
              <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ej: Negro / Blanco / Azul" />
            </label>

            {isTee ? (
              <label>
                Talle
                <select value={size} onChange={(e) => setSize(e.target.value)}>
                  {["M","L","XL","XXL","6","7","8"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div />
            )}

            <label>
              Stock
              <input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} />
            </label>

            <label>
              Foto (URL manual opcional)
              <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="(opcional) https://..." />
            </label>

            <label>
              Precio con inscripción (bundle)
              <input type="number" value={priceBundle} onChange={(e) => setPriceBundle(Number(e.target.value))} />
            </label>

            <label>
              Precio comprando aparte
              <input type="number" value={priceStandalone} onChange={(e) => setPriceStandalone(Number(e.target.value))} />
            </label>
          </div>

          {/* ✅ UPLOADER VISIBLE */}
          <div className="card" style={{ marginTop: 12 }}>
            <AdminImageUploader
              folder={`products/${productId || "general"}`}
              value={photoUrl}
              onChange={(url) => setPhotoUrl(url)}
              label="Foto de la variante"
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <button className="btn" type="button" onClick={createVariant}>
              Guardar variante
            </button>
          </div>
        </div>

        {/* LISTADO */}
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Listado</h3>
          {loading ? <p>Cargando...</p> : null}

          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Diseño</th>
                <th>Color</th>
                <th>Talle</th>
                <th>Foto</th>
                <th>Stock</th>
                <th>$ Bundle</th>
                <th>$ Aparte</th>
                <th>Activo</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {variants.map((v) => (
                <tr key={v.id}>
                  <td>{v.sku}</td>
                  <td>{v.productName}</td>
                  <td>{v.attributes?.design}</td>
                  <td>{v.attributes?.color}</td>
                  <td>{v.attributes?.size || "-"}</td>

                  <td style={{ minWidth: 360 }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {v.photoUrl ? (
                          <img
                            src={v.photoUrl}
                            alt="foto"
                            style={{
                              width: 44,
                              height: 44,
                              objectFit: "cover",
                              borderRadius: 10,
                              border: "1px solid rgba(0,0,0,0.08)",
                            }}
                          />
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(15,118,110,0.08)" }} />
                        )}

                        <input
                          value={v.photoUrl || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, photoUrl: val } : x)));
                          }}
                          placeholder="URL de imagen..."
                          style={{ width: 240 }}
                        />
                      </div>

                      {/* ✅ UPLOADER POR FILA */}
                      <div className="card" style={{ margin: 0 }}>
                        <AdminImageUploader
                          folder={`products/${v.productId}`}
                          value={v.photoUrl}
                          onChange={(url) => {
                            setVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, photoUrl: url } : x)));
                          }}
                          label="Subir nueva foto"
                        />
                      </div>
                    </div>
                  </td>

                  <td>
                    <input
                      type="number"
                      value={v.stock}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, stock: val } : x)));
                      }}
                      style={{ width: 90 }}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={v.priceBundle}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, priceBundle: val } : x)));
                      }}
                      style={{ width: 110 }}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={v.priceStandalone}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, priceStandalone: val } : x)));
                      }}
                      style={{ width: 110 }}
                    />
                  </td>

                  <td>
                    <input
                      type="checkbox"
                      checked={v.isActive}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, isActive: val } : x)));
                      }}
                    />
                  </td>

                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn" type="button" onClick={() => updateVariant(v)}>
                      Guardar
                    </button>{" "}
                    <button className="btn secondary" type="button" onClick={() => deleteVariant(v.id)}>
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}

              {variants.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ opacity: 0.7 }}>
                    No hay variantes todavía.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12 }}>
          <Link className="btn" href="/admin/buy">
            Comprar productos (admin)
          </Link>
        </div>
      </div>
    </Layout>
  );
}
