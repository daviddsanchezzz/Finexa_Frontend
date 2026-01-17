import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Ionicons } from "@expo/vector-icons";
import DesktopTransactionDetailsModal from "./DesktopTransactionDetailsModal";

type Props = {
  transactions: any[];
  onEditTx: (tx: any) => void;
  onDeleteTx: (tx: any) => void;
};

const UI = {
  bg: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  muted: "#64748B",
  muted2: "#94A3B8",
  hover: "rgba(15,23,42,0.04)",
  active: "rgba(37,99,235,0.10)",
  primary: "#2563EB",
};

function formatEuroSigned(tx: any) {
  const n = Number(tx?.amount) || 0;

  if (tx?.type === "expense") return `-${n.toFixed(2).replace(".", ",")} €`;
  if (tx?.type === "income") return `+${n.toFixed(2).replace(".", ",")} €`;
  return `${n.toFixed(2).replace(".", ",")} €`; // transfer
}

function amountColor(tx: any) {
  if (tx?.type === "expense") return "#DC2626";
  if (tx?.type === "income") return "#16A34A";
  return UI.text;
}

function formatDate(iso?: string) {
  if (!iso) return "—";

  try {
    const d = new Date(iso);

    const parts = new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";

    return `${get("weekday")} ${get("day")} ${get("month")} a las ${get("hour")}:${get("minute")}`;
  } catch {
    return iso;
  }
}

function getNote(tx: any) {
  return (tx?.note ?? tx?.description ?? "").toString();
}

export default function DesktopTransactionsTable({ transactions, onEditTx, onDeleteTx }: Props) {
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  const data = useMemo(() => transactions ?? [], [transactions]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "category",
        header: "Categoría",
        accessorFn: (row) => row?.category?.name ?? (row?.type === "transfer" ? "Transferencia" : "Sin categoría"),
        cell: ({ row }) => {
          const tx = row.original;

          const isTransfer = tx?.type === "transfer";
          const bg = isTransfer ? "rgba(37,99,235,0.10)" : (tx?.category?.color ?? "#F1F5F9");
          const emoji = isTransfer ? "↔️" : (tx?.category?.emoji ?? "💸");

          const label = isTransfer
            ? `${tx?.fromWallet?.name ?? "Origen"} → ${tx?.toWallet?.name ?? "Destino"}`
            : (tx?.category?.name ?? "Sin categoría");

          return (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: bg,
                }}
              >
                <Text style={{ fontSize: 16 }}>{emoji}</Text>
              </View>

              <Text
                style={{
                  color: UI.text,
                  fontSize: 13,
                  fontWeight: "700",
                  maxWidth: 420,
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        },
      },
      {
        id: "subcategory",
        header: "Subcategoría",
        accessorFn: (row) => row?.subcategory?.name ?? "",
        cell: ({ row }) => (
          <Text style={{ color: UI.muted, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
            {row.original?.subcategory?.name ?? "—"}
          </Text>
        ),
      },
      {
        id: "note",
        header: "Nota",
        accessorFn: (row) => getNote(row),
        cell: ({ row }) => {
          const v = getNote(row.original);
          return (
            <Text style={{ color: UI.muted, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
              {v ? v : "—"}
            </Text>
          );
        },
      },
      {
        id: "date",
        header: "Fecha",
        accessorFn: (row) => row?.date ?? "",
        cell: ({ row }) => (
          <Text style={{ color: UI.muted, fontSize: 13, fontWeight: "600" }}>
            {formatDate(row.original?.date)}
          </Text>
        ),
      },
      {
        id: "total",
        header: () => <Text style={{ textAlign: "right", width: "100%" }}>Total</Text>,
        accessorFn: (row) => Number(row?.amount) || 0,
        cell: ({ row }) => (
          <Text
            style={{
              color: amountColor(row.original),
              fontSize: 13,
              fontWeight: "800",
              textAlign: "right",
            }}
          >
            {formatEuroSigned(row.original)}
          </Text>
        ),
        meta: { alignRight: true },
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Anchos “pro”
  const colWidths = {
    category: "34%",
    subcategory: "18%",
    note: "26%",
    date: "12%",
    total: "10%",
  } as const;

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: UI.bg,
        borderWidth: 1,
        borderColor: UI.border,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* HEADER sticky */}
      <View
        style={{
          position: "sticky" as any,
          top: 0,
          zIndex: 10,
          backgroundColor: UI.bg,
          borderBottomWidth: 1,
          borderBottomColor: UI.border,
        }}
      >
        <View style={{ flexDirection: "row", paddingHorizontal: 14, height: 44, alignItems: "center" }}>
          {table.getHeaderGroups().map((hg) =>
            hg.headers.map((header) => {
              const id = header.column.id as keyof typeof colWidths;
              const w = (colWidths as any)[id] ?? "auto";
              const sortable = header.column.getCanSort();

              return (
                <Pressable
                  key={header.id}
                  onPress={sortable ? header.column.getToggleSortingHandler() : undefined}
                  style={{
                    width: w,
                    paddingRight: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: id === "total" ? "flex-end" : "flex-start",
                  }}
                >
                  <Text style={{ color: UI.muted, fontSize: 14, fontWeight: "600" }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </Text>

                  {sortable && (
                    <View style={{ marginLeft: 6 }}>
                      {header.column.getIsSorted() === "asc" ? (
                        <Ionicons name="chevron-up" size={14} color={UI.muted2} />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <Ionicons name="chevron-down" size={14} color={UI.muted2} />
                      ) : (
                        <Ionicons name="swap-vertical" size={14} color="transparent" />
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      </View>

      {/* ROWS */}
      <View>
        {table.getRowModel().rows.length === 0 ? (
          <View style={{ padding: 18 }}>
            <Text style={{ color: UI.muted2, fontWeight: "700" }}>No hay transacciones.</Text>
          </View>
        ) : (
          table.getRowModel().rows.map((row, idx) => {
            const tx = row.original;
            return (
              <Pressable
                key={row.id}
                onPress={() => setSelectedTx(tx)}
                style={(s: any) => ({
                  paddingHorizontal: 14,
                  height: 52,
                  flexDirection: "row",
                  alignItems: "center",
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: UI.border,
                  backgroundColor: s.hovered ? UI.hover : UI.bg,
                })}
              >
                {row.getVisibleCells().map((cell) => {
                  const id = cell.column.id as keyof typeof colWidths;
                  const w = (colWidths as any)[id] ?? "auto";

                  return (
                    <View
                      key={cell.id}
                      style={{
                        width: w,
                        paddingRight: 10,
                        justifyContent: id === "total" ? "flex-end" : "center",
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </View>
                  );
                })}
              </Pressable>
            );
          })
        )}
      </View>

      {/* MODAL: usa tu componente tal cual */}
      <DesktopTransactionDetailsModal
        visible={!!selectedTx}
        tx={selectedTx}
        onClose={() => setSelectedTx(null)}
        onEdit={(tx) => {
          setSelectedTx(null);
          requestAnimationFrame(() => onEditTx(tx));
        }}
        onDelete={(tx) => {
          setSelectedTx(null);
          requestAnimationFrame(() => onDeleteTx(tx));
        }}
      />
    </View>
  );
}
