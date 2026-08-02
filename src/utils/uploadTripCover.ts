import { supabase } from "../lib/supabase";

const BUCKET = "documents";
const FOLDER = "trip-covers";

export async function pickAndUploadTripCover(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

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
