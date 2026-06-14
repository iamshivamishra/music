import Link from "next/link";
import styles from "./page.module.css";

export default function AboutPage() {
  const stats = [
    { num: "1K+", label: "Songs" },
    { num: "50+", label: "Artists" },
    { num: "5+", label: "Genres" },
    { num: "100%", label: "Free Previews" },
  ];

  const values = [
    {
      icon: "🎧",
      title: "Free Previews",
      desc: "Try before you buy — listen to 30 seconds of any track, completely free.",
    },
    {
      icon: "🤝",
      title: "Fair to Artists",
      desc: "Every purchase directly supports the artist who created the music.",
    },
    {
      icon: "🔓",
      title: "Own What You Buy",
      desc: "No subscriptions. Buy a song once, listen to it forever.",
    },
  ];

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.badge}>🎵 About Us</div>

        <h1 className={styles.title}>
          We're building the future of
          <br />
          <span className={styles.gradientText}>music streaming</span>
        </h1>

        <p className={styles.subtitle}>
          Trishul Beats was created with a simple mission — make great music
          accessible to everyone, while supporting the artists who create it.
        </p>
      </section>

      {/* Stats */}
      <section className={styles.statsGrid}>
        {stats.map((s) => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statNumber}>{s.num}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* Story */}
      <section className={styles.storySection}>
        <div>
          <h2 className={styles.heading}>Our Story</h2>

          <p className={styles.text}>
            Trishul Beats started as a small project with one goal — give music
            lovers a place where they can discover new sounds, listen to
            previews for free, and support independent artists by purchasing
            full tracks directly.
          </p>

          <p className={styles.text}>
            No subscriptions. No ads. Just pay for what you love, and own it
            forever.
          </p>
        </div>

        <div className={styles.storyIconWrapper}>
          <div className={styles.storyIcon}>🎵</div>
        </div>
      </section>

      {/* Values */}
      <section>
        <h2 className={`${styles.heading} ${styles.center}`}>
          What We Stand For
        </h2>

        <div className={styles.valuesGrid}>
          {values.map((v) => (
            <div key={v.title} className={styles.valueCard}>
              <span className={styles.valueIcon}>{v.icon}</span>

              <h3 className={styles.valueTitle}>{v.title}</h3>

              <p className={styles.valueDesc}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to explore?</h2>

        <p className={styles.ctaText}>
          Join Trishul Beats and discover your next favorite song today.
        </p>

        <Link href="/music" className={styles.ctaButton}>
          Browse Music →
        </Link>
      </section>
    </div>
  );
}