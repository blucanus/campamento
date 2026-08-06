import Image from "next/image";
import Link from "next/link";
import Layout from "@/components/Layout";
import { connectDB } from "@/lib/db";
import { DEFAULT_EDITION, getCampEdition, type CampEdition } from "@/lib/campEdition";
import { resolveTierPrice } from "@/lib/pure";
import { env } from "@/lib/env";
import { MAPS_URL } from "@/lib/maps";

type HomeProps = {
  camp: Pick<CampEdition, "edition" | "datesText" | "priceNote" | "motto">;
  priceFull: number;
  priceOneDay: number;
};

export async function getServerSideProps(): Promise<{ props: HomeProps }> {
  try {
    await connectDB();
    const camp = await getCampEdition();
    // En la landing mostramos el precio del tramo vigente hoy.
    const { price } = resolveTierPrice(camp.pricing, new Date().toISOString().slice(0, 10));
    return {
      props: {
        camp,
        priceFull: price,
        priceOneDay: Math.round(price * Number(camp.pricing.oneDayFactor || 0.5))
      }
    };
  } catch {
    // Si la DB no responde, la landing igual tiene que verse.
    return {
      props: {
        camp: DEFAULT_EDITION,
        priceFull: env.CAMP_PRICE_FULL,
        priceOneDay: Math.round(env.CAMP_PRICE_FULL / 2)
      }
    };
  }
}

export default function Home({ camp, priceFull, priceOneDay }: HomeProps) {
  return (
    <Layout title="Inicio">
      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-grid">
          <div className="lp-hero-left">
            <div className="lp-logo">
              <Image
                src="/logo.png"
                alt={`Campa ICLP ${camp.edition}`}
                width={160}
                height={160}
                priority
              />
            </div>

            <div className="lp-eyebrow">Inscripción 100% online</div>

            <h1 className="lp-title">
              Campamento Familiar ICLP <span className="lp-badge">{camp.edition}</span>
            </h1>

            <p className="lp-subtitle lp-lead">{camp.motto}</p>

            <p className="lp-subtitle">
              Creemos que los campamentos no son solo un evento más en el calendario. Son una
              invitación de Dios a detenernos, a salir del ruido cotidiano y a volver a encontrarnos
              con Él y con los demás.
            </p>

            <div className="lp-meta">
              <div className="lp-chip">📅 {camp.datesText}</div>
              <div className="lp-chip">⏱️ Viernes a Domingo</div>
              <div className="lp-chip">👨‍👩‍👧‍👦 Cupos limitados</div>
            </div>

            <div className="lp-cta">
              <Link className="btn lg lp-btn-primary" href="/inscripcion/paso-1">
                Inscribirme
              </Link>
              <Link className="btn lg lp-btn-secondary" href="/merch">
                Comprar merch
              </Link>
              <a className="btn lg ghost" href="#info">
                Ver información
              </a>
            </div>

            <div className="lp-note">
              * El mail es obligatorio para confirmar la inscripción y avisarte el estado del pago.
            </div>
          </div>

          <div className="lp-hero-right">
            <div className="lp-hero-card">
              <h3>Lo esencial</h3>
              <ul className="lp-list">
                <li>✅ Inscripción online en menos de 2 minutos</li>
                <li>✅ Pago con Mercado Pago (crédito, débito o efectivo)</li>
                <li>✅ No es necesario tener cuenta de Mercado Pago</li>
                <li>✅ Después te avisamos habitación y cama</li>
              </ul>

              <div className="lp-divider" />

              <div style={{ marginBottom: 14 }}>
                <div className="lp-muted" style={{ fontWeight: 700 }}>
                  Valor por persona (hoy)
                </div>
                <div className="kpiBig">$ {priceFull.toLocaleString("es-AR")}</div>
                <div className="lp-muted">1 día: $ {priceOneDay.toLocaleString("es-AR")}</div>
              </div>

              <div className="lp-highlight">
                <div className="lp-highlight-title">¿Venís 1 día?</div>
                <div className="lp-highlight-text">
                  Pagás el <b>50%</b>. Si venís 2 días o todo el campa, pagás el <b>total</b>.
                </div>
              </div>

              <div className="lp-cta" style={{ marginTop: 14 }}>
                <Link className="btn block lp-btn-primary" href="/inscripcion/paso-1">
                  Empezar inscripción
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INFO */}
      <section id="info" className="lp-section">
        <div className="lp-section-head">
          <h2>Información del campamento</h2>
          <p>Todo lo que necesitás saber antes de inscribirte.</p>
        </div>

        <div className="lp-grid-3">
          <div className="card lp-card">
            <h3>¿Qué es?</h3>
            <p>
              El Campamento Familiar de la ICLP es un tiempo apartado para Dios. Un fin de semana
              para dejar por un momento las preocupaciones, las agendas y volver a lo esencial: la
              presencia de Dios, la comunión entre hermanos y la Palabra que nos ordena y renueva.
            </p>
            <p>
              Es un espacio para compartir en familia, para reír, para orar, para escuchar y para
              permitir que Dios haga su obra en nosotros.
            </p>
          </div>

          <div className="card lp-card">
            <h3>¿Qué incluye?</h3>
            <ul className="lp-list">
              <li>
                🍽️ <strong>Comida:</strong> desayuno, almuerzo y cena. Si tenés alguna restricción
                alimentaria específica, te pedimos que puedas traer tu propia comida.
              </li>
              <li>
                🛏️ <strong>Alojamiento:</strong> asignado según la organización del campamento.
              </li>
              <li>
                🎤 <strong>Reuniones y actividades:</strong> espacios de alabanza, Palabra, comunión
                y actividades para compartir como iglesia y como familias.
              </li>
            </ul>
          </div>

          <div className="card lp-card">
            <h3>¿Quiénes pueden ir?</h3>
            <p>El campamento está pensado para toda la familia.</p>
            <p>
              Los niños <strong>menores de 4 años</strong> no abonan inscripción y tenemos promoción
              a partir del quinto miembro familiar.
            </p>
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section className="lp-section lp-section-soft">
        <div className="lp-section-head">
          <h2>Precios</h2>
          <p>{camp.priceNote}</p>
        </div>

        <div className="lp-grid-2">
          <div className="card lp-card">
            <span className="badge success">Más elegido</span>
            <h3 style={{ marginTop: 12 }}>Campamento completo (2 días o más)</h3>
            <p className="lp-price">
              <b>$ {priceFull.toLocaleString("es-AR")}</b>
              <span className="lp-muted">por persona</span>
            </p>
            <p className="lp-muted">
              Si elegís 2 días (Vie-Sáb o Sáb-Dom) o todo el campa, abonás el total.
            </p>
          </div>

          <div className="card lp-card">
            <span className="badge">Flexible</span>
            <h3 style={{ marginTop: 12 }}>1 día</h3>
            <p className="lp-price">
              <b>$ {priceOneDay.toLocaleString("es-AR")}</b>
              <span className="lp-muted">50% del total</span>
            </p>
            <p className="lp-muted">Elegís si venís viernes, sábado o domingo.</p>
          </div>
        </div>

        <div className="lp-cta lp-center" style={{ marginTop: 22 }}>
          <Link className="btn lg lp-btn-primary" href="/inscripcion/paso-1">
            Inscribirme ahora
          </Link>
          <Link className="btn lg lp-btn-secondary" href="/merch">
            Comprar merch
          </Link>
        </div>
      </section>

      {/* CRONOGRAMA */}
      <section className="lp-section">
        <div className="lp-section-head">
          <h2>Cronograma</h2>
          <p>Ejemplo orientativo (lo definitivo se comunica cerca de la fecha).</p>
        </div>

        <div className="lp-grid-3">
          <div className="card lp-card">
            <span className="badge info">Día 1</span>
            <h3 style={{ marginTop: 12 }}>Viernes</h3>
            <ul className="lp-list">
              <li>🚌 Llegada y acreditación</li>
              <li>🍽️ Cena</li>
              <li>🔥 Reunión principal</li>
            </ul>
          </div>
          <div className="card lp-card">
            <span className="badge info">Día 2</span>
            <h3 style={{ marginTop: 12 }}>Sábado</h3>
            <ul className="lp-list">
              <li>☀️ Devocional</li>
              <li>🎯 Actividades / equipos</li>
              <li>🎤 Noche especial</li>
            </ul>
          </div>
          <div className="card lp-card">
            <span className="badge info">Día 3</span>
            <h3 style={{ marginTop: 12 }}>Domingo</h3>
            <ul className="lp-list">
              <li>🙏 Tiempo final</li>
              <li>🍽️ Almuerzo</li>
              <li>🏁 Cierre y regreso</li>
            </ul>
          </div>
        </div>
      </section>

      {/* UBICACION */}
      <section className="lp-section lp-section-soft">
        <div className="lp-section-head">
          <h2>Ubicación</h2>
          <p>Campamento Elim — Verónica, a 91 km de La Plata (1 h 20 min aprox.).</p>
        </div>

        <div className="card lp-card">
          <div className="lp-grid-2">
            <div>
              <h3>Cómo llegar</h3>
              <p className="lp-muted">
                Dirección: <b style={{ color: "var(--ink)" }}>Campamento Elim - Verónica</b>
              </p>
              <p className="lp-muted">
                Te dejamos el mapa y el link de Google Maps para que te guíe en el viaje.
              </p>
              <a className="btn secondary" href={MAPS_URL} target="_blank" rel="noreferrer">
                📍 Abrir en Google Maps
              </a>
            </div>
            <div className="lp-map-placeholder">
              <iframe
                title="Mapa Campamento Elim"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3253.56791744986!2d-57.33937452350733!3d-35.36636799817604!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x959899c7001d84fd%3A0xd812d8bcd5ecb77c!2sCAMPAMENTO%20ELIM!5e0!3m2!1ses!2sar!4v1768421328853!5m2!1ses!2sar"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section">
        <div className="lp-section-head">
          <h2>Preguntas frecuentes</h2>
          <p>Si te queda alguna duda, escribinos y te ayudamos.</p>
        </div>

        <div className="lp-faq">
          <details className="lp-faq-item">
            <summary>Quiero ir 1 día</summary>
            <p>
              Para ir 1 solo día al campa abonás el 50% de la entrada general, que sería un total de
              $ {priceOneDay.toLocaleString("es-AR")}.
            </p>
          </details>

          <details className="lp-faq-item">
            <summary>Quiero ir 2 días</summary>
            <p>
              Quienes participan dos días (viernes y sábado, o sábado y domingo) abonan el valor
              total.
            </p>
          </details>

          <details className="lp-faq-item">
            <summary>Formas de pago</summary>
            <p>
              Podés hacer el pago de forma digital mediante tarjeta de débito, crédito o dinero en
              cuenta. En el último paso de la inscripción se te lleva a Mercado Pago (no es
              necesario tener cuenta) y ahí elegís el método de pago, o iniciás sesión para usar
              dinero en cuenta o tus tarjetas guardadas.
            </p>
            <p>
              Si querés abonar en efectivo lo podés hacer mediante Rapipago o Pago Fácil con el
              cupón que se genera luego de que se te dirige a Mercado Pago.
            </p>
          </details>

          <details className="lp-faq-item">
            <summary>Ubicación</summary>
            <p>
              El Campamento Elim está ubicado en la ciudad de Verónica, a 91 km de La Plata, 1 h y
              20 min aproximados. Te dejamos el link de Google Maps para que te guíe:{" "}
              <a href={MAPS_URL} target="_blank" rel="noreferrer">
                ver ubicación
              </a>
              .
            </p>
          </details>

          <details className="lp-faq-item">
            <summary>Transporte Daniel Gadea / micro particular</summary>
            <p>
              Si necesitás transporte, el hermano Daniel Gadea ofrece su micro por un costo
              adicional. Coordiná con él al 2216 37-4066.
            </p>
          </details>

          <details className="lp-faq-item">
            <summary>¿Puedo elegir cama?</summary>
            <p>
              Las camas se asignarán prioritariamente a quienes tengan limitaciones físicas. No se
              podrá cambiar de cama ni habitación durante el campamento. ¡Gracias por tu
              comprensión!
            </p>
          </details>

          <details className="lp-faq-item">
            <summary>Dormir en carpa</summary>
            <p>
              Si querés traer tu carpa y dormir en ella, tendremos un espacio listo. Recordá que el
              costo de la entrada general es el mismo.
            </p>
          </details>

          <details className="lp-faq-item">
            <summary>Ropa de cama</summary>
            <p>
              Recordá llevar sábana y funda para la almohada. La habitación ya tiene frazadas y
              almohada.
            </p>
          </details>

          <details className="lp-faq-item">
            <summary>Menores de edad</summary>
            <p>
              Niños de 5 a 11 años: todos los niños deben ir con mamá, papá o tutor. ¡Sin
              excepciones!
            </p>
          </details>

          <details className="lp-faq-item">
            <summary>Menores de 15 años</summary>
            <p>
              Los adolescentes menores de 15 años pueden viajar con un adulto responsable. Solo
              necesitan una autorización firmada por sus padres, sin excepción.
            </p>
          </details>

          <details className="lp-faq-item">
            <summary>Mayores de 15 años</summary>
            <p>
              Los adolescentes mayores de 15 años pueden viajar solos con una autorización firmada
              por sus padres, sin excepción.
            </p>
          </details>
        </div>

        <div className="lp-cta lp-center" style={{ marginTop: 24 }}>
          <Link className="btn lg lp-btn-primary" href="/inscripcion/paso-1">
            Inscribirme
          </Link>
          <Link className="btn lg lp-btn-secondary" href="/merch">
            Comprar merch
          </Link>
        </div>
      </section>

      {/* CTA fijo mobile */}
      <div className="lp-sticky-cta">
        <Link className="btn lp-btn-primary lp-sticky-btn" href="/inscripcion/paso-1">
          Inscribirme
        </Link>
        <Link className="btn lp-btn-secondary lp-sticky-btn" href="/merch">
          Merch
        </Link>
      </div>
    </Layout>
  );
}
