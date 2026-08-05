// src/screens/Mobile/finances/travels/components/ImageGalleryModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, Image, ScrollView, useWindowDimensions, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface GalleryImage {
  id?: number;
  url: string;
  filename?: string | null;
}

interface Props {
  visible: boolean;
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageGalleryModal({ visible, images, initialIndex, onClose }: Props) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (!visible) return;
    setIndex(initialIndex);
    // Jump to the tapped photo without animating the scroll into view.
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
    });
  }, [visible, initialIndex, width]);

  if (!images.length) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={26} color="white" />
          </TouchableOpacity>
          {images.length > 1 && (
            <Text style={{ fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.75)" }}>
              {index + 1} / {images.length}
            </Text>
          )}
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const next = Math.round(e.nativeEvent.contentOffset.x / width);
            setIndex(Math.max(0, Math.min(images.length - 1, next)));
          }}
        >
          {images.map((img, i) => (
            <View
              key={img.id ?? `${img.url}-${i}`}
              style={{ width, flex: 1, alignItems: "center", justifyContent: "center" }}
            >
              {Platform.OS === "web" ? (
                <View
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundImage: `url(${img.url})`,
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  } as any}
                />
              ) : (
                <Image source={{ uri: img.url }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
              )}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
