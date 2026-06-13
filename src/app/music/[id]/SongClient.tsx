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

  // Preview ke liye: audioUrl jo server ne diya
  // Purchased nahi hai to hum sirf URL use karenge but 10 sec limit lagegi
  // Note: Ideally Cloudinary pe preview clip alag honi chahiye
  // Yahan hum same URL se 10 sec limit client side pe lagaate hain

  return (
    <div className={styles.wrapper}>
      {audioUrl || !hasPurchased ? (
        <>
          {/* Preview ke liye temporary: same URL, 10s limit AudioPlayer mein handle hogi */}
          {/* Production mein alag preview URL hona chahiye */}
          <div className={styles.playerNote}>
            {hasPurchased
              ? "🎵 Pura song sunne ke liye enjoy karo!"
              : "🔓 Pehle 10 seconds free mein suno"}
          </div>

          <AudioPlayer
            audioUrl={audioUrl}
            hasPurchased={hasPurchased}
            songId={songId}
            onBuyClick={() => setShowPayment(true)}
          />
        </>
      ) : null}

      {/* Payment Section */}
      {!hasPurchased && (
        <div className={styles.paySection}>
          {isLoggedIn ? (
            <>
              {(showPayment || !audioUrl) && (
                <div className={styles.buyBox}>
                  <p className={styles.buyTitle}>Puri song unlock karo</p>
                  <p className={styles.buyDesc}>
                    Sirf ₹{price} mein hamesha ke liye access pao
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
                  🔓 ₹{price} mein puri song unlock karo
                </button>
              )}
            </>
          ) : (
            <div className={styles.loginPrompt}>
              <p>Song kharidne ke liye pehle login karo</p>
              <Link href="/login" className={styles.loginBtn}>
                Login Karo
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}