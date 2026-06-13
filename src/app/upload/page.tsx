import UploadForm from "@/components/UploadForm";
import styles from "./page.module.css";

export default function UploadPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>🚀 Song Upload Karo</h1>
        <p className={styles.subtitle}>
          Nayi song Cloudinary pe upload hogi aur library mein dikhegi
        </p>
      </div>
      <div className={styles.formWrapper}>
        <UploadForm />
      </div>
    </div>
  );
}