// Caché en memoria (a nivel de módulo) de los datos de NetWorthScreen, para
// que volver a esa pantalla no vuelva a pedir /wallets, /investments/summary
// y /debts si nada ha cambiado desde la última carga (ver
// utils/transactionsInvalidation.ts para el versionado). Vive fuera del
// componente para sobrevivir a que la pantalla se desmonte al navegar.
//
// Al ser un módulo compartido por todo el proceso de JS, hay que vaciarlo
// explícitamente en el logout — si no, un segundo usuario que inicie sesión
// en el mismo dispositivo sin reiniciar la app vería, aunque sea un
// instante, los datos financieros del usuario anterior.
let cachedData: unknown = null;
let cachedAtVersion = -1;

export function getNetWorthCache<T>(): { data: T | null; version: number } {
  return { data: cachedData as T | null, version: cachedAtVersion };
}

export function setNetWorthCache<T>(data: T, version: number) {
  cachedData = data;
  cachedAtVersion = version;
}

export function clearNetWorthCache() {
  cachedData = null;
  cachedAtVersion = -1;
}
