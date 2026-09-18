import { useMemo } from "react";
import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;

function getGoogleClientId(): string | undefined {
  if (Platform.OS === "ios") return GOOGLE_CLIENT_ID_IOS || GOOGLE_CLIENT_ID_WEB;
  if (Platform.OS === "android") return GOOGLE_CLIENT_ID_ANDROID || GOOGLE_CLIENT_ID_WEB;
  return GOOGLE_CLIENT_ID_WEB;
}

/**
 * Flujo "implicit" de Google (response_type=id_token) vía expo-auth-session.
 * El id_token resultante se verifica en el backend (POST /auth/google).
 */
export function useGoogleAuthRequest() {
  const clientId = getGoogleClientId();
  const redirectUri = useMemo(
    () => AuthSession.makeRedirectUri({ scheme: "finexa" }),
    []
  );

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId ?? "",
      scopes: ["openid", "profile", "email"],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      usePKCE: false, // PKCE no es válido para el flujo implícito (response_type=id_token)
      extraParams: {
        nonce: Math.random().toString(36).slice(2),
      },
    },
    GOOGLE_DISCOVERY
  );

  // En web, el mecanismo de popup + postMessage de expo-auth-session es poco
  // fiable en navegadores móviles (Safari/Chrome iOS suelen navegar la propia
  // pestaña en vez de abrir un popup real, perdiendo el contexto JS que
  // esperaba la respuesta). Por eso en web hacemos una redirección de página
  // completa; la vuelta (id_token en el hash) se procesa en AuthContext al
  // arrancar la app.
  const prompt = async () => {
    if (Platform.OS === "web" && request?.url) {
      window.location.href = request.url;
      return;
    }
    await promptAsync();
  };

  return { request, response, promptAsync: prompt, isConfigured: Boolean(clientId) };
}
