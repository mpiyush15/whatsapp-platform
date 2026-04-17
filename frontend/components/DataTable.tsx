"use client"

import React from "react"

interface Column {
  key: string
  label: string
  render?: (value: any, row: any) => React.ReactNode
  width?: string
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
}

export default function DataTable({
  columns,
  data,
  loading = false,
  error = null,
  actions = [],
  emptyMessage = "No data found",
  onRowClick,
  rowClassName = "hover:bg-gray-50"
}: DataTableProps) {
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
        </div>
        <p className="text-gray-600 mt-3">Loading...</p>
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

  return (
    <div className="overflow-x-auto border border-gray-300 rounded-lg">
      <table className="w-full border-collapse">
        {/* Header */}
        <thead className="bg-gray-100">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="border border-gray-300 p-3 text-left font-semibold text-gray-900"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
            {actions.length > 0 && (
              <th className="border border-gray-300 p-3 text-left font-semibold text-gray-900 w-32">
                Actions
              </th>
            )}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                className="border border-gray-300 p-6 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row._id || rowIndex}
                className={`border-b border-gray-300 ${rowClassName} ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={`${rowIndex}-${column.key}`}
                    className="border border-gray-300 p-3 text-sm text-gray-900"
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key] || "—"}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="border border-gray-300 p-3">
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
