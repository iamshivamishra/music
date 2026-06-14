"use client";

import { useState } from "react";
import Link from "next/link";
import AudioPlayer from "@/components/AudioPlayer";
import RazorpayButton from "@/components/RazorpayButton";
import styles from "./page.module.css";

interface SongClientProps {
  songId: string;
  songTitle: string;
  price: number;
  audioUrl: string | null;
  hasPurchased: boolean;
  isLoggedIn: boolean;
}

export default function SongClient({
  songId,
  songTitle,
  price,
  audioUrl,
  hasPurchased,
  isLoggedIn,
}: SongClientProps) {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className={styles.wrapper}>
      {audioUrl || !hasPurchased ? (
        <>
          <div className={styles.playerNote}>
            {hasPurchased
              ? "🎵 Enjoy listening to the full song!"
              : "🔓 Listen to the first 30 seconds for free"}
          </div>

          {/* Premium Player Card */}
          <div className={styles.playerSection}>
            <AudioPlayer
              audioUrl={audioUrl}
              hasPurchased={hasPurchased}
              songId={songId}
              onBuyClick={() => setShowPayment(true)}
            />
          </div>
        </>
      ) : null}

      {/* Payment Section */}
      {!hasPurchased && (
        <div className={styles.paySection}>
          {isLoggedIn ? (
            <>
              {(showPayment || !audioUrl) && (
                <div className={styles.buyBox}>
                  <p className={styles.buyTitle}>Unlock full song</p>

                  <p className={styles.buyDesc}>
                    Unlock this song for only ₹{price}
                  </p>

                  <RazorpayButton
                    songId={songId}
                    songTitle={songTitle}
                    price={price}
                  />
                </div>
              )}

              {!showPayment && audioUrl && (
                <button
                  onClick={() => setShowPayment(true)}
                  className={styles.unlockBtn}
                >
                  🔓 Unlock full song for ₹{price}
                </button>
              )}
            </>
          ) : (
            <div className={styles.loginPrompt}>
              <p>Please log in to purchase this song</p>

              <Link href="/login" className={styles.loginBtn}>
                Log In
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}