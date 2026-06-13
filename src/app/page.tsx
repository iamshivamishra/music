import Link from "next/link";
import { connectDB } from "@/lib/db";
import Song from "@/lib/models/Song";
import MusicCard from "@/components/MusicCard";
import { ISong } from "@/types";
import styles from "./page.module.css";

async function getRecentSongs() {
  try {
    await connectDB();
    const songs = await Song.find({})
      .select("-audioUrl")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    return JSON.parse(JSON.stringify(songs)) as ISong[];
  } catch {
    return [];
  }
}

async function getTrendingSongs() {
  try {
    await connectDB();
    const songs = await Song.find({})
      .select("-audioUrl")
      .sort({ plays: -1 })
      .limit(5)
      .lean();
    return JSON.parse(JSON.stringify(songs)) as ISong[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const recentSongs = await getRecentSongs();
  const trendingSongs = await getTrendingSongs();

  return (
    <div className={styles.page}>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>🎵 Music Streaming</div>
          <h1 className={styles.heroTitle}>
            Your favorite
            <br />
            <span className={styles.highlight}>music, listen now</span>
          </h1>
          <p className={styles.heroDesc}>
            Explore thousands of songs. Listen to free previews and purchase your favorites.
          </p>
          <div className={styles.heroBtns}>
            <Link href="/music" className={styles.primaryBtn}>Browse Music →</Link>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.disc}>🎵</div>
          <div className={styles.wave} />
          <div className={styles.wave2} />
        </div>
      </section>

      {/* Stats Bar */}
      <section className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>1K+</span>
          <span className={styles.statLabel}>Songs</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statNumber}>50+</span>
          <span className={styles.statLabel}>Artists</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statNumber}>5+</span>
          <span className={styles.statLabel}>Genres</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statNumber}>Free</span>
          <span className={styles.statLabel}>Previews</span>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.feature}>
          <span className={styles.featureIcon}>🎧</span>
          <h3>Free Previews</h3>
          <p>Listen to previews before you buy. No subscription needed.</p>
        </div>
        <div className={styles.feature}>
          <span className={styles.featureIcon}>🎼</span>
          <h3>All Genres</h3>
          <p>From classical to hip-hop, find music that fits your mood.</p>
        </div>
        <div className={styles.feature}>
          <span className={styles.featureIcon}>⚡</span>
          <h3>Instant Access</h3>
          <p>Stream instantly with no buffering or waiting around.</p>
        </div>
      </section>


      {/* Recent Songs */}
      {recentSongs.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>🆕 Recently Added</h2>
            <Link href="/music" className={styles.seeAll}>See all →</Link>
          </div>
          <div className={styles.songsGrid}>
            {recentSongs.map((song) => (
              <MusicCard key={song._id} song={song} />
            ))}
          </div>
        </section>
      )}

      {/* Genres Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>🎸 Browse by Genre</h2>
          <Link href="/music" className={styles.seeAll}>See all →</Link>
        </div>
        <div className={styles.genreGrid}>
          {[
            { emoji: "🎤", name: "Pop", color: "#ff6b9d" },
            { emoji: "🎸", name: "Rock", color: "#ff9f43" },
            { emoji: "🎹", name: "Classical", color: "#7c5cff" },
            { emoji: "🎷", name: "Jazz", color: "#00d2d3" },
            { emoji: "🔊", name: "Hip-Hop", color: "#ff6b6b" },
            { emoji: "🎻", name: "Indie", color: "#48dbfb" },
          ].map((genre) => (
            <Link
              key={genre.name}
              href={`/music?genre=${genre.name.toLowerCase()}`}
              className={styles.genreCard}
              style={{ "--genre-color": genre.color } as React.CSSProperties}
            >
              <span className={styles.genreEmoji}>{genre.emoji}</span>
              <span className={styles.genreName}>{genre.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonialsSection}>
        <h2 className={styles.howTitle}>💬 What Users Say</h2>
        <div className={styles.testimonialsGrid}>
          {[
            {
              name: "Rahul Sharma",
              avatar: "👨",
              review: "SoundWave is amazing! The free previews help me decide before buying. Best music platform I've used.",
              stars: 5,
              location: "Delhi",
            },
            {
              name: "Priya Patel",
              avatar: "👩",
              review: "Love the variety of genres. Found so many new artists I never knew about. Highly recommended!",
              stars: 5,
              location: "Mumbai",
            },
            {
              name: "Arjun Singh",
              avatar: "🧑",
              review: "Super fast streaming, no buffering at all. The UI is clean and easy to use. Great app!",
              stars: 4,
              location: "Bangalore",
            },
          ].map((t) => (
            <div key={t.name} className={styles.testimonialCard}>
              <div className={styles.testimonialStars}>
                {"★".repeat(t.stars)}{"☆".repeat(5 - t.stars)}
              </div>
              <p className={styles.testimonialReview}>"{t.review}"</p>
              <div className={styles.testimonialUser}>
                <span className={styles.testimonialAvatar}>{t.avatar}</span>
                <div>
                  <span className={styles.testimonialName}>{t.name}</span>
                  <span className={styles.testimonialLocation}>📍 {t.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howSection}>
        <h2 className={styles.howTitle}>How It Works</h2>
        <div className={styles.howGrid}>
          <div className={styles.howStep}>
            <div className={styles.howNum}>1</div>
            <h3>Create Account</h3>
            <p>Sign up for free in seconds. No credit card required.</p>
          </div>
          <div className={styles.howArrow}>→</div>
          <div className={styles.howStep}>
            <div className={styles.howNum}>2</div>
            <h3>Browse Music</h3>
            <p>Explore our huge library of songs across all genres.</p>
          </div>
          <div className={styles.howArrow}>→</div>
          <div className={styles.howStep}>
            <div className={styles.howNum}>3</div>
            <h3>Listen & Enjoy</h3>
            <p>Preview for free or purchase your favorites instantly.</p>
          </div>
        </div>
      </section>

      {/* App Download Banner */}
      

      {/* CTA Banner */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaContent}>
          <h2>Ready to start listening?</h2>
          <p>Join thousands of music lovers on Trishul Beats today.</p>
          <div className={styles.ctaBtns}>
            <Link href="/signup" className={styles.primaryBtn}>Get Started Free →</Link>
            <Link href="/music" className={styles.secondaryBtn}>Browse Music</Link>
          </div>
        </div>
        <div className={styles.ctaEmojis}>🎵🎶🎸🎹🎧</div>
      </section>
      <br />


      <section className={styles.ctaBannerr}>
  <div className={styles.ctaContentt}>
    <h2>You can follow us on</h2>
    {/* SOCIAL ICONS */}
    <div className={styles.socialIcons}>
      
      <a href="https://tr.ee/Vl7AB2D4A4" className={styles.iconBtn} title="Spotify">
        <img src="https://m.media-amazon.com/images/I/51rttY7a+9L._h1_.png" alt="Spotify" />
      </a>

      <a href="#" className={styles.iconBtn} title="YouTube">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/1280px-YouTube_full-color_icon_%282017%29.svg.png" alt="YouTube" />
      </a>

      <a href="#" className={styles.iconBtn} title="Instagram">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/250px-Instagram_logo_2016.svg.png" alt="Instagram" />
      </a>

      <a href="#" className={styles.iconBtn} title="WhatsApp">
        <img src="https://img.magnific.com/premium-vector/whatsapp-app-round-icon-popular-messenger-social-media-logo_277909-873.jpg?semt=ais_hybrid&w=740&q=80" alt="WhatsApp" />
      </a>
    </div>
    <p>Stay connected with Trishul Beats on your favorite platforms.</p>

  </div>
</section>

    </div>
  );
}