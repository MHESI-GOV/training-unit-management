"use client";

import { useActionState } from "react";
import { uploadUnitImage, deleteUnitImage, type UploadState } from "./actions";

type ImageRow = { image_id: string; original_filename: string | null; signedUrl: string | null };

const initialState: UploadState = {};

export function ImageUploader({
  unitId,
  images,
  count,
}: {
  unitId: string;
  images: ImageRow[];
  count: number;
}) {
  const [state, formAction, pending] = useActionState(uploadUnitImage, initialState);

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 480 }}>
      <p className="footnote">ภาพหน่วย ({count}/6)</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {images.map((img) => (
          <div key={img.image_id} className="card" style={{ padding: 8, display: "grid", gap: 6 }}>
            {img.signedUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.signedUrl}
                alt={img.original_filename ?? ""}
                width={120}
                height={90}
                style={{ objectFit: "cover", borderRadius: 8 }}
              />
            )}
            <form action={deleteUnitImage.bind(null, unitId, img.image_id)}>
              <button type="submit" className="btn danger" style={{ padding: "4px 10px", fontSize: 13 }}>
                ลบ
              </button>
            </form>
          </div>
        ))}
      </div>

      {count < 6 && (
        <form action={formAction} style={{ display: "grid", gap: 10 }}>
          <input type="hidden" name="unit_id" value={unitId} />
          <input name="file" type="file" accept="image/jpeg,image/png" required className="field" />
          <button type="submit" className="btn secondary" disabled={pending}>
            {pending ? "กำลังอัปโหลด..." : "อัปโหลดภาพ"}
          </button>
        </form>
      )}
      {state.error && <p className="notice error">{state.error}</p>}
    </div>
  );
}
