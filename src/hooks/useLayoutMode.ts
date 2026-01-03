// src/hooks/useLayoutMode.ts
import { useEffect, useMemo, useState, useCallback } from "react";
import { useWindowDimensions } from "react-native";
import { LAYOUT_BREAKPOINT, LAYOUT_PREF_KEY } from "../constants/layout";
import { storage } from "../utils/storage"; 
// Asumo que tu wrapper expone getItem/setItem/removeItem (si no, lo adaptamos en 2 min)

type LayoutMode = "mobile" | "desktop";
type LayoutPreference = LayoutMode | null; // null = auto

export function useLayoutMode() {
  const { width } = useWindowDimensions();

  const [pref, setPref] = useState<LayoutPreference>(null);
  const [loaded, setLoaded] = useState(false);

  // 1) Cargar preferencia al inicio
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const raw = await storage.getItem(LAYOUT_PREF_KEY);
        // Guardamos solo "mobile" o "desktop". Si no existe -> null (auto)
        const parsed = raw === "mobile" || raw === "desktop" ? raw : null;
        if (mounted) setPref(parsed);
      } finally {
        if (mounted) setLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 2) Modo auto por ancho
  const autoMode: LayoutMode = useMemo(() => {
    return width >= LAYOUT_BREAKPOINT ? "desktop" : "mobile";
  }, [width]);

  // 3) Modo efectivo (preferencia si existe; si no, auto)
  const mode: LayoutMode = pref ?? autoMode;

  // 4) Acciones
  const forceMobile = useCallback(async () => {
    setPref("mobile");
    await storage.setItem(LAYOUT_PREF_KEY, "mobile");
  }, []);

  const forceDesktop = useCallback(async () => {
    setPref("desktop");
    await storage.setItem(LAYOUT_PREF_KEY, "desktop");
  }, []);

  const setAuto = useCallback(async () => {
    setPref(null);
    await storage.removeItem(LAYOUT_PREF_KEY);
  }, []);

  return {
    loaded,          // para no “parpadear” al arrancar
    mode,            // "mobile" | "desktop" (efectivo)
    isAuto: pref === null,
    pref,            // null | "mobile" | "desktop"
    forceMobile,
    forceDesktop,
    setAuto,
  };
}
