import Link from "next/link";
import Image from "next/image";
import { connectDB } from "@/lib/db";
import Playlist from "@/lib/models/Playlist";
import { IPlaylist } from "@/types";
import styles from "./page.module.css";

async function getPlaylists() {
  await connectDB();
  const playlists = await Playlist.find({}).sort({ createdAt: -1 }).lean();
  return JSON.parse(JSON.stringify(playlists)) as IPlaylist[];
}

export default async function MusicPage() {
  const playlists = await getPlaylists();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>🎵 Music Library</h1>
        <p className={styles.subtitle}>
          {playlists.length} playlists available
        </p>
      </div>

      {playlists.length === 0 ? (
        <div className={styles.empty}>
          <span>🎵</span>
          <p>Abhi koi playlist nahi hai</p>
          <p className={styles.emptyHint}>Admin se playlist banane ko bolo</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {playlists.map((playlist) => (
            <Link
              key={playlist._id}
              href={`/music/playlist/${playlist._id}`}
              className={styles.card}
            >
              <div className={styles.coverWrapper}>
                {playlist.coverUrl ? (
                  <Image
                    src={playlist.coverUrl}
                    alt={playlist.name}
                    fill
                    style={{ objectFit: "cover" }}
                    sizes="200px"
                  />
                ) : (
                  <div className={styles.defaultCover}>📁</div>
                )}
                <div className={styles.playOverlay}>▶</div>
              </div>
              <div className={styles.info}>
                <h3 className={styles.cardTitle}>{playlist.name}</h3>
                {playlist.description && (
                  <p className={styles.cardDesc}>{playlist.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}