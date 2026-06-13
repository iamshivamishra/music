"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./LoginForm.module.css";

export default function LoginForm() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login nahi hua");
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Network error, dobara try karo");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome Back👋</h1>

      <p className={styles.subtitle}>
        Plz login your account
      </p>

      <form
        onSubmit={handleSubmit}
        className={styles.form}
      >
        {error && (
          <div className={styles.error}>{error}</div>
        )}

        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
            placeholder="your@email.com"
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value,
              })
            }
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading}
        >
          {loading
            ? "Logging in..."
            : "Login "}
        </button>
      </form>

      <p className={styles.switchLink}>
        Don't have an account?{" "}
        <Link href="/signup">Sign up karo</Link>
      </p>
    </div>
  );
}