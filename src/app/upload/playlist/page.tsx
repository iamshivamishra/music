"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePlaylistPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "" });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      if (coverFile) formData.append("cover", coverFile);

      const res = await fetch("/api/playlists", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Playlist nahi bani");
        return;
      }

      setSuccess(`"${form.name}" playlist ban gayi! 🎵`);
      setTimeout(() => router.push("/music"), 2000);
    } catch {
      setError("Kuch problem aayi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "48px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "8px" }}>
        📁 Naya Folder Banao
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "32px" }}>
        Songs organize karne ke liye playlist/folder banao
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {error && (
          <div style={{ background: "rgba(224,84,84,0.15)", border: "1px solid rgba(224,84,84,0.4)", color: "#e05454", padding: "12px", borderRadius: "10px" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "rgba(76,175,118,0.15)", border: "1px solid rgba(76,175,118,0.4)", color: "var(--success)", padding: "12px", borderRadius: "10px" }}>
            {success}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: "500" }}>
            Folder ka Naam *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jaise: Bollywood, Punjabi, Lo-fi..."
            required
            style={{ padding: "11px 14px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text)", fontSize: "0.95rem", outline: "none" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: "500" }}>
            Description (optional)
          </label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Is folder ke baare mein..."
            style={{ padding: "11px 14px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text)", fontSize: "0.95rem", outline: "none" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: "500" }}>
            Cover Image
          </label>
          <div
            onClick={() => document.getElementById("coverInput")?.click()}
            style={{ border: "2px dashed var(--border)", borderRadius: "12px", padding: "28px", cursor: "pointer", textAlign: "center", color: "var(--muted)" }}
          >
            {coverFile ? `🖼️ ${coverFile.name}` : "📁 Cover image select karo (optional)"}
          </div>
          <input
            id="coverInput"
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "14px", borderRadius: "12px", background: "var(--primary)", color: "white", fontSize: "1rem", fontWeight: "600", border: "none", cursor: "pointer", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Ban raha hai..." : "Folder Banao 📁"}
        </button>
      </form>
    </div>
  );
}