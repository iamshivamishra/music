"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./UploadForm.module.css";

export default function UploadForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    artist: "",
    album: "",
    genre: "",
    price: "49",
    playlistId: "",
  });
  const [playlists, setPlaylists] = useState<{ _id: string; name: string }[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState("");

  // Playlists fetch karo
  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => setPlaylists(data.playlists || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) return setError("Audio file select karo");
    if (!form.playlistId) return setError("Playlist/Folder select karo");

    setError("");
    setSuccess("");
    setLoading(true);
    setProgress("Cloudinary pe upload ho raha hai...");

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("artist", form.artist);
      formData.append("album", form.album);
      formData.append("genre", form.genre);
      formData.append("price", form.price);
      formData.append("playlistId", form.playlistId);
      formData.append("audio", audioFile);
      if (coverFile) formData.append("cover", coverFile);

      const res = await fetch("/api/songs/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload fail ho gaya");
        return;
      }

      setSuccess(`"${form.title}" upload ho gaya! 🎵`);
      setForm({ title: "", artist: "", album: "", genre: "", price: "49", playlistId: "" });
      setAudioFile(null);
      setCoverFile(null);
      setProgress("");

      setTimeout(() => router.push("/music"), 2000);
    } catch {
      setError("Upload mein problem aayi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.grid}>
        <div className={styles.field}>
          <label>Song Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Song ka naam"
            required
          />
        </div>

        <div className={styles.field}>
          <label>Artist *</label>
          <input
            type="text"
            value={form.artist}
            onChange={(e) => setForm({ ...form, artist: e.target.value })}
            placeholder="Singer / Band"
            required
          />
        </div>

        <div className={styles.field}>
          <label>Album</label>
          <input
            type="text"
            value={form.album}
            onChange={(e) => setForm({ ...form, album: e.target.value })}
            placeholder="Album name (optional)"
          />
        </div>

        <div className={styles.field}>
          <label>Genre</label>
          <input
            type="text"
            value={form.genre}
            onChange={(e) => setForm({ ...form, genre: e.target.value })}
            placeholder="Bollywood, Pop, Classical..."
          />
        </div>

        <div className={styles.field}>
          <label>Price (₹) *</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            min="1"
            required
          />
        </div>

        {/* Playlist Dropdown */}
        <div className={styles.field}>
          <label>Playlist/Folder *</label>
          <select
            value={form.playlistId}
            onChange={(e) => setForm({ ...form, playlistId: e.target.value })}
            required
          >
            <option value="">-- Folder select karo --</option>
            {playlists.map((p) => (
              <option key={p._id} value={p._id}>
                📁 {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.fileSection}>
        <div className={styles.fileField}>
          <label>Audio File * (MP3, WAV)</label>
          <div
            className={`${styles.dropzone} ${audioFile ? styles.hasFile : ""}`}
            onClick={() => document.getElementById("audioInput")?.click()}
          >
            {audioFile ? (
              <div className={styles.fileInfo}>
                <span>🎵 {audioFile.name}</span>
                <span className={styles.fileSize}>
                  {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            ) : (
              <div className={styles.dropzoneText}>
                <span>🎵</span>
                <span>Audio file drag karo ya click karo</span>
                <span className={styles.hint}>MP3, WAV — max 50MB</span>
              </div>
            )}
          </div>
          <input
            id="audioInput"
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className={styles.fileField}>
          <label>Cover Image (optional)</label>
          <div
            className={`${styles.dropzone} ${coverFile ? styles.hasFile : ""}`}
            onClick={() => document.getElementById("coverInput")?.click()}
          >
            {coverFile ? (
              <div className={styles.fileInfo}>
                <span>🖼️ {coverFile.name}</span>
              </div>
            ) : (
              <div className={styles.dropzoneText}>
                <span>🖼️</span>
                <span>Cover image select karo</span>
                <span className={styles.hint}>JPG, PNG — 1:1 ratio best hai</span>
              </div>
            )}
          </div>
          <input
            id="coverInput"
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      {progress && <p className={styles.progress}>{progress}</p>}

      <button type="submit" className={styles.uploadBtn} disabled={loading}>
        {loading ? "Upload ho raha hai..." : "Song Upload Karo 🚀"}
      </button>
    </form>
  );
}