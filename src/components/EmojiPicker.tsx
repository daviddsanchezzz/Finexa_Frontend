import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";

interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const EMOJIS = [
  "😀","😁","😂","🤣","😅","😊","😍","😘","😎","🤩",
  "😇","🙂","😉","😌","😋","😜","🤪","😏","😴","😷",
  "🤒","🤕","🤢","🤮","🥶","🥵","🥳","😤","😭","😡",
  "💩","👻","🎃","🤖","💡","💰","💳","🛒","🍔","🍕",
  "🍎","🍺","🎁","🏠","🚗","✈️","💼","💊","🛏️","📱",
  "💻","💸","🪙","📈","🎧","🎮","🧾","🎓","❤️","🔥",
];

export default function EmojiPicker({ visible, onClose, onSelect }: EmojiPickerProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/40 justify-end">
          <TouchableWithoutFeedback>
            <View className="bg-white rounded-t-3xl p-5">
              <View className="flex-row justify-between items-center mb-3">
                <TouchableOpacity onPress={onClose}>
                  <Text className="text-[15px] text-gray-500 font-medium">Cancelar</Text>
                </TouchableOpacity>
                <Text className="text-[15px] font-semibold text-text">Seleccionar Emoji</Text>
                <View style={{ width: 65 }} /> 
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap justify-center">
                  {EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => {
                        onSelect(emoji);
                        onClose();
                      }}
                      activeOpacity={0.8}
                      style={{
                        width: 52,
                        height: 52,
                        alignItems: "center",
                        justifyContent: "center",
                        margin: 6,
                        borderRadius: 14,
                        backgroundColor: "#F9FAFB",
                      }}
                    >
                      <Text style={{ fontSize: 26 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
