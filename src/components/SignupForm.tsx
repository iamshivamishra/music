"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./SignupForm.module.css";

export default function SignupForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup nahi hua");
        return;
      }

      router.refresh();
      router.push("/music");
    } catch {
      setError("Network error, dobara try karo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Create Account</h1>

      <p className={styles.subtitle}>
        Trishul Beats
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="name">Name</label>

          <input
            id="name"
            type="text"
            placeholder="Enter your name"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            placeholder="at least 6 characters needed"
            minLength={6}
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value,
              })
            }
            required
          />
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading}
        >
          {loading
            ? "Loading..."
            : "Signup"}
        </button>
      </form>

      <p className={styles.switchLink}>
        Already account an Account?{" "}
        <Link href="/login">
          Login 
        </Link>
      </p>
    </div>
  );
}