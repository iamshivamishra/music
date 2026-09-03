"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteBeatAction } from "./actions";

export function DeleteBeatButton({ beatId }: { beatId: string }) {
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await deleteBeatAction(formData);
      if (result.error) {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={onSubmit}>
      <input type="hidden" name="beatId" value={beatId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-red-500 hover:underline disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
    </form>
  );
}
