"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { prepareUnitPhoto } from "@/lib/image/prepare-unit-photo";
import { uploadUnitImage, deleteUnitImage, reorderUnitImages } from "./actions";

type ImageRow = { image_id: string; original_filename: string | null; signedUrl: string | null };
type PendingFile = { id: string; file: File; status: "waiting" | "uploading" | "failed"; error?: string };

const MAX_IMAGES = 6;
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];
// A rejected action call means the request never completed: the network dropped, or this tab is
// still running a build from before the latest deploy.
const REQUEST_FAILED = "เชื่อมต่อระบบไม่สำเร็จ หรือระบบเพิ่งมีการอัปเดต กรุณารีเฟรชหน้านี้แล้วลองใหม่";

export function ImageUploader({ unitId, images }: { unitId: string; images: ImageRow[] }) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Press-and-hold on touch screens, so a normal swipe over the photos still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // The dragged order shows immediately and is dropped as soon as the set of photos changes.
  const orderIsCurrent =
    localOrder?.length === images.length && images.every((img) => localOrder.includes(img.image_id));
  const ordered = orderIsCurrent
    ? localOrder.map((id) => images.find((img) => img.image_id === id)!)
    : images;

  const remaining = MAX_IMAGES - images.length;

  function selectFiles(selected: File[]) {
    setError(null);
    const supported = selected.filter((f) => ACCEPTED_TYPES.includes(f.type));
    const chosen = supported.slice(0, Math.max(remaining, 0));

    const notices: string[] = [];
    if (supported.length < selected.length) notices.push("ข้ามไฟล์ที่ไม่ใช่ JPEG หรือ PNG");
    if (chosen.length < supported.length) notices.push(`เพิ่มได้อีก ${remaining} ภาพ จึงเลือกเฉพาะ ${remaining} ไฟล์แรก`);
    setNotice(notices.join(" · ") || null);

    setPendingFiles(chosen.map((file) => ({ id: crypto.randomUUID(), file, status: "waiting" })));
  }

  // One request per photo, in selection order: each must fit the request size limit on its own, and
  // a failed photo shouldn't take the rest of the batch down with it.
  async function uploadAll() {
    setUploading(true);
    setError(null);
    setNotice(null);

    for (const item of pendingFiles) {
      const update = (patch: Partial<PendingFile>) =>
        setPendingFiles((list) => list.map((p) => (p.id === item.id ? { ...p, ...patch } : p)));
      update({ status: "uploading", error: undefined });

      let prepared: File;
      try {
        prepared = await prepareUnitPhoto(item.file);
      } catch {
        update({ status: "failed", error: "เปิดไฟล์นี้ไม่ได้ หรือไฟล์ใหญ่เกินไป" });
        continue;
      }

      try {
        const formData = new FormData();
        formData.set("unit_id", unitId);
        formData.set("file", prepared);
        const result = await uploadUnitImage(formData);
        if (result.error) update({ status: "failed", error: result.error });
        else setPendingFiles((list) => list.filter((p) => p.id !== item.id));
      } catch {
        update({ status: "failed", error: REQUEST_FAILED });
      }
    }

    setUploading(false);
    setInputKey((k) => k + 1);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = ordered.map((img) => img.image_id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setLocalOrder(next);
    setError(null);
    startTransition(async () => {
      try {
        const result = await reorderUnitImages(unitId, next);
        if (result.error) {
          setLocalOrder(null);
          setError(result.error);
        }
      } catch {
        setLocalOrder(null);
        setError(REQUEST_FAILED);
      }
    });
  }

  function handleDelete(imageId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteUnitImage(unitId, imageId);
      } catch {
        setError(REQUEST_FAILED);
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 480 }}>
      <p className="footnote">
        ภาพหน่วย ({images.length}/{MAX_IMAGES})
        {images.length > 1 && " · ลากภาพเพื่อสลับตำแหน่ง ภาพแรกจะเป็นภาพปกในรายการหน่วยและบนแผนที่"}
      </p>

      <DndContext id="unit-photos" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered.map((img) => img.image_id)} strategy={rectSortingStrategy}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {ordered.map((img, index) => (
              <SortablePhoto key={img.image_id} image={img} isCover={index === 0} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {(remaining > 0 || pendingFiles.length > 0) && (
        <div style={{ display: "grid", gap: 10 }}>
          <input
            key={inputKey}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            disabled={uploading || remaining <= 0}
            className="field"
            aria-label={`เลือกไฟล์ภาพ ได้อีก ${remaining} ภาพ`}
            onChange={(e) => selectFiles(Array.from(e.target.files ?? []))}
          />
          <p className="footnote">เลือกได้หลายไฟล์พร้อมกัน (JPEG หรือ PNG) ระบบจะย่อภาพขนาดใหญ่ให้อัตโนมัติ</p>

          {pendingFiles.length > 0 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4, fontSize: 13 }}>
              {pendingFiles.map((p) => (
                <li key={p.id}>
                  {p.file.name}
                  {p.status === "uploading" && " — กำลังอัปโหลด..."}
                  {p.status === "failed" && <span style={{ color: "#b42318" }}> — {p.error}</span>}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="btn secondary"
            disabled={uploading || pendingFiles.length === 0 || remaining <= 0}
            onClick={uploadAll}
          >
            {uploading
              ? "กำลังอัปโหลด..."
              : pendingFiles.length > 0
                ? `อัปโหลด ${pendingFiles.length} ภาพ`
                : "อัปโหลดภาพ"}
          </button>
        </div>
      )}

      {notice && <p className="notice">{notice}</p>}
      {error && <p className="notice error">{error}</p>}
    </div>
  );
}

function SortablePhoto({
  image,
  isCover,
  onDelete,
}: {
  image: ImageRow;
  isCover: boolean;
  onDelete: (imageId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.image_id,
  });

  return (
    <div
      ref={setNodeRef}
      className="card"
      style={{
        padding: 8,
        display: "grid",
        gap: 6,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`ย้ายตำแหน่งภาพ ${image.original_filename ?? ""}`}
        style={{ position: "relative", width: 120, height: 90, cursor: "grab", touchAction: "manipulation" }}
      >
        {image.signedUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.signedUrl}
            alt={image.original_filename ?? ""}
            width={120}
            height={90}
            draggable={false}
            style={{ objectFit: "cover", borderRadius: 8, userSelect: "none" }}
          />
        )}
        {isCover && (
          <span className="pill done" style={{ position: "absolute", top: 4, left: 4, fontSize: 11 }}>
            ภาพปก
          </span>
        )}
      </div>
      <button
        type="button"
        className="btn danger"
        style={{ padding: "4px 10px", fontSize: 13 }}
        onClick={() => onDelete(image.image_id)}
      >
        ลบ
      </button>
    </div>
  );
}
