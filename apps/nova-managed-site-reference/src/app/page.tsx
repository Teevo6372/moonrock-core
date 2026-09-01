import { business } from "../content/business";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="eyebrow">Nova-managed reference site</div>
        <h1>{business.name}</h1>
        <p className="tagline">{business.tagline}</p>
        <div className="actions">
          <a className="button primary" href={`mailto:${business.email}`}>{business.ctas.primary}</a>
          <a className="button" href={`tel:${business.phone.replace(/[^\d+]/g, "")}`}>{business.ctas.secondary}</a>
        </div>
      </section>

      <section>
        <h2>Services</h2>
        <div className="grid">
          {business.services.map((service) => (
            <article className="card" key={service.name}>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="split">
        <div>
          <h2>Service areas</h2>
          <p>{business.serviceAreas.join(" • ")}</p>
        </div>
        <div>
          <h2>Hours</h2>
          <dl>
            {Object.entries(business.hours).map(([day, hours]) => (
              <div className="hours-row" key={day}>
                <dt>{day}</dt><dd>{hours}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section>
        <h2>What customers say</h2>
        {business.testimonials.map((testimonial) => (
          <blockquote key={testimonial.author}>
            “{testimonial.quote}” <footer>— {testimonial.author}</footer>
          </blockquote>
        ))}
      </section>

      <section>
        <h2>Frequently asked questions</h2>
        <div className="grid">
          {business.faqs.map((faq) => (
            <article className="card" key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <strong>{business.name}</strong>
        <span>{business.phone}</span>
        <span>{business.email}</span>
        <small>Non-production pilot. Customer production domains are not connected.</small>
      </footer>
    </main>
  );
}
