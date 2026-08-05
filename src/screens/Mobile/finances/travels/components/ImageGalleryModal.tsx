// src/screens/Mobile/finances/travels/components/ImageGalleryModal.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Image, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Carousel } from "react-native-reanimated-carousel";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

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

function GalleryPage({ image }: { image: GalleryImage }) {
  const [loading, setLoading] = useState(true);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      {loading && <ActivityIndicator color="#94A3B8" style={{ position: "absolute" }} />}
      {Platform.OS === "web" ? (
        <View
          style={{
            width: "100%",
            height: "100%",
            backgroundImage: `url(${image.url})`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: loading ? 0 : 1,
          } as any}
        >
          <Image
            source={{ uri: image.url }}
            style={{ width: 0, height: 0 }}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
        </View>
      ) : (
        <Image
          source={{ uri: image.url }}
          style={{ width: "100%", height: "100%", opacity: loading ? 0 : 1 }}
          resizeMode="contain"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      )}
    </View>
  );
}

export default function ImageGalleryModal({ visible, images, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [busy, setBusy] = useState(false);

  if (!images.length) return null;
  const current = images[Math.max(0, Math.min(images.length - 1, index))];

  const filenameFor = (img: GalleryImage) => img.filename || `imagen-${img.id ?? Date.now()}.jpg`;

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (Platform.OS === "web") {
        const res = await fetch(current.url);
        const blob = await res.blob();
        const file = new File([blob], filenameFor(current), { type: blob.type || "image/jpeg" });
        const nav: any = typeof navigator !== "undefined" ? navigator : null;
        if (nav?.canShare?.({ files: [file] })) {
          await nav.share({ files: [file] });
        } else {
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filenameFor(current);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }
      } else {
        const localUri = (FileSystem as any).cacheDirectory + filenameFor(current);
        await FileSystem.downloadAsync(current.url, localUri);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(localUri);
        }
      }
    } catch {
      // silencioso: si falla, el usuario puede reintentar
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadWeb = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(current.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filenameFor(current);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // silencioso: si falla, el usuario puede reintentar
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 10,
            position: "relative",
          }}
        >
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={26} color="#0F172A" />
          </TouchableOpacity>
          {images.length > 1 && (
            <Text
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                textAlign: "center",
                fontSize: 13,
                fontWeight: "700",
                color: "#94A3B8",
              }}
              pointerEvents="none"
            >
              {index + 1} / {images.length}
            </Text>
          )}
          <View style={{ flexDirection: "row", gap: 6 }}>
            {Platform.OS === "web" && (
              <TouchableOpacity
                onPress={handleDownloadWeb}
                disabled={busy}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ padding: 4, opacity: busy ? 0.5 : 1 }}
              >
                <Ionicons name="download-outline" size={20} color="#475569" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleShare}
              disabled={busy}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ padding: 4, opacity: busy ? 0.5 : 1 }}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#475569" />
              ) : (
                <Ionicons name="share-outline" size={20} color="#475569" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Carousel<GalleryImage>
          key={initialIndex}
          data={images}
          defaultIndex={initialIndex}
          loop={false}
          style={{ flex: 1, width: "100%" }}
          onSnapToItem={setIndex}
          keyExtractor={(img, i) => `${img.id ?? img.url}-${i}`}
          renderItem={({ item }) => <GalleryPage image={item} />}
        />

        {images.length > 1 && (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: 10 }}>
            {images.map((img, i) => (
              <View
                key={img.id ?? `${img.url}-${i}`}
                style={{
                  width: i === index ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === index ? "#0F172A" : "#E2E8F0",
                }}
              />
            ))}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
