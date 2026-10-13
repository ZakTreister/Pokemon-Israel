import Button from './Button';
export default function Pagination({
  page,
  totalPages,
  total,
  onChange,
  busy = false,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
  busy?: boolean;
}) {
  return (
    <nav
      aria-label="עמודים"
      className="flex flex-wrap items-center justify-center gap-4 py-4"
    >
      <Button
        contextual
        variant="outline"
        disabled={busy || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        הקודם
      </Button>
      <span role="status">
        עמוד {page} מתוך {totalPages} · {total} תוצאות
      </span>
      <Button
        contextual
        variant="outline"
        disabled={busy || page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        הבא
      </Button>
    </nav>
  );
}
