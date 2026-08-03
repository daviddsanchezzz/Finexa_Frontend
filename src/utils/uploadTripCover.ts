import { supabase } from "../lib/supabase";

const BUCKET = "documents";

function pickAndUploadImage(folder: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

      if (error) { console.error("Upload error:", error.message); resolve(null); return; }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      resolve(data.publicUrl);
    };

    input.click();
  });
}

export function pickAndUploadTripCover(): Promise<string | null> {
  return pickAndUploadImage("trip-covers");
}

export function pickAndUploadAccommodationCover(): Promise<string | null> {
  return pickAndUploadImage("accommodation-covers");
}
