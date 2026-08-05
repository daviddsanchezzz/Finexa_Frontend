import { createNavigationContainerRef } from "@react-navigation/native";

// Permite navegar desde componentes montados fuera del árbol de pantallas
// (p.ej. la burbuja/modal de "viaje en curso" en la raíz de App.tsx), donde
// el hook useNavigation() no tiene contexto disponible.
export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: object) {
  if (navigationRef.isReady()) {
    (navigationRef.navigate as (name: string, params?: object) => void)(name, params);
  }
}
