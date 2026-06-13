import { notFound } from "next/navigation";
import Image from "next/image";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Song from "@/lib/models/Song";
import Purchase from "@/lib/models/Purchase";
import { ISong } from "@/types";
import SongClient from "./SongClient";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSongData(id: string) {
  await connectDB();
  const song = await Song.findById(id).lean() as unknown as ISong & { audioUrl: string };
  return song;
}

export default async function SongPage({ params }: PageProps) {
  const { id } = await params;

  let song;
  try {
    song = await getSongData(id);
  } catch {
    notFound();
  }

  if (!song) notFound();

  const user = await getCurrentUser();
  let hasPurchased = false;

  if (user) {
    await connectDB();
    const purchase = await Purchase.findOne({ userId: user.userId, songId: id });
    hasPurchased = !!purchase;
  }

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Cover */}
        <div className={styles.coverSection}>
          <div className={styles.cover}>
            {song.coverUrl ? (
              <Image
                src={song.coverUrl}
                alt={song.title}
                fill
                style={{ objectFit: "cover" }}
                priority
              />
            ) : (
              <div className={styles.defaultCover}>🎵</div>
            )}
          </div>
        </div>

        {/* Info + Player */}
        <div className={styles.infoSection}>
          <div className={styles.meta}>
            {song.genre && <span className={styles.genre}>{song.genre}</span>}
            {hasPurchased && (
              <span className={styles.purchasedTag}>✓ Purchased</span>
            )}
          </div>

          <h1 className={styles.title}>{song.title}</h1>
          <p className={styles.artist}>{song.artist}</p>
          {song.album && <p className={styles.album}>Album: {song.album}</p>}

          <div className={styles.details}>
            <span>⏱ {formatDuration(song.duration)}</span>
            {!hasPurchased && <span className={styles.price}>₹{song.price}</span>}
          </div>

          {/* Client component handles player + payment */}
          <SongClient
            songId={id}
            songTitle={song.title}
            price={song.price}
            audioUrl={song.audioUrl}
            hasPurchased={hasPurchased}
            isLoggedIn={!!user}
          />
        </div>
      </div>
    </div>
  );
}