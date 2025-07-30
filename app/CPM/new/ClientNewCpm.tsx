"use client";
import { User } from "@/components/CPMForm";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import React, { ChangeEvent, Suspense, useEffect, useState } from "react";
import CPMForm, { CPMFormValues } from "@/components/CPMForm";
import { fetchJson } from "@/lib/fetchJson";
import Swal from "sweetalert2";

export default function NewCpmPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const sanitizeText = (s: string) =>
    s.replace(/[^ก-๙A-Za-z0-9\s\-\/\(\)]/g, "");

  const [header, setHeader] = useState({
    categoryMain: params.get("categoryMain") || "",
    categorySub: params.get("categorySub") || "",
    approverEmail: "",
    approverId: "",
    approverName: "",
    approverDepartment: "",
    approverPosition: "",
    approverKeyword: "",
    signerKeyword: "",
    signerEmail: "",
    signerId: "",
    signerName: "",
    signerPosition: "",
  });
  const [values, setValues] = useState<CPMFormValues>({
    accidentDate: "",
    accidentTime: "",
    location: "",
    cause: "",
    phoneNum: "",
    repairShop: "",
    repairShopLocation: "",
    policeDate: "",
    policeTime: "",
    policeStation: "",
    damageOwnType: "mitrphol",
    damageOtherOwn: "",
    damageDetail: "",
    damageAmount: "",
    victimDetail: "",
    partnerName: "",
    partnerPhone: "",
    partnerLocation: "",
    partnerDamageDetail: "",
    partnerDamageAmount: "",
    partnerVictimDetail: "",
  });
  const [files, setFiles] = useState({
    damageFiles: [] as File[],
    estimateFiles: [] as File[],
    otherFiles: [] as File[],
  });
  const [signerSuggestions, setSignerSuggestions] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectApprover = (u: User) => {
    setHeader((h) => ({
      ...h,
      approverKeyword: u.email,
      approverEmail: u.email,
      approverId: u.id,
      approverName: u.employeeName.th || u.employeeName.en!,
      approverPosition: u.position,
      approverDepartment: u.department,
    }));
    setSuggestions([]);
  };

  const selectSigner = (u: User) => {
    setHeader((h) => ({
      ...h,
      signerKeyword: u.email,
      signerEmail: u.email,
      signerId: u.id,
      signerName: u.employeeName.th || u.employeeName.en!,
      signerPosition: u.position,
    }));
    setSignerSuggestions([]);
  };
  // 👤 When user types an email, look up their profile
  // Prevent editing once an approver is selected
  const handleHeaderChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (header.approverEmail) return;
    const kw = e.target.value;
    setHeader((h) => ({
      ...h,
      approverKeyword: kw,
      approverEmail: "",
      approverId: "",
      approverName: "",
      approverPosition: "",
      approverDepartment: "",
    }));
    const hit = suggestions.find(
      (u) => u.email === kw || u.employeeName.th === kw || u.employeeName.en === kw
    );
    if (hit) {
      setHeader((h) => ({
        ...h,
        approverKeyword: hit.email,
        approverEmail: hit.email,
        approverId: hit.id,
        approverName: hit.employeeName.th || hit.employeeName.en!,
        approverPosition: hit.position,
        approverDepartment: hit.department || "",
      }));
      setSuggestions([]);
    }
  };

  useEffect(() => {
    const kw = header.approverKeyword.trim();
    if (kw.length < 3 || header.approverEmail === kw) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await fetchJson(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/userinfo?keyword=${encodeURIComponent(
            kw
          )}`,
          { headers: { Authorization: `Bearer ${session!.user.accessToken}` } }
        );
        const users: User[] = raw.map((p: any) => ({
          id: p.id,
          email: p.email,
          role: "USER",
          position: p.position,
          department: p.department,
          employeeName: { th: p.name, en: p.name },
        }));
        if (!cancelled) setSuggestions(users);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [header.approverKeyword, header.approverEmail, session]);

  const handleSignerChange = (e: ChangeEvent<HTMLInputElement>) => {
    const kw = e.target.value;
    setHeader((h) => ({
      ...h,
      signerKeyword: kw,
      signerEmail: "",
      signerId: "",
      signerName: "",
      signerPosition: "",
    }));

    // exact‐match pick:
    const hit = signerSuggestions.find(
      (u) =>
        u.email === kw || u.employeeName.th === kw || u.employeeName.en === kw
    );
    if (hit) {
      setHeader((h) => ({
        ...h,
        signerKeyword: hit.email,
        signerEmail: hit.email,
        signerId: hit.id,
        signerName: hit.employeeName.th || hit.employeeName.en!,
        signerPosition: hit.position,
      }));
      setSignerSuggestions([]); // close dropdown
    }
  };

  // 3) fetch on every signerKeyword change (>=3 chars)
  useEffect(() => {
    const kw = header.signerKeyword.trim();

    // ** bail out if too short OR already selected **
    if (kw.length < 3 || header.signerEmail === kw) {
      setSignerSuggestions([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const raw = await fetchJson(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/userinfo?keyword=${encodeURIComponent(kw)}`,
          { headers: { Authorization: `Bearer ${session!.user.accessToken}` } }
        );
        const users: User[] = raw.map(
          (p: {
            id: any;
            email: any;
            position: any;
            department: any;
            name: any;
          }) => ({
            id: p.id,
            email: p.email,
            role: "USER",
            position: p.position,
            department: p.department,
            employeeName: { th: p.name, en: p.name },
          })
        );
        if (!cancelled) setSignerSuggestions(users);
      } catch {
        if (!cancelled) setSignerSuggestions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [header.signerKeyword, header.signerEmail, session]);
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value: raw } = e.target;
    let value = raw;

    const numericFields = ["damageAmount", "partnerDamageAmount"];
    const timeFields = ["accidentTime", "policeTime"]; // ✅ add time field here

    if (numericFields.includes(name)) {
      if (value.startsWith("-")) return;
      if (!/^(?:\d+|\d*\.\d{0,2})?$/.test(value)) return;
    } else if (timeFields.includes(name)) {
      // ✅ allow time format without sanitizing
      if (!/^\d{2}:\d{2}$/.test(value)) return;
    } else {
      value = sanitizeText(value);
    }

    setValues((v) => ({ ...v, [name]: value }));
  };

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    field: keyof typeof files
  ) => {
    const fileList = e.target.files;
    if (!fileList) return;
    setFiles((f) => ({
      ...f,
      [field]: [...f[field], ...Array.from(fileList)],
    }));
  };
  const handleFileRemove = (field: keyof typeof files, idx: number) => {
    setFiles((f) => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }));
  };

  // 🔥 When they click Submit / Save Draft…
  const onSubmit: React.ComponentProps<typeof CPMForm>["onSubmit"] = async (
    _hdr,
    vals,
    f,
    saveAsDraft
  ) => {
    if (!header.approverEmail) {
      await Swal.fire({
        icon: "error",
        title: "ข้อผิดพลาด",
        text: "กรุณาระบุ ผู้รายงาน ก่อนบันทึก",
      });
      return;
    }
    try {
      const { isConfirmed } = await Swal.fire({
        title: saveAsDraft ? "บันทึกเป็นฉบับร่าง?" : "ยืนยันส่ง Claim?",
        text: saveAsDraft
          ? "คุณต้องการบันทึกแบบร่างหรือไม่"
          : "คุณแน่ใจว่าต้องการส่ง Claim ฉบับนี้",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: saveAsDraft ? "ใช่, บันทึกฉบับร่าง" : "ใช่, ส่งเลย",
        cancelButtonText: "ยกเลิก",
      });
      if (!isConfirmed) return;
      setSubmitting(true);
      // 1) create the Claim header
      const { claim } = await fetchJson(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/claims`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session!.user.accessToken}`,
          },
          body: JSON.stringify({
            categoryMain: header.categoryMain,
            categorySub: header.categorySub,
            approverEmail: header.approverEmail,
            approverId: header.approverId,
            approverName: header.approverName,
            approverPosition: header.approverPosition,
            approverDepartment: header.approverDepartment,
            saveAsDraft: saveAsDraft.toString(),
            approverKeyword: header.approverKeyword,
            signerEmail: header.signerEmail,
            signerId: header.signerId,
            signerName: header.signerName,
            signerPosition: header.signerPosition,
            signerKeyword: header.signerKeyword,
          }),
        }
      );

      // 2) upload the CPM form (FormData)
      const cpmFD = new FormData();
      Object.entries(vals).forEach(([k, v]) => cpmFD.set(k, v as string));
      f.damageFiles.forEach((file) => cpmFD.append("damageFiles", file));
      f.estimateFiles.forEach((file) => cpmFD.append("estimateFiles", file));
      f.otherFiles.forEach((file) => cpmFD.append("otherFiles", file));

      await fetchJson(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/claims/${claim.id}/cpm`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session!.user.accessToken}` },
          body: cpmFD,
        }
      );

      router.push(`/claim/dashboard`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (status === "loading") return <p className="p-6">Loading…</p>;

  return (
    <CPMForm
      header={{
        categoryMain: header.categoryMain,
        categorySub: header.categorySub,
        // pass these through so the form’s “approver” input uses them:
        approverEmail: header.approverEmail,
        approverId: header.approverId,
        approverName: header.approverName,
        approverPosition: header.approverPosition,
        approverDepartment: header.approverDepartment,
        approverKeyword: header.approverKeyword,
        signerEmail: header.signerEmail,
        signerId: header.signerId,
        signerName: header.signerName,
        signerPosition: header.signerPosition,
        signerKeyword: header.signerKeyword,
      }}
      onSelectApprover={selectApprover}
      onSelectSigner={selectSigner}
      onHeaderChange={handleHeaderChange}
      values={values}
      approverList={suggestions}
      onChange={handleChange}
      signerList={signerSuggestions}
      onSignerChange={handleSignerChange}
      onFileChange={handleFileChange}
      onFileRemove={handleFileRemove}
      onSubmit={onSubmit} // no dropdown any more
      submitting={submitting}
      error={error}
      files={files}
    />
  );
}
