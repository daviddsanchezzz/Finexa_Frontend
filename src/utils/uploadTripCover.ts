import { supabase } from "../lib/supabase";

const BUCKET = "documents";

function pickAndUploadImage(folder: string): Promise<string | null> {
  return new Promise((resolve) => {
    // iOS Safari can fail to fire `change` (or even open the picker reliably)
    // on an <input> that isn't attached to the document — unlike desktop
    // browsers, which mostly tolerate a detached input. Mount it off-screen
    // instead of leaving it detached.
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.position = "fixed";
    input.style.top = "-1000px";
    input.style.left = "-1000px";
    input.style.opacity = "0";
    document.body.appendChild(input);

    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onWindowFocus);
      if (input.parentNode) input.parentNode.removeChild(input);
      resolve(value);
    };

    // Fallback for browsers that fire neither `change` nor `cancel` when the
    // picker is dismissed without a file (some iOS Safari versions): the
    // window regains focus as soon as the native picker closes, so give
    // `change` a moment to win the race, then resolve(null) if it hasn't.
    const onWindowFocus = () => {
      setTimeout(() => {
        if (!settled && !input.files?.length) finish(null);
      }, 500);
    };
    window.addEventListener("focus", onWindowFocus);

    input.oncancel = () => finish(null);

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { finish(null); return; }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

      if (error) { console.error("Upload error:", error.message); finish(null); return; }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      finish(data.publicUrl);
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

export function pickAndUploadWonderPhoto(): Promise<string | null> {
  return pickAndUploadImage("wonder-photos");
}
