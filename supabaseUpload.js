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

    console.log("[Supabase] Delete called with URL:", photoUrl);

    // Extract path from Supabase public URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/photos/[path]
    // The path may contain /photos/ again, so we need to get everything after the first /photos/
    const photosIndex = photoUrl.indexOf('/photos/');
    if (photosIndex === -1) {
      console.error("[Supabase] Could not find /photos/ in URL:", photoUrl);
      throw new Error("Invalid Supabase photo URL format");
    }

    // Get everything after the first '/photos/' and remove query parameters/fragments
    let path = photoUrl.substring(photosIndex + '/photos/'.length);
    path = path.split('?')[0].split('#')[0];
    
    // Decode URL encoding if present
    try {
      path = decodeURIComponent(path);
    } catch (e) {
      // If decoding fails, use original path
      console.warn("[Supabase] Could not decode path, using as-is:", path);
    }

    console.log("[Supabase] Delete start - extracted path:", path);

    const { error } = await client
      .storage
      .from("photos")
      .remove([path]);

    if (error) {
      console.error("[Supabase] Delete error:", error);
      console.error("[Supabase] Delete error details:", {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error
      });
      throw error;
    }

    console.log("[Supabase] Delete success:", path);
  }

  // Expose globally
  window.TT = window.TT || {};
  window.TT.uploadPhotoToSupabase = uploadPhotoToSupabase;
  window.TT.deletePhotoFromSupabase = deletePhotoFromSupabase;
})();
