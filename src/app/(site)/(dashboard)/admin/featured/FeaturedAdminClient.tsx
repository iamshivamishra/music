"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { FeaturedSection } from "@/types";

interface FeaturedEntry {
  _id: string;
  beatId: string;
  beatTitle: string;
  section: FeaturedSection;
  position: number;
  startDate: string;
  endDate: string;
}

interface Props {
  entries: FeaturedEntry[];
}

export default function FeaturedAdminClient({ entries }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Remove this featured beat?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/featured/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Delete failed");
      }
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  const editorPicks = entries.filter((e) => e.section === "editor_picks");
  const featured = entries.filter((e) => e.section === "featured");

  return (
    <div className="space-y-8">
      {/* Editor Picks */}
      <FeaturedTable
        title="Editor&apos;s Picks"
        sectionLabel="editor_picks"
        items={editorPicks}
        deleting={deleting}
        onDelete={handleDelete}
      />

      {/* Featured */}
      <FeaturedTable
        title="Featured"
        sectionLabel="featured"
        items={featured}
        deleting={deleting}
        onDelete={handleDelete}
      />

      {/* Add Form */}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="mb-4"
        >
          <Plus className="mr-1 h-4 w-4" />
          {showForm ? "Cancel" : "Add Featured Beat"}
        </Button>
        {showForm && (
          <AddFeaturedForm
            onSuccess={() => {
              setShowForm(false);
              router.refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}

function FeaturedTable({
  title,
  sectionLabel,
  items,
  deleting,
  onDelete,
}: {
  title: string;
  sectionLabel: string;
  items: FeaturedEntry[];
  deleting: string | null;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No {sectionLabel.replace("_", " ")} configured.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-admin-bg text-left text-admin-muted">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Beat</th>
                <th className="p-3">Beat ID</th>
                <th className="p-3">Start</th>
                <th className="p-3">End</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => {
                const now = new Date();
                const start = new Date(entry.startDate);
                const end = new Date(entry.endDate);
                const isActive = now >= start && now <= end;
                const isExpired = now > end;

                return (
                  <tr key={entry._id} className="border-t border-border/30">
                    <td className="p-3 font-medium">{entry.position}</td>
                    <td className="p-3">{entry.beatTitle}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      {entry.beatId.slice(-8)}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {start.toLocaleDateString()}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {end.toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {isActive ? (
                        <Badge className="bg-success-bg text-success-text">Active</Badge>
                      ) : isExpired ? (
                        <Badge variant="secondary">Expired</Badge>
                      ) : (
                        <Badge variant="outline">Scheduled</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(entry._id)}
                        disabled={deleting === entry._id}
                        className="text-red-500 hover:text-red-600"
                      >
                        {deleting === entry._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddFeaturedForm({ onSuccess }: { onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const body = {
      beatId: form.get("beatId") as string,
      section: form.get("section") as FeaturedSection,
      position: Number(form.get("position")),
      startDate: form.get("startDate") as string,
      endDate: form.get("endDate") as string,
    };

    try {
      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to add");
        return;
      }
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-xl border border-border/50 bg-card/50 p-6">
      <div>
        <label htmlFor="feat-beatId" className="mb-1 block text-sm font-medium">
          Beat ID
        </label>
        <input
          id="feat-beatId"
          name="beatId"
          required
          placeholder="MongoDB ObjectId"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div>
        <label htmlFor="feat-section" className="mb-1 block text-sm font-medium">
          Section
        </label>
        <select
          id="feat-section"
          name="section"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="editor_picks">Editor&apos;s Picks</option>
          <option value="featured">Featured</option>
        </select>
      </div>

      <div>
        <label htmlFor="feat-position" className="mb-1 block text-sm font-medium">
          Position
        </label>
        <input
          id="feat-position"
          name="position"
          type="number"
          min={1}
          max={20}
          defaultValue={1}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="feat-start" className="mb-1 block text-sm font-medium">
            Start Date
          </label>
          <input
            id="feat-start"
            name="startDate"
            type="date"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label htmlFor="feat-end" className="mb-1 block text-sm font-medium">
            End Date
          </label>
          <input
            id="feat-end"
            name="endDate"
            type="date"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Add Featured Beat
      </Button>
    </form>
  );
}
