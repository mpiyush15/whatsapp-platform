"use client"

import React from "react"

interface Column {
  key: string
  label: React.ReactNode
  render?: (value: any, row: any) => React.ReactNode
  width?: string
  minWidth?: string
  className?: string
  headerClassName?: string
}

interface Action {
  label: string
  onClick: (row: any) => void
  variant?: "primary" | "danger" | "secondary"
  icon?: React.ReactNode
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  loading?: boolean
  error?: string | null
  actions?: Action[]
  emptyMessage?: string
  onRowClick?: (row: any) => void
  rowClassName?: string
  /** Wide layout: horizontal scroll, roomy cells, no squashing */
  wide?: boolean
}

export default function DataTable({
  columns,
  data,
  loading = false,
  error = null,
  actions = [],
  emptyMessage = "No data found",
  onRowClick,
  rowClassName = "hover:bg-gray-50",
  wide = false,
}: DataTableProps) {
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-green-600" />
        <p className="mt-3 text-slate-600">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center">
        <p className="text-red-700 font-medium">❌ Error: {error}</p>
      </div>
    )
  }

  const cellPad = wide ? "px-4 py-3.5" : "p-3"
  const textSize = wide ? "text-sm" : "text-sm"

  return (
    <div
      className={`overflow-x-auto rounded-lg border border-slate-200 ${
        wide ? "shadow-sm" : "border-gray-300"
      }`}
    >
      <table className={`w-max min-w-full border-collapse ${textSize}`}>
        <thead className={wide ? "bg-slate-50" : "bg-gray-100"}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`border-b border-slate-200 text-left font-semibold text-slate-700 whitespace-nowrap ${cellPad} ${
                  column.headerClassName || ""
                }`}
                style={{
                  width: column.width,
                  minWidth: column.minWidth || column.width,
                }}
              >
                {column.label}
              </th>
            ))}
            {actions.length > 0 && (
              <th
                className={`border-b border-slate-200 text-left font-semibold text-slate-700 whitespace-nowrap ${cellPad}`}
                style={{ minWidth: "8rem" }}
              >
                Actions
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                className={`border-b border-slate-100 text-center text-slate-500 ${cellPad}`}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row._id || row.accountId || rowIndex}
                className={`border-b border-slate-100 ${rowClassName} ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={`${rowIndex}-${column.key}`}
                    className={`border-b border-slate-100 text-slate-900 align-top ${cellPad} ${
                      column.className || ""
                    }`}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth || column.width,
                    }}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key] ?? "—"}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className={`border-b border-slate-100 align-top ${cellPad}`}>
                    <div className="flex gap-2">
                      {actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation()
                            action.onClick(row)
                          }}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                            action.variant === "danger"
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : action.variant === "primary"
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {action.icon ? (
                            <span className="flex items-center gap-1">
                              {action.icon}
                              {action.label}
                            </span>
                          ) : (
                            action.label
                          )}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
