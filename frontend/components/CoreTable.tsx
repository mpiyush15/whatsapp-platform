import React from 'react';

export function CoreTableContainer({ children, className = '' }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`overflow-x-auto border border-gray-200 rounded-lg dark:border-gray-700 ${className}`}>
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  );
}

export function CoreTableHeader({ children, className = '' }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bg-slate-50 border-b border-slate-200 ${className}`}>
      {children}
    </thead>
  );
}

export function CoreTableBody({ children, className = '' }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
      {children}
    </tbody>
  );
}

export function CoreTableRow({ children, className = '', isHeader = false }: React.HTMLAttributes<HTMLTableRowElement> & { isHeader?: boolean }) {
  if (isHeader) {
    return (
      <tr className={`border-b border-slate-200 ${className}`}>
        {children}
      </tr>
    );
  }
  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${className}`}>
      {children}
    </tr>
  );
}

export function CoreTableHead({ children, className = '' }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`px-6 py-3 text-left font-semibold text-slate-600 ${className}`}>
      {children}
    </th>
  );
}

export function CoreTableCell({ children, className = '' }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100 ${className}`}>
      {children}
    </td>
  );
}
