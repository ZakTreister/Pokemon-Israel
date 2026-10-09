import type { TableColumn } from './DataTable';
export function sortTableRows<Row>(
  rows: Row[],
  column: TableColumn<Row>,
  descending: boolean,
) {
  return [...rows].sort((a, b) => {
    const left = column.value(a),
      right = column.value(b);
    if (left == null) return right == null ? 0 : 1;
    if (right == null) return -1;
    const order =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), 'he');
    return descending ? -order : order;
  });
}
