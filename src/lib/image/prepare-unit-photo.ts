// Browser-only. Phone and camera photos are routinely 3-10MB, far over what a request to a Vercel
// function can carry (4.5MB), so large photos are downscaled here before upload. Re-encoding also
// drops EXIF, including GPS. Files already small enough are sent untouched.
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

const KEEP_AS_IS_BYTES = 1.5 * 1024 * 1024;
const MAX_DIMENSION = 2048;
const JPEG_QUALITIES = [0.85, 0.7, 0.5];

export async function prepareUnitPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (file.size <= KEEP_AS_IS_BYTES && longest <= MAX_DIMENSION) return file;

    const scale = Math.min(1, MAX_DIMENSION / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    // JPEG has no alpha: without this a transparent PNG background turns black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of JPEG_QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], name, { type: "image/jpeg" });
      }
    }
    throw new Error("still too large after compression");
  } finally {
    bitmap.close();
  }
}
