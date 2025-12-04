import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * Wrapper universal de almacenamiento seguro.
 * - En móvil (Expo Go, Android, iOS): usa SecureStore (seguro)
 * - En web: usa AsyncStorage (o localStorage si prefieres)
 */
export const storage = {
  async setItem(key: string, value: string) {
    try {
      if (Platform.OS === "web") {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error("❌ Error guardando en storage:", error);
    }
  },

  async getItem(key: string) {
    try {
      if (Platform.OS === "web") {
        return await AsyncStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error("❌ Error leyendo de storage:", error);
      return null;
    }
  },

  async removeItem(key: string) {
    try {
      if (Platform.OS === "web") {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error("❌ Error eliminando de storage:", error);
    }
  },
};
