import React from "react";
import { View } from "react-native";

type Props = {
  transactions: any[];
  onEditTx: (tx: any) => void;
  onDeleteTx: (tx: any) => void;
};

export default function DesktopTransactionsTable(_: Props) {
  return <View />;
}
