/* supabaseUpload.js - plain script (no modules) */

(function () {
  // TODO: paste your real values
  const SUPABASE_URL = "https://zzxnkjssveypcxbguzif.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_z_Sz0xirzaY1y5E6x7wssw_qJdXb2yB";

  if (!window.supabase || !window.supabase.createClient) {
    console.error("[Supabase] CDN not loaded. Check script order in index.html");
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  async function uploadPhotoToSupabase({ blob, path, contentType = "image/jpeg" }) {
    if (!blob) throw new Error("uploadPhotoToSupabase: missing blob");
    if (!path) throw new Error("uploadPhotoToSupabase: missing path");

    const finalPath = path.endsWith(".jpg") ? path : `${path}.jpg`;

    console.log("[Supabase] Upload start:", finalPath, blob?.size, blob?.type);

    const { error } = await client
      .storage
      .from("photos")
      .upload(finalPath, blob, { contentType, upsert: false });

    if (error) {
      console.error("[Supabase] Upload error:", error);
      throw error;
    }

    const { data } = await client.storage.from("photos").getPublicUrl(finalPath);
    if (!data || !data.publicUrl) throw new Error("Supabase: failed to get public URL");

    console.log("[Supabase] Upload success:", data.publicUrl);
    return data.publicUrl;
  }

  async function deletePhotoFromSupabase(photoUrl) {
    if (!photoUrl || typeof photoUrl !== "string") {
      throw new Error("deletePhotoFromSupabase: missing photo URL");
    }

    // Extract path from Supabase public URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/photos/[path]
    const urlParts = photoUrl.split('/photos/');
    if (urlParts.length !== 2) {
      console.warn("[Supabase] Could not extract path from URL:", photoUrl);
      return; // Silently fail if URL format is unexpected
    }

    const path = urlParts[1];
    console.log("[Supabase] Delete start:", path);

    const { error } = await client
      .storage
      .from("photos")
      .remove([path]);

    if (error) {
      console.error("[Supabase] Delete error:", error);
      throw error;
    }

    console.log("[Supabase] Delete success:", path);
  }

  // Expose globally
  window.TT = window.TT || {};
  window.TT.uploadPhotoToSupabase = uploadPhotoToSupabase;
  window.TT.deletePhotoFromSupabase = deletePhotoFromSupabase;
})();
