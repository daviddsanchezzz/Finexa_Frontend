import React from "react";
import { View, Pressable, Alert } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

const DELETE_LIMIT = -180;  // deslizar un poco → mostrar botón
const FULL_DELETE = -320;   // deslizar mucho → borrar

export default function SwipeableRow({ tx, children, onDelete }) {
  const translateX = useSharedValue(0);

  const handleDelete = () => {
    Alert.alert(
      "Eliminar transacción",
      "¿Seguro que quieres eliminarla?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => onDelete(tx),
        },
      ]
    );
  };

  // Gesto estilo WhatsApp: arrastrar sin límite
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = e.translationX; // seguir dedo
      }
    })
    .onEnd(() => {
      // SI DESLIZA MUCHO → borrar modal
      if (translateX.value < FULL_DELETE) {
        runOnJS(handleDelete)();
        translateX.value = withTiming(0);
        return;
      }

      // Mantener botón abierto
      if (translateX.value < DELETE_LIMIT) {
        translateX.value = withTiming(-120);
      } else {
        // volver al inicio
        translateX.value = withTiming(0);
      }
    });

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={{ marginVertical: 3 }}>
      {/* Fondo rojo detrás */}
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 140,
          backgroundColor: "red",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 12,
        }}
      >
        <Pressable onPress={handleDelete}>
          <Ionicons name="trash-outline" size={26} color="#fff" />
        </Pressable>
      </View>

      {/* Tarjeta que se mueve */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ borderRadius: 12 }, rStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
