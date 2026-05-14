export type PreparedImage = {
  file: File;
  previewUrl: string;
  originalBytes: number;
  compressedBytes: number;
};

export async function prepareImageForExtraction(file: File, maxWidth = 1600, quality = 0.82): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable in this browser.");
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Could not compress image."))), "image/jpeg", quality);
  });
  const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg") || "transaction-image.jpg", { type: "image/jpeg" });
  return {
    file: compressed,
    previewUrl: URL.createObjectURL(compressed),
    originalBytes: file.size,
    compressedBytes: compressed.size
  };
}
