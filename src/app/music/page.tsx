import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Song from "@/lib/models/Song";
import Purchase from "@/lib/models/Purchase";
import MusicCard from "@/components/MusicCard";
import { ISong } from "@/types";
import styles from "./page.module.css";

async function getSongsAndPurchases() {
  await connectDB();
  const songs = await Song.find({})
  .select("-audioUrl")
  .sort({ createdAt: -1 })
  .lean();
return JSON.parse(JSON.stringify(songs)) as ISong[];
}

export default async function MusicPage() {
  const [songs, user] = await Promise.all([
    getSongsAndPurchases(),
    getCurrentUser(),
  ]);

  let purchasedIds: string[] = [];
  if (user) {
    await connectDB();
    const purchases = await Purchase.find({ userId: user.userId }).select("songId").lean();
    purchasedIds = purchases.map((p: { songId: string }) => p.songId.toString());
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>🎵 Music Library</h1>
        <p className={styles.subtitle}>
          {songs.length} songs available · Preview sunna free hai
        </p>
      </div>

      {songs.length === 0 ? (
        <div className={styles.empty}>
          <span>🎵</span>
          <p>Abhi koi song nahi hai</p>
          <p className={styles.emptyHint}>Admin se upload karne ko bolo</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {songs.map((song) => (
            <MusicCard
              key={song._id}
              song={song}
              isPurchased={purchasedIds.includes(song._id.toString())}
            />
          ))}
        </div>
      )}
    </div>
  );
}