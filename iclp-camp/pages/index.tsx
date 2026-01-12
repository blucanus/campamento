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
                src="/logo-campa-2026.png"
                alt="Campa ICLP 2026"
                width={160}
                height={160}
                priority
              />
            </div>

            <h1 className="lp-title">
              Campamento ICLP <span className="lp-badge">2026</span>
            </h1>

            <p className="lp-subtitle">
              Un fin de semana para encontrarnos con Dios, hacer comunidad y volver renovados.
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
                <li>✅ Pago con Mercado Pago</li>
                <li>✅ Después te avisamos habitación y cama</li>
                <li>✅ Check-in rápido con QR en el campa</li>
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
                Un tiempo especial para desconectarnos de lo de siempre y enfocarnos en lo que importa:
                Dios, la comunión, el descanso y la palabra.
              </p>
            </div>

            <div className="card lp-card">
              <h3>¿Qué incluye?</h3>
              <ul className="lp-list">
                <li>🍽️ Comidas (según tu dieta)</li>
                <li>🛏️ Alojamiento (según asignación)</li>
                <li>🎤 Reuniones, actividades y tiempos de equipo</li>
                <li>🧾 Gestión y control desde la web</li>
              </ul>
            </div>

            <div className="card lp-card">
              <h3>¿Quiénes pueden ir?</h3>
              <p>
                Familias, jóvenes y adultos. Si alguien tiene <b>menos de 4 años</b>, no se le cobra.
              </p>
              <p className="lp-muted">
                Las restricciones alimentarias se indican en la inscripción.
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
            <p>Reglas simples para que no haya confusión.</p>
          </div>

          <div className="lp-grid-2">
            <div className="card lp-card">
              <h3>Campamento completo (2 días o más)</h3>
              <p className="lp-price">
                <span className="lp-price-big">$</span>
                <b>Precio total</b>
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
            <p>Agregamos dirección y mapa cuando lo confirmen.</p>
          </div>

          <div className="card lp-card">
            <div className="lp-grid-2">
              <div>
                <h3>Cómo llegar</h3>
                <p className="lp-muted">
                  Dirección: <b>Próximamente</b> <br />
                  Punto de encuentro: <b>Próximamente</b>
                </p>
              </div>
              <div className="lp-map-placeholder">
                <span>Mapa / ubicación</span>
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
              <summary>¿Cómo sé si el pago quedó confirmado?</summary>
              <p>Te llega un mail cuando cargás la inscripción y otro cuando el pago se aprueba.</p>
            </details>

            <details className="lp-faq-item">
              <summary>¿Cuándo me dicen habitación y cama?</summary>
              <p>Antes de la fecha del campa te va a llegar esa info por mail.</p>
            </details>

            <details className="lp-faq-item">
              <summary>¿Puedo inscribir a toda mi familia junta?</summary>
              <p>Sí, en el paso 1 elegís cuántas personas se anotan y luego cargás los datos de cada integrante.</p>
            </details>

            <details className="lp-faq-item">
              <summary>¿Qué pasa si alguien es menor de 4 años?</summary>
              <p>No se cobra, pero sí se registra para la organización.</p>
            </details>
          </div>

          <div className="lp-cta lp-center" style={{ marginTop: 16 }}>
            <Link className="btn lp-btn-primary" href="/inscripcion/paso-1">
              Inscribirme
            </Link>
          </div>
        </div>
      </section>

      {/* CTA fijo mobile */}
      <div className="lp-sticky-cta">
        <Link className="btn lp-btn-primary lp-sticky-btn" href="/inscripcion/paso-1">
          Inscribirme
        </Link>
      </div>
    </div>
  );
}
