"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Popup } from "@/components/ui/Popup";
import { ClassForm, type ClassEdit } from "../class-form";

export function ClassHeaderClient({
  unitId,
  courses,
  library,
  edit,
}: {
  unitId: string;
  courses: { course_id: string; name: string }[];
  library: { instructor_id: string; name: string }[];
  edit: ClassEdit;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn secondary" onClick={() => setOpen(true)} style={{ alignSelf: "flex-start" }}>
        แก้ไขชั้นเรียน
      </button>
      <Popup open={open} onClose={() => setOpen(false)} title="แก้ไขข้อมูลชั้นเรียน" maxWidth={560}>
        <ClassForm
          unitId={unitId}
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
