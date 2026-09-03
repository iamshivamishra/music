"use client";

interface StudioPacksClientProps {
  packs: unknown[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  currentStatus: string;
}

export default function StudioPacksClient({ packs, pagination, currentStatus }: StudioPacksClientProps) {
  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Beat Packs</h1>
        <p className="page-subtitle">Manage your beat packs. This feature is coming soon.</p>
      </div>
      <p className="text-muted-foreground">
        {pagination.total} pack{pagination.total !== 1 ? "s" : ""} found
        {currentStatus !== "all" ? ` (${currentStatus})` : ""}.
      </p>
    </div>
  );
}
