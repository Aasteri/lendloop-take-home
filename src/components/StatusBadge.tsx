export function StatusBadge({
  status,
  until,
}: {
  status: string;
  until?: string | null;
}) {
  const styles: Record<string, string> = {
    available: "bg-moss/10 text-moss",
    on_loan: "bg-clay/10 text-clay",
    pending: "bg-sand-dark text-ink",
    approved: "bg-moss/10 text-moss",
    declined: "bg-clay/15 text-clay",
    cancelled: "bg-sand text-ink/70",
    overdue: "bg-clay text-paper",
  };
  const label =
    status === "on_loan" && until
      ? `On loan until ${until}`
      : status.replace("_", " ");
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] ?? "bg-sand text-ink"}`}>
      {label}
    </span>
  );
}
