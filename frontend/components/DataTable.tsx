"use client"

import React from "react"
import { TableRowsSkeleton } from "@/components/ui/skeleton"

import { CoreTableContainer, CoreTableHeader, CoreTableHead, CoreTableBody, CoreTableRow, CoreTableCell } from "@/components/CoreTable"

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
  render?: (row: any) => React.ReactNode
  disabled?: (row: any) => boolean
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  loading?: boolean
  refreshing?: boolean
  error?: string | null
  actions?: Action[]
  emptyMessage?: string
  onRowClick?: (row: any) => void
  rowClassName?: string
  containerClassName?: string
  /** Wide layout: horizontal scroll, roomy cells, no squashing */
  wide?: boolean
}

export default function DataTable({
  columns,
  data,
  loading = false,
  refreshing = false,
  error = null,
  actions = [],
  emptyMessage = "No data found",
  onRowClick,
  rowClassName = "hover:bg-gray-50",
  containerClassName = "",
  wide = false,
}: DataTableProps) {
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
    <CoreTableContainer className={`${wide ? "shadow-sm" : "border-gray-300"} ${containerClassName}`}>
        <CoreTableHeader>
          <tr>
            {columns.map((column) => (
              <CoreTableHead
                key={column.key}
                className={`whitespace-nowrap ${cellPad} ${
                  column.headerClassName || ""
                }`}
                style={{
                  width: column.width,
                  minWidth: column.minWidth || column.width,
                }}
              >
                {column.label}
              </CoreTableHead>
            ))}
            {actions.length > 0 && (
              <CoreTableHead
                className={`whitespace-nowrap ${cellPad}`}
                style={{ minWidth: "8rem" }}
              >
                Actions
              </CoreTableHead>
            )}
          </tr>
        </CoreTableHeader>

        <CoreTableBody className={`${(loading || refreshing) && data.length === 0 ? "" : "animate-content-in"} ${refreshing || (loading && data.length > 0) ? "opacity-50 transition-opacity" : ""}`}>
          {(loading || refreshing) && data.length === 0 ? (
            <TableRowsSkeleton rows={6} columns={columns.length + (actions.length > 0 ? 1 : 0)} />
          ) : data.length === 0 ? (
            <CoreTableRow>
              <CoreTableCell
                colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                className={`text-center text-slate-500 ${cellPad}`}
              >
                {emptyMessage}
              </CoreTableCell>
            </CoreTableRow>
          ) : (
            data.map((row, rowIndex) => (
              <CoreTableRow
                key={row._id || row.accountId || rowIndex}
                className={`${rowClassName} ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <CoreTableCell
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
                  </CoreTableCell>
                ))}
                {actions.length > 0 && (
                  <CoreTableCell className={`align-top ${cellPad}`}>
                    <div className="flex gap-2">
                      {actions.map((action, idx) => {
                        const custom = action.render?.(row)
                        if (custom !== undefined) return custom ? <React.Fragment key={idx}>{custom}</React.Fragment> : null

                        const disabled = action.disabled?.(row) || false
                        return (
                          <button
                            key={idx}
                            disabled={disabled}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!disabled) action.onClick(row)
                            }}
                            className={`px-3 py-1 rounded text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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
                        )
                      })}
                    </div>
                  </CoreTableCell>
                )}
              </CoreTableRow>
            ))
          )}
        </CoreTableBody>
    </CoreTableContainer>
  )
}
