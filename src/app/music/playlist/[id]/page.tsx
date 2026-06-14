import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Playlist from "@/lib/models/Playlist";
import Song from "@/lib/models/Song";
import Purchase from "@/lib/models/Purchase";
import MusicCard from "@/components/MusicCard";
import { ISong, IPlaylist } from "@/types";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlaylistPage({ params }: PageProps) {
  const { id } = await params;

  await connectDB();

  const playlist = await Playlist.findById(id).lean() as unknown as IPlaylist;
  if (!playlist) notFound();

  const songs = await Song.find({ playlistId: id })
    .select("-audioUrl")
    .sort({ createdAt: -1 })
    .lean() as unknown as ISong[];

  const cleanSongs = JSON.parse(JSON.stringify(songs));

  const user = await getCurrentUser();
  let purchasedIds: string[] = [];
  if (user) {
    const purchases = await Purchase.find({ userId: user.userId })
      .select("songId")
      .lean();
    purchasedIds = purchases.map((p: { songId: string }) => p.songId.toString());
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>📁 {JSON.parse(JSON.stringify(playlist)).name}</h1>
        {JSON.parse(JSON.stringify(playlist)).description && (
          <p className={styles.subtitle}>
            {JSON.parse(JSON.stringify(playlist)).description}
          </p>
        )}
        <p className={styles.count}>{cleanSongs.length} songs</p>
      </div>

      {cleanSongs.length === 0 ? (
        <div className={styles.empty}>
          <span>🎵</span>
          <p>Is playlist mein abhi koi song nahi hai</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {cleanSongs.map((song: ISong) => (
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