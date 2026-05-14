import { describe, expect, it, vi } from "vitest";
import { prepareImageForExtraction } from "./imageService";

describe("prepareImageForExtraction", () => {
  it("compresses and returns a preview URL", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 3200, height: 1600 })));
    const toBlob = vi.fn((callback: (blob: Blob) => void) => callback(new Blob(["compressed"], { type: "image/jpeg" })));
    vi.spyOn(document, "createElement").mockReturnValue({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob
    } as unknown as HTMLCanvasElement);
    vi.stubGlobal("URL", { createObjectURL: () => "blob:preview", revokeObjectURL: vi.fn() });

    const result = await prepareImageForExtraction(new File(["original"], "photo.png", { type: "image/png" }));
    expect(result.previewUrl).toBe("blob:preview");
    expect(result.file.type).toBe("image/jpeg");
    expect(toBlob).toHaveBeenCalled();
  });
});
