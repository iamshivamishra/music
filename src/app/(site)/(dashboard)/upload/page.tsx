import type { Metadata } from "next";
import UploadForm from "@/features/studio/UploadForm";

export const metadata: Metadata = {
  title: "Upload Beat",
};

export default function UploadPage() {
  return (
    <div className="page-shell max-w-2xl">
      <UploadForm />
    </div>
  );
}
