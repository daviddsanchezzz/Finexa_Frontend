// src/navigation/PinnedModuleTabScreen.tsx
import React from "react";
import { usePinnedFinanceModule } from "../hooks/usePinnedFinanceModule";
import { getPinnedModuleScreen } from "./pinnedModuleRegistry";

// Wrapper delgado: el 4º tab siempre es esta misma ruta ("PinnedModule"),
// pero renderiza la screen real del módulo que el usuario eligió en Ajustes.
export default function PinnedModuleTabScreen(props: any) {
  const { pinnedKey } = usePinnedFinanceModule();
  const ScreenComponent = getPinnedModuleScreen(pinnedKey);
  return <ScreenComponent {...props} />;
}
