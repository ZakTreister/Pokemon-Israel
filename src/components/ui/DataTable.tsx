import NavigableRow from './NavigableRow';
import { sortTableRows } from './tableSorting';
import { useState, type ReactNode } from 'react';

export interface TableColumn<Row> {
  key: string;
  label: string;
  value: (row: Row) => string | number | null | undefined;
  render?: (row: Row) => ReactNode;
}

export default function DataTable<Row>({
  rows,
  columns,
  rowKey,
  defaultSort = 'position',
  headerClassName = 'bg-muted',
  rowLink,
}: {
  rows: Row[];
  columns: TableColumn<Row>[];
  rowKey: (row: Row) => string;
  defaultSort?: string;
  headerClassName?: string;
  rowLink?: (row: Row) => string | undefined;
}) {
  const [sort, setSort] = useState({ key: defaultSort, descending: false });
  const column = columns.find((c) => c.key === sort.key) || columns[0];
  const displayed = sortTableRows(rows, column, sort.descending);
  return (
    <div className="overflow-x-auto border rounded-lg bg-card">
      <table className="w-full text-right">
        <thead className={headerClassName}>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="p-3"
                aria-sort={
                  c.key === sort.key
                    ? sort.descending
                      ? 'descending'
                      : 'ascending'
                    : 'none'
                }
              >
                <button
                  type="button"
                  className="font-bold rounded focus-visible:outline focus-visible:outline-2"
                  onClick={() =>
                    setSort((current) => ({
                      key: c.key,
                      descending:
                        current.key === c.key ? !current.descending : false,
                    }))
                  }
                >
                  {c.label}
                  {c.key === sort.key ? (sort.descending ? ' ↓' : ' ↑') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.map((row) => {
            const cells = columns.map((c) => (
              <td key={c.key} className="p-3">
                {c.render ? c.render(row) : (c.value(row) ?? '—')}
              </td>
            ));
            const to = rowLink?.(row);
            return to ? (
              <NavigableRow key={rowKey(row)} to={to} className="border-t">
                {cells}
              </NavigableRow>
            ) : (
              <tr key={rowKey(row)} className="border-t">
                {cells}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length && (
        <p className="p-6 text-muted-foreground">אין תוצאות להצגה.</p>
      )}
    </div>
  );
}
