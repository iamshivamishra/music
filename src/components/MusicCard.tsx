'use client';
import Link from "next/link";
import Image from "next/image";
import { ISong } from "@/types";

interface MusicCardProps {
  song: ISong;
  isPurchased?: boolean;
}

export default function MusicCard({
  song,
  isPurchased = false,
}: MusicCardProps) {
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <Link href={`/music/${song._id}`} className="card">
        <div className="coverWrapper">
          {song.coverUrl ? (
            <Image
              src={song.coverUrl}
              alt={song.title}
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 100vw, 200px"
            />
          ) : (
            <div className="defaultCover">🎵</div>
          )}

          {isPurchased && (
            <div className="purchasedBadge">✓ Purchased</div>
          )}

          <div className="playOverlay">▶</div>
        </div>

        <div className="info">
          <h3 className="title">{song.title}</h3>

          <p className="artist">{song.artist}</p>

          {song.genre && <span className="genre">{song.genre}</span>}

          <div className="meta">
            <span>{formatDuration(song.duration)}</span>

            {!isPurchased && (
              <span className="price">₹{song.price}</span>
            )}
          </div>
        </div>
      </Link>

      <style jsx>{`
        .card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          transition: transform 0.2s, border-color 0.2s;
          display: block;
          text-decoration: none;
        }

        .card:hover {
          transform: translateY(-4px);
          border-color: rgba(124, 92, 252, 0.4);
        }

        .coverWrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          background: var(--bg3);
          overflow: hidden;
        }

        .defaultCover {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          background: linear-gradient(135deg, #1a1a24, #2a2040);
        }

        .purchasedBadge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: var(--success);
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 20px;
          z-index: 1;
        }

        .playOverlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          opacity: 0;
          transition: opacity 0.2s;
          color: white;
        }

        .card:hover .playOverlay {
          opacity: 1;
        }

        .info {
          padding: 14px;
        }

        .title {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .artist {
          font-size: 0.85rem;
          color: var(--muted);
          margin-bottom: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .genre {
          font-size: 0.75rem;
          background: var(--primary-light);
          color: var(--primary);
          padding: 2px 8px;
          border-radius: 20px;
          display: inline-block;
          margin-bottom: 8px;
        }

        .meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          color: var(--muted);
        }

        .price {
          color: var(--primary);
          font-weight: 600;
        }
      `}</style>
    </>
  );
}