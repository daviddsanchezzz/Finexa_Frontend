// src/screens/Mobile/finances/travels/components/ImageGalleryModal.tsx
import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, Image, FlatList, useWindowDimensions, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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

function GalleryPage({ image, width }: { image: GalleryImage; width: number }) {
  return (
    <View style={{ width, height: "100%", alignItems: "center", justifyContent: "center" }}>
      {Platform.OS === "web" ? (
        <View
          style={{
            width: "100%",
            height: "100%",
            backgroundImage: `url(${image.url})`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          } as any}
        />
      ) : (
        <Image source={{ uri: image.url }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
      )}
    </View>
  );
}

export default function ImageGalleryModal({ visible, images, initialIndex, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<GalleryImage>>(null);
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

        {width > 0 && (
          <FlatList
            ref={listRef}
            data={images}
            keyExtractor={(img, i) => `${img.id ?? img.url}-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item }) => <GalleryPage image={item} width={width} />}
            onScroll={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / width);
              setIndex((prev) => (prev === next ? prev : Math.max(0, Math.min(images.length - 1, next))));
            }}
            scrollEventThrottle={32}
            style={{ flex: 1 }}
          />
        )}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 28,
            paddingVertical: 16,
            paddingBottom: 24,
          }}
        >
          {Platform.OS === "web" && (
            <TouchableOpacity
              onPress={handleDownloadWeb}
              disabled={busy}
              style={{ alignItems: "center", gap: 4, opacity: busy ? 0.5 : 1 }}
            >
              <Ionicons name="download-outline" size={24} color="white" />
              <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>Descargar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleShare}
            disabled={busy}
            style={{ alignItems: "center", gap: 4, opacity: busy ? 0.5 : 1 }}
          >
            {busy ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="share-outline" size={24} color="white" />
            )}
            <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>Compartir</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
