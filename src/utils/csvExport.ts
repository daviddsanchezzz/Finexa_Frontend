import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform, Alert } from "react-native";

interface Transaction {
  date: string;
  type: string;
  amount: number;
  description?: string | null;
  category?: { name: string } | null;
  subcategory?: { name: string } | null;
}

function escapeCsv(val: string | number | null | undefined): string {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(transactions: Transaction[]): string {
  const rows: string[] = [
    ["Fecha", "Tipo", "Importe (€)", "Descripción", "Categoría", "Subcategoría"].join(","),
  ];

  for (const tx of transactions) {
    const date = new Date(tx.date).toLocaleDateString("es-ES");
    const type = tx.type === "income" ? "Ingreso" : tx.type === "expense" ? "Gasto" : "Transferencia";
    const amount = tx.amount.toFixed(2).replace(".", ",");
    const desc = tx.description?.trim() || "";
    const cat = tx.category?.name || "";
    const sub = tx.subcategory?.name || "";
    rows.push([date, type, amount, desc, cat, sub].map(escapeCsv).join(","));
  }

  return rows.join("\r\n");
}

export async function exportTransactionsCsv(
  transactions: Transaction[],
  fileName = "spendly_transacciones"
): Promise<void> {
  if (Platform.OS === "web") {
    const csv = buildCsv(transactions);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  try {
    const csv = buildCsv(transactions);
    const uri = `${FileSystem.cacheDirectory}${fileName}.csv`;
    await FileSystem.writeAsStringAsync(uri, "﻿" + csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("No disponible", "Tu dispositivo no puede compartir archivos.");
      return;
    }
    await Sharing.shareAsync(uri, {
      mimeType: "text/csv",
      dialogTitle: "Exportar transacciones CSV",
    });
  } catch (e: any) {
    Alert.alert("Error al exportar", e?.message || "No se pudo generar el CSV");
  }
}
