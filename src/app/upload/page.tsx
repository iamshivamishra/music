import type { Metadata } from "next";
import UploadForm from "@/components/UploadForm";

export const metadata: Metadata = {
  title: "Upload Beat",
};

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <UploadForm />
    </div>
  );
}
