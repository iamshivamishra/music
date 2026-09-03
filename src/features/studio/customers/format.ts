export function formatCustomerDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatSpend(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function licenseLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
