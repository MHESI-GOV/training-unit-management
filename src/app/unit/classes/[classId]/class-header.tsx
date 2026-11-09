"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Popup } from "@/components/ui/Popup";
import { deleteClass } from "../actions";
import { ClassForm, type ClassEdit } from "../class-form";

export function ClassHeaderClient({
  unitId,
  canEditFiscalYear,
  canDelete,
  classLabel,
  learnerCount,
  backHref,
  courses,
  library,
  edit,
}: {
  unitId: string;
  canEditFiscalYear: boolean;
  canDelete: boolean;
  classLabel: string;
  learnerCount: number;
  backHref: string;
  courses: { course_id: string; name: string }[];
  library: { instructor_id: string; name: string }[];
  edit: ClassEdit;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function runDelete() {
    setDeleteError(null);
    startDelete(async () => {
      const { error } = await deleteClass(unitId, edit.class_id);
      if (error) {
        setDeleteError(error);
        setConfirmDelete(false);
        return;
      }
      router.replace(backHref);
      router.refresh();
    });
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignSelf: "flex-start" }}>
        <button className="btn secondary" onClick={() => setOpen(true)}>
          แก้ไขชั้นเรียน
        </button>
        {canDelete && (
          <button className="btn danger" onClick={() => setConfirmDelete(true)}>
            ลบชั้นเรียน
          </button>
        )}
      </div>
      {deleteError && <p className="notice error" style={{ flexBasis: "100%" }}>{deleteError}</p>}
      <ConfirmDialog
        open={confirmDelete}
        danger
        pending={deleting}
        title="ลบชั้นเรียน"
        confirmLabel="ลบชั้นเรียนนี้"
        message={
          <>
            จะลบ <strong>{classLabel}</strong> ออกถาวร กู้คืนไม่ได้
            {learnerCount > 0 ? (
              <>
                {" "}พร้อมการลงทะเบียนและผลการจบหลักสูตรของ <strong>ผู้เรียน {learnerCount} คน</strong>{" "}
                ผู้เรียนที่ไม่มีชั้นเรียนอื่นจะถูกลบทั้งหมด รวมเลขบัตรประชาชนและผลทดสอบมาตรฐาน
                ส่วนผู้ที่ยังเรียนชั้นอื่นอยู่จะคงข้อมูลไว้
              </>
            ) : null}
          </>
        }
        onCancel={() => setConfirmDelete(false)}
        onConfirm={runDelete}
      />
      <Popup open={open} onClose={() => setOpen(false)} title="แก้ไขข้อมูลชั้นเรียน" maxWidth={560}>
        <ClassForm
          unitId={unitId}
          canEditFiscalYear={canEditFiscalYear}
          courses={courses}
          instructors={library}
          edit={edit}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Popup>
    </>
  );
}
