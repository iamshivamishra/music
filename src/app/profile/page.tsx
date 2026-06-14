import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Purchase from "@/lib/models/Purchase";
import Song from "@/lib/models/Song";
import { ISong } from "@/types";
import styles from "./page.module.css";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await connectDB();

  const purchases = await Purchase.find({ userId: user.userId })
    .sort({ createdAt: -1 })
    .lean();

  const songIds = purchases.map((p) => p.songId);
  const rawSongs = await Song.find({ _id: { $in: songIds } })
    .select("-audioUrl")
    .lean();

  const songs = JSON.parse(JSON.stringify(rawSongs)) as ISong[];
  const cleanPurchases = JSON.parse(JSON.stringify(purchases));

  const songMap = new Map(songs.map((s) => [s._id.toString(), s]));

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const totalSpent = cleanPurchases.reduce(
    (sum: number, p: { amount: number }) => sum + p.amount,
    0
  );

  return (
    <div className={styles.page}>
      {/* Profile Header */}
      <div className={styles.profileCard}>
        <div className={styles.avatar}>
          {user.email[0].toUpperCase()}
        </div>
        <div className={styles.profileInfo}>
          <h1 className={styles.name}>{user.email.split("@")[0]}</h1>
          <p className={styles.email}>{user.email}</p>
          <span className={styles.roleBadge}>
            {user.role === "admin" ? "👑 Admin" : "🎵 Music Lover"}
          </span>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{purchases.length}</span>
            <span className={styles.statLabel}>Purchased Songs</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>₹{totalSpent}</span>
            <span className={styles.statLabel}>Total Spent</span>
          </div>
        </div>
      </div>

      {/* Admin Quick Links */}
      {user.role === "admin" && (
        <div className={styles.adminSection}>
          <h2 className={styles.sectionTitle}>⚡ Admin Actions</h2>
          <div className={styles.adminLinks}>
            <Link href="/upload" className={styles.adminBtn}>
              🎵 Song Upload
            </Link>
            <Link href="/upload/playlist" className={styles.adminBtn}>
              📁 Create Folder 
            </Link>
            <Link href="/music" className={styles.adminBtn}>
              🎧 Music Library
            </Link>
          </div>
        </div>
      )}

      {/* Purchased Songs */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          🎵 Purchases songs ({purchases.length})
        </h2>

        {purchases.length === 0 ? (
          <div className={styles.empty}>
            <span>🎵</span>
            <p>Haven't bought any songs yet</p>
            <Link href="/music" className={styles.browseBtn}>
              Music Browse  →
            </Link>
          </div>
        ) : (
          <div className={styles.songList}>
            {cleanPurchases.map((purchase: { _id: string; songId: string; amount: number; createdAt: string }) => {
              const song = songMap.get(purchase.songId.toString());
              if (!song) return null;

              return (
                <Link
                  key={purchase._id}
                  href={`/music/${song._id}`}
                  className={styles.songRow}
                >
                  {/* Cover */}
                  <div className={styles.songCover}>
                    {song.coverUrl ? (
                      <Image
                        src={song.coverUrl}
                        alt={song.title}
                        fill
                        style={{ objectFit: "cover" }}
                        sizes="56px"
                      />
                    ) : (
                      <span>🎵</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className={styles.songInfo}>
                    <p className={styles.songTitle}>{song.title}</p>
                    <p className={styles.songArtist}>{song.artist}</p>
                  </div>

                  {/* Meta */}
                  <div className={styles.songMeta}>
                    <span className={styles.duration}>
                      {formatDuration(song.duration)}
                    </span>
                    <span className={styles.paidBadge}>₹{purchase.amount}</span>
                    <span className={styles.unlockedBadge}>✓ Unlocked</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}