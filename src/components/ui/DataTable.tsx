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
  rowClassName,
  externalSort,
}: {
  rows: Row[];
  columns: TableColumn<Row>[];
  rowKey: (row: Row) => string;
  defaultSort?: string;
  headerClassName?: string;
  rowLink?: (row: Row) => string | undefined;
  rowClassName?: (row: Row) => string;
  // When pagination happens on the server, sorting must happen there too.
  externalSort?: {
    key: string;
    descending: boolean;
    onChange: (key: string, descending: boolean) => void;
  };
}) {
  const [localSort, setLocalSort] = useState({ key: defaultSort, descending: false });
  const sort = externalSort || localSort;
  const column = columns.find(c => c.key === sort.key) || columns[0];
  const displayed = externalSort ? rows : sortTableRows(rows, column, sort.descending);
  const toggleSort = (key: string) => {
    const next = { key, descending: sort.key === key ? !sort.descending : false };
    if (externalSort) externalSort.onChange(next.key, next.descending);
    else setLocalSort(next);
  };
  return (
    <div className="overflow-x-auto border rounded-lg bg-card">
      <table className="w-full text-right">
        <thead className={headerClassName}>
          <tr>
            {columns.map(c => (
              <th
                key={c.key}
                className="p-3"
                aria-sort={c.key === sort.key ? (sort.descending ? 'descending' : 'ascending') : 'none'}
              >
                <button
                  type="button"
                  className="font-bold rounded focus-visible:outline focus-visible:outline-2"
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}
                  {c.key === sort.key ? (sort.descending ? ' ↓' : ' ↑') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.map(row => {
            const cells = columns.map(c => (
              <td key={c.key} className="p-3">
                {c.render ? c.render(row) : (c.value(row) ?? '—')}
              </td>
            ));
            const to = rowLink?.(row);
            const className = `border-t ${rowClassName?.(row) || ''}`;
            return to ? (
              <NavigableRow key={rowKey(row)} to={to} className={className}>
                {cells}
              </NavigableRow>
            ) : (
              <tr key={rowKey(row)} className={className}>
                {cells}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length && <p className="p-6 text-muted-foreground">אין תוצאות להצגה.</p>}
    </div>
  );
}