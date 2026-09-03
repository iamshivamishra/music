"use client";

import type { OrderStatus } from "@/types";

interface TransactionsClientProps {
  data: unknown;
  currentPage: number;
  statusFilter?: OrderStatus;
}

export default function TransactionsClient({ data, currentPage, statusFilter }: TransactionsClientProps) {
  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Transactions</h1>
        <p className="page-subtitle">Your order history. Full UI coming soon.</p>
      </div>
    </div>
  );
}
