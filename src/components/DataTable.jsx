import React from "react";
import { Loader2, Pencil, Trash2, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DataTable({
  columns,
  data,
  loading,
  onEdit,
  onDelete,
  page = 1,
  totalPages = 1,
  onPageChange,
  renderCell,
}) {
  if (loading) {
    return (
      <div className="glass-card rounded-xl p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center">
        <Inbox className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No records found</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id || i}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-foreground/90 whitespace-nowrap">
                    {renderCell ? renderCell(col.key, row[col.key], row) : String(row[col.key] ?? "—")}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(row)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
