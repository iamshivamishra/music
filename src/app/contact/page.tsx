"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
      setForm({
        name: "",
        email: "",
        message: "",
      });
    }, 3000);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.badge}>💬 Get in Touch</div>

        <h1 className={styles.title}>Contact Us</h1>

        <p className={styles.subtitle}>
          Have a question, suggestion, or just want to say hi? We'd love to
          hear from you.
        </p>
      </div>

      <div className={styles.grid}>
        {/* Form */}
        <div className={styles.formCard}>
          {submitted ? (
            <div className={styles.success}>
              <span className={styles.successIcon}>✅</span>

              <h3>Message Sent!</h3>

              <p>
                Thanks for reaching out. We'll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label>Your Name</label>

                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="John Doe"
                />
              </div>

              <div className={styles.field}>
                <label>Email Address</label>

                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                  placeholder="you@example.com"
                />
              </div>

              <div className={styles.field}>
                <label>Message</label>

                <textarea
                  rows={5}
                  required
                  value={form.message}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      message: e.target.value,
                    })
                  }
                  placeholder="Tell us what's on your mind..."
                />
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
              >
                Send Message →
              </button>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.infoCard}>
            <span>📧</span>
            <h3>Email</h3>
            <p>support@trishulbeats.com</p>
          </div>

          <div className={styles.infoCard}>
            <span>📍</span>
            <h3>Location</h3>
            <p>India</p>
          </div>

          <div className={styles.infoCard}>
            <span>⏰</span>
            <h3>Response Time</h3>
            <p>We usually reply within 24 hours</p>
          </div>

          <div className={styles.followCard}>
            <span>🎵</span>
            <h3>Follow Us</h3>
            <p>
              Stay updated with our latest releases on social media.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}