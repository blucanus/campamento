import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="lp-hero">
        <div className="container lp-hero-grid">
          <div className="lp-hero-left">
            <div className="lp-logo">
              <Image
                src="/logo.png"
                alt="Campa ICLP 2026"
                width={160}
                height={160}
                priority
              />
            </div>

            <h1 className="lp-title">
              Campamento Familiar ICLP <span className="lp-badge">2026</span>
            </h1>

            <h2 className="lp-subtitle">
              “Hasta que nos venga a buscar”
            </h2>
            <p className="lp-subtitle">
              La inscripción es 100% digital desde esta web.
            </p>
            <p className="lp-subtitle">
              Creemos que los campamentos no son solo un evento más en el calendario. Son una invitación de Dios a detenernos, a salir del ruido cotidiano y a volver a encontrarnos con Él y con los demás.
            </p>

            <div className="lp-meta">
              <div className="lp-chip">📅 6, 7 y 8 de marzo 2026</div>
              <div className="lp-chip">⏱️ Viernes a Domingo</div>
              <div className="lp-chip">👨‍👩‍👧‍👦 Cupos limitados</div>
            </div>

            <div className="lp-cta">
              <Link className="btn lp-btn-primary" href="/inscripcion/paso-1">
                Inscribirme
              </Link>
              <a className="btn secondary" href="#info">
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
                <li>✅ Pago con Mercado Pago (Crédito, Débito, Efectivo)</li>
                <li>✅ No es necesario tener cuenta de Mercado Pago</li>
                <li>✅ Después te avisamos habitación y cama</li>
              </ul>

              <div className="lp-divider" />

              <div className="lp-highlight">
                <div className="lp-highlight-title">¿Venís 1 día?</div>
                <div className="lp-highlight-text">
                  Pagás el <b>50%</b>. Si venís 2 días o todo el campa, pagás el <b>total</b>.
                </div>
              </div>

              <div className="lp-cta" style={{ marginTop: 12 }}>
                <Link className="btn lp-btn-primary" href="/inscripcion/paso-1">
                  Empezar inscripción
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INFO */}
      <section id="info" className="lp-section">
        <div className="container">
          <div className="lp-section-head">
            <h2>Información del campamento</h2>
            <p>
              Todo lo que necesitás saber antes de inscribirte.
            </p>
          </div>

          <div className="lp-grid-3">
            <div className="card lp-card">
              <h3>¿Qué es?</h3>
              <p>
                El Campamento Familiar de la ICLP es un tiempo apartado para Dios.
                Un fin de semana para dejar por un momento las preocupaciones, las agendas y volver a lo esencial: la presencia de Dios, la comunión entre hermanos y a la Palabra que nos ordena y renueva.
              </p>
              <p>
                Es un espacio para compartir en familia, para reír, para orar, para escuchar y para permitir que Dios haga su obra en nosotros.

              </p>
            </div>

            <div className="card lp-card">
              <h3>¿Qué incluye?</h3>
              <ul className="lp-list">
                <li>🍽️ <strong>Comida:</strong><br />
                  Incluye desayuno, almuerzo y cena.<br />
                  Si tenés alguna restricción alimentaria específica, te pedimos que puedas traer tu propia comida.</li>
                <li>🛏️ <strong>Alojamiento:</strong><br />
                  Alojamiento asignado según la organización del campamento.
                </li>
                <li>🎤 <strong>Reuniones, actividades y tiempos de equipo:</strong><br />
                  Espacios de alabanza, Palabra, comunión y actividades para compartir como iglesia y como familias.</li>
              </ul>
            </div>

            <div className="card lp-card">
              <h3>¿Quiénes pueden ir?</h3>
              <p>
                El campamento está pensado para toda la familia.<br />
                Los niños <strong>menores de 4 años</strong> no abonan inscripción y tenemos promoción a partir de quinto miembro familiar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section className="lp-section lp-section-soft">
        <div className="container">
          <div className="lp-section-head">
            <h2>Precios</h2>
            <p>Valores hasta el 31/01/2026</p>
          </div>

          <div className="lp-grid-2">
            <div className="card lp-card">
              <h3>Campamento completo (2 días o más)</h3>
              <p className="lp-price">
                <span className="lp-price-big">$</span>
                <b>$ 63.000</b>por persona
              </p>
              <p className="lp-muted">
                Si elegís 2 días (Vie-Sáb o Sáb-Dom) o todo el campa, abonás el total.
              </p>
            </div>

            <div className="card lp-card">
              <h3>1 día</h3>
              <p className="lp-price">
                <b>50% del total</b>
              </p>
              <p className="lp-muted">
                Elegís si venís Viernes, Sábado o Domingo.
              </p>
            </div>
          </div>

          <div className="lp-cta lp-center" style={{ marginTop: 18 }}>
            <Link className="btn lp-btn-primary" href="/inscripcion/paso-1">
              Inscribirme ahora
            </Link>
          </div>
        </div>
      </section>

      {/* CRONOGRAMA */}
      <section className="lp-section">
        <div className="container">
          <div className="lp-section-head">
            <h2>Cronograma</h2>
            <p>Ejemplo orientativo (lo definitivo se comunica cerca de la fecha).</p>
          </div>

          <div className="lp-grid-3">
            <div className="card lp-card">
              <h3>Viernes</h3>
              <ul className="lp-list">
                <li>🚌 Llegada y acreditación</li>
                <li>🍽️ Cena</li>
                <li>🔥 Reunión principal</li>
              </ul>
            </div>
            <div className="card lp-card">
              <h3>Sábado</h3>
              <ul className="lp-list">
                <li>☀️ Devocional</li>
                <li>🎯 Actividades / equipos</li>
                <li>🎤 Noche especial</li>
              </ul>
            </div>
            <div className="card lp-card">
              <h3>Domingo</h3>
              <ul className="lp-list">
                <li>🙏 Tiempo final</li>
                <li>🍽️ Almuerzo</li>
                <li>🏁 Cierre y regreso</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* UBICACION */}
      <section className="lp-section lp-section-soft">
        <div className="container">
          <div className="lp-section-head">
            <h2>Ubicación</h2>
          </div>

          <div className="card lp-card">
            <div className="lp-grid-2">
              <div>
                <h3>Cómo llegar</h3>
                <p className="lp-muted">
                  Dirección: <b>Campamento Elim - Verónica</b>

                </p>
              </div>
              <div className="lp-map-placeholder">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3253.56791744986!2d-57.33937452350733!3d-35.36636799817604!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x959899c7001d84fd%3A0xd812d8bcd5ecb77c!2sCAMPAMENTO%20ELIM!5e0!3m2!1ses!2sar!4v1768421328853!5m2!1ses!2sar"
                  
                 
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section">
        <div className="container">
          <div className="lp-section-head">
            <h2>Preguntas frecuentes</h2>
          </div>

          <div className="lp-faq">
            <details className="lp-faq-item">
              <summary>Quiero ir  1 día:</summary>
              <p>1 día de campa: Para ir 1 solo día al campa abonás el 50% de la entrada general, que sería un total de $32.500.</p>
            </details>

            <details className="lp-faq-item">
              <summary>Quiero ir  2 días:</summary>
              <p>Quienes participan dos días (viernes y sábado, o sábado y domingo)  abonan el valor total.</p>
            </details>

            <details className="lp-faq-item">
              <summary>Formas de pago</summary>
              <p>Podés hacer el pago de forma digital mediante tarjeta de débito, crédito o dinero en cuenta en el último paso de la inscripción se te va a llevar a Mercado Pago (no es necesario tener cuenta) y ahí elegís el método de pago o inicias sesión para usar dinero en cuenta o tus tarjetas guardadas.</p>
              <p>
                Si querés abonar en efectivo lo podés hacer mediante Rapipago o Pago Fácil con el cupón que se genera luego de que se te dirige a Mercado Pago.
              </p>
            </details>

            <details className="lp-faq-item">
              <summary>Ubicación</summary>
              <p>El campamento Elim, está ubicado en la ciudad de Verónica a 91 Km de La Plata, 1hr y 20 min aproximados. Te dejamos el link de Google Maps para que te guie en como llegar. https://maps.app.goo.gl/YwMEDeD5yiQG342b8</p>
            </details>

            <details className="lp-faq-item">
              <summary>Transporte Daniel Gadea/ Micro particular</summary>
              <p>Si necesitas transporte, el hermano Daniel Gadea ofrece su micro por un costo adicional. Coordina con él al 2216 37-4066.</p>
            </details>
            <details className="lp-faq-item">
              <summary>¿Puedo elegir cama?</summary>
              <p>Las camas se asignarán prioritariamente a quienes tengan limitaciones físicas. No se podrá cambiar de cama ni habitación durante el campamento, ¡gracias por tu comprensión!</p>
            </details>
            <details className="lp-faq-item">
              <summary>Dormir en carpa: </summary>
              <p>Si querés traer tu carpa  y dormir en ella, tendremos un espacio listo. Recordá que el costo de la entrada general es el mismo.</p>
            </details>
            <details className="lp-faq-item">
              <summary>Ropa de cama: </summary>
              <p>Recordá Llevar sábana y funda para la almohada. La habitación ya tiene frazadas y almohada.</p>
            </details>
            <details className="lp-faq-item">
              <summary>Menores de edad: </summary>
              <p>Niños de 5 a 11 años:  Todos los niños deben ir con mamá, papá o tutor. ¡Sin excepciones!</p>
            </details>
            <details className="lp-faq-item">
              <summary>Menores de 15 años:</summary>
              <p>Los adolescentes menores de 15 años pueden viajar con un adulto responsable. Solo necesitan una autorización firmada por sus padres, sin excepción.</p>
            </details>
            <details className="lp-faq-item">
              <summary>Mayores de 15 años: </summary>
              <p>Los adolescentes mayores de 15 años pueden viajar solos con una autorización firmada por sus padres, sin excepción.</p>
            </details>
          </div>

          <div className="lp-cta lp-center gap-2" style={{ marginTop: 16 }}>
            <Link className="btn lp-btn-primary" href="/inscripcion/paso-1">
              Inscribirme
            </Link>
            <Link className="btn lp-btn-secondary lp-sticky-btn" href="/merch">
              Comprar merch
            </Link>
          </div>
        </div>
      </section>

      {/* CTA fijo mobile */}
      <div className="lp-sticky-cta gap-2">
        <Link className="btn lp-btn-primary lp-sticky-btn" href="/inscripcion/paso-1">
          Inscribirme
        </Link>
        <Link className="btn lp-btn-secondary lp-sticky-btn" href="/merch">
          Comprar merch
        </Link>
      </div>
    </div>
  );
}
