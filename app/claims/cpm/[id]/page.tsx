// app/claims/[id]/page.tsx
"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import CPMForm, {
  CPMFormValues,
  CPMSubmitHandler,
  User,
} from "@/components/CPMForm";
import Swal from "sweetalert2";
import { fetchJson } from "@/lib/fetchJson";
import { deprecate } from "util";
import { CheckCircle, XCircle } from "lucide-react";

interface Attachment {
  id: string;
  fileName: string;
  url: string;
  type: "DAMAGE_IMAGE" | "ESTIMATE_DOC" | "OTHER_DOCUMENT";
}
interface CpmData {
  phoneNum: string;
  accidentDate: string;
  accidentTime: string;
  location: string;
  cause: string;
  repairShop: string;
  repairShopLocation: string;
  policeDate?: string;
  policeTime?: string;
  policeStation?: string;
  damageOwnType: "mitrphol" | "other";
  damageOtherOwn: string;
  damageDetail: string;
  damageAmount: string;
  victimDetail: string;
  partnerName: string;
  partnerPhone: string;
  partnerLocation: string;
  partnerDamageDetail: string;
  partnerDamageAmount: string;
  partnerVictimDetail: string;
}
interface ClaimPayload {
  signerKeyword: string;
  approverKeyword: string;
  approverName: string;
  approverEmail: string;
  id: string;
  docNum: string;
  status: string;
  categoryMain: string;
  categorySub: string;
  approverId: string;
  approverPosition: string;
  approverDepartment: string;
  createdByEmail: string;
  createdByName: string;
  insurerComment?: string;
  cpmForm?: CpmData;
  attachments: Attachment[];
  signerName: string;
  signerEmail: string;
  signerId: string;
  signerPosition: string;
}
export interface AttachmentItem {
  id: string;
  fileName: string;
  url: string;
  type: "DAMAGE_IMAGE" | "ESTIMATE_DOC" | "OTHER_DOCUMENT";
}
export default function ClaimDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [claim, setClaim] = useState<ClaimPayload | null>(null);
  const [loadingClaim, setLoadingClaim] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingFiles, setExistingFiles] = useState<AttachmentItem[]>([]);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [signers, setsigners] = useState<User[]>([]);
  const [header, setHeader] = useState({
    approverKeyword: "",
    signerKeyword: "",
    approverEmail: "",
    categoryMain: "",
    categorySub: "",
    approverId: "",
    approverPosition: "",
    approverDepartment: "",
    approverName: "",
    signerEmail: "",
    signerId: "",
    signerPosition: "",
    signerName: "",
  });

  const [values, setValues] = useState<CPMFormValues>({
    phoneNum: "",
    accidentDate: "",
    accidentTime: "",
    location: "",
    cause: "",
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
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [signerSuggestions, setSignerSuggestions] = useState<User[]>([]);
  const [Suggestions, setSuggestions] = useState<User[]>([]);
  // ด้านบน import type map ไว้
  const TYPE_LABELS: Record<string, string> = {
    DAMAGE_IMAGE: "รูปความเสียหาย",
    ESTIMATE_DOC: "เอกสารประเมินราคา",
    OTHER_DOCUMENT: "เอกสารอื่นๆ",
  };

  // ใน component ของคุณ
  // 1) สร้าง grouped map
  const groupedFiles = existingFiles.reduce<Record<string, AttachmentItem[]>>((acc, file) => {
    (acc[file.type] ??= []).push(file);
    return acc;
  }, {});
  useEffect(() => {
    if (status !== "authenticated") return;
    setLoadingClaim(true);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/claims/${id}`, {
      headers: { Authorization: `Bearer ${session!.user.accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load claim (${res.status})`);
        return res.json();
      })
      .then((data: { claim: ClaimPayload }) => {
        const c = data.claim;
        if (!c.cpmForm) throw new Error("CPM form is missing on this claim");
        setClaim(c);
        setHeader({
          approverDepartment: c.approverDepartment,
          categoryMain: c.categoryMain,
          categorySub: c.categorySub,
          approverId: c.approverId,
          approverEmail: c.approverEmail,
          approverName: c.approverName,
          approverPosition: c.approverPosition,
          signerId: c.signerId,
          signerEmail: c.signerEmail,
          signerName: c.signerName,
          signerPosition: c.signerPosition,
          approverKeyword: c.approverEmail,
          signerKeyword: c.signerEmail,
        });

        setValues({
          phoneNum: c.cpmForm.phoneNum,
          accidentDate: c.cpmForm.accidentDate.slice(0, 10),
          accidentTime: c.cpmForm.accidentTime,
          location: c.cpmForm.location,
          cause: c.cpmForm.cause,
          repairShop: c.cpmForm.repairShop,
          repairShopLocation: c.cpmForm.repairShopLocation,
          policeDate: c.cpmForm.policeDate?.slice(0, 10) || "",
          policeTime: c.cpmForm.policeTime || "",
          policeStation: c.cpmForm.policeStation || "",
          damageOwnType: c.cpmForm.damageOwnType,
          damageOtherOwn: c.cpmForm.damageOtherOwn || "",
          damageDetail: c.cpmForm.damageDetail || "",
          damageAmount: String(c.cpmForm.damageAmount || ""),
          victimDetail: c.cpmForm.victimDetail || "",
          partnerName: c.cpmForm.partnerName || "",
          partnerPhone: c.cpmForm.partnerPhone || "",
          partnerLocation: c.cpmForm.partnerLocation || "",
          partnerDamageDetail: c.cpmForm.partnerDamageDetail || "",
          partnerDamageAmount: String(c.cpmForm.partnerDamageAmount || ""),
          partnerVictimDetail: c.cpmForm.partnerVictimDetail || "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingClaim(false));
  }, [status, id, session]);

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users`,
          {
            headers: { Authorization: `Bearer ${session!.user.accessToken}` },
          }
        );
        if (!res.ok) throw new Error(await res.text());

        const { users: raw } = await res.json();
        const mapped: User[] = raw.map((u: any) => ({
          id: u.id,
          email: u.email,
          role: "USER",
          position: u.position,
          department: u.department || "",
          employeeName: { th: u.name, en: u.name },
        }));

        setApprovers(mapped);
      } catch (err) {
        console.error("Failed to load approvers:", err);
      }
    })();
  }, [status, session]);

  useEffect(() => {
    if (status !== "authenticated" || !id) return;

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/claims/${id}/attachments`, {
      headers: {
        Authorization: `Bearer ${session!.user.accessToken}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load attachments");
        return res.json();
      })
      .then((data: AttachmentItem[]) => {
        setExistingFiles(data);
      })
      .catch(err => {
        console.error("โหลดไฟล์เก่าไม่สำเร็จ:", err);
      });
  }, [id, status, session]);


  // inside ClaimDetailPage…
  const handleSelectApprover = (u: User) => {
    setHeader((h) => ({
      ...h,
      approverKeyword: u.email,
      approverEmail: u.email,
      approverId: u.id,
      approverName: u.employeeName.th || u.employeeName.en!,
      approverPosition: u.position,
      approverDepartment: u.department,
    }));
    setSuggestions([]); // hide the dropdown
  };

  const handleSelectSigner = (u: User) => {
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
  const handleSaveSigner = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/claims/${id}/signer`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user.accessToken}`,
          },
          body: JSON.stringify({
            signerId: header.signerId,
            signerEmail: header.signerEmail,
            signerName: header.signerName,
            signerPosition: header.signerPosition,
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      Swal.fire("Saved!", "Signer was updated successfully.", "success");
    } catch (e: any) {
      Swal.fire("Error", e.message, "error");
    }
  };
  useEffect(() => {
    const kw = header.signerKeyword.trim();
    if (kw.length < 3) {
      setSignerSuggestions([]);
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

        const users: User[] = (raw as any[]).map((p) => ({
          id: p.id,
          email: p.email,
          role: "USER",
          position: p.position,
          department: p.department || "",
          employeeName: { th: p.name, en: p.name },
        }));
        if (!cancelled) setSignerSuggestions(users);
      } catch (err) {
        console.error("Error fetching signer suggestions:", err);
        if (!cancelled) setSignerSuggestions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    header.signerKeyword,            // ✅ เฉพาะ keyword เท่านั้น
    session?.user.accessToken,       // ✅ track token ด้วย
  ]);
  if (status === "loading") return <p className="p-6">Loading session…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (loadingClaim) return <p className="p-6">Loading claim…</p>;
  if (!claim) return <p className="p-6">Claim not found</p>;
  const isCreator = session?.user.name === claim.createdByName;
  const isApprover =
    session?.user.employeeNumber === claim.approverId        // if you track approver by user.id
  // —or— String(session.user.employeeNumber) === claim.approverId
  const isInsurer = session?.user.role === "INSURANCE";
  const isManager = session?.user.role === "MANAGER";

  if (!isCreator && !isApprover && !isInsurer && !isManager) {
    return (
      <p className="p-6 text-red-600">
        You don’t have permission to see this claim.
      </p>
    );
  }
  const isInsuranceReviewer =
    session!.user.role === "INSURANCE" &&
    claim.status === "PENDING_INSURER_REVIEW";
  const handleHeaderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name;
    if (name.startsWith("approver")) {
      // do nothing
      return;
    }
    const value = e.target.value;
    setHeader((h) => ({ ...h, [name]: value }));
  };
  const canEdit =
    // original author on drafts/evidence
    session!.user.name === claim.createdByName &&
    ["DRAFT", "AWAITING_EVIDENCE"].includes(claim.status);
  // or insurance user when we're in the insurer‐review step

  const readOnly = !canEdit;
  const canEditSigner = isInsuranceReviewer;
  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    field: keyof typeof files
  ) => {
    if (!e.target.files) return;
    setFiles((f) => ({
      ...f,
      [field]: [...f[field], ...Array.from(e.target.files!)],
    }));
  };
  const handleFileRemove = (field: keyof typeof files, idx: number) => {
    setFiles((f) => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }));
  };

  const handleAction = async (
    action: "approve" | "reject" | "request_evidence"
  ) => {
    let comment: string | undefined;
    if (action !== "approve") {
      const { value: text } = await Swal.fire({
        input: "textarea",
        title: action === "reject" ? "ระบุเหตุผล" : "ขอเอกสารเพิ่มเติม",
        showCancelButton: true,
      });
      if (!text) return;
      comment = text;
    }
    setActionLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/claims/${id}/action`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session!.user.accessToken}`,
          },
          body: JSON.stringify({ action, comment }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      router.push("/claim/dashboard");
    } catch (e: any) {
      Swal.fire("Error", e.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproverAction = async (action: "approve" | "reject") => {
    let comment: string | undefined;
    if (action === "reject") {
      const { value: text } = await Swal.fire({
        input: "textarea",
        title: "ระบุเหตุผล",
        showCancelButton: true,
      });
      if (!text) return;
      comment = text;
    }

    setActionLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/claims/${id}/approverAction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session!.user.accessToken}`,
          },
          body: JSON.stringify({ action, comment }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      router.push("/claim/dashboard");
    } catch (e: any) {
      Swal.fire("Error", e.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const wrappedOnSubmit: CPMSubmitHandler = (_hdr, vals, f, saveAsDraft) => {
    setSubmitting(true);
    const fd = new FormData();
    fd.set("saveAsDraft", saveAsDraft.toString());
    Object.entries(vals).forEach(([k, v]) => fd.set(k, v as string));
    f.damageFiles.forEach((f) => fd.append("damageFiles", f));
    f.estimateFiles.forEach((f) => fd.append("estimateFiles", f));
    f.otherFiles.forEach((f) => fd.append("otherFiles", f));

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/claims/${id}/cpm`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${session!.user.accessToken}` },
      body: fd,
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        router.push("/claim/claims");
      })
      .catch((e) => Swal.fire("Error", e.message, "error"))
      .finally(() => setSubmitting(false));
  };

  const userEmpNum = String(session!.user.employeeNumber);

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-8">
      {claim.insurerComment && (
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <strong>Comment:</strong> {claim.insurerComment}
        </div>
      )}
      <h1 className="text-2xl font-bold">Claim {claim.docNum}</h1>
      <p>
        Status: <span className="font-semibold">{claim.status}</span>
      </p>

      <CPMForm
        onSaveSigner={canEditSigner ? handleSaveSigner : undefined}
        header={header}

        onHeaderChange={handleHeaderChange}
        onSignerChange={handleSignerChange}
        values={values}
        onChange={(e) =>
          setValues((v) => ({ ...v, [e.target.name]: e.target.value }))
        }
        onFileChange={handleFileChange}
        onFileRemove={handleFileRemove}
        onSubmit={wrappedOnSubmit}
        onSelectApprover={handleSelectApprover}
        onSelectSigner={handleSelectSigner}
        approverList={[]}
        submitting={submitting}
        readOnly={readOnly}
        existingFiles={existingFiles}
        onDeleteExisting={att => {   // ลบไฟล์เดิม
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/claims/${id}/attachments/${att.id}`, { method: 'DELETE' })
            .then(() => setExistingFiles(f => f.filter(x => x.id !== att.id)));
        }}
        isEvidenceFlow={claim.status === "AWAITING_EVIDENCE"}
        error={null}
        signerEditable={canEditSigner}
        files={files}
        signerList={signerSuggestions}
      />
      {(claim.status !== "DRAFT" && claim.status !== "AWAITING_EVIDENCE") &&
        Object.entries(groupedFiles).map(([type, files]) => (
          <section key={type} className="mb-8">
            <h2 className="text-lg font-semibold mb-4">
              {TYPE_LABELS[type] || type}
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {files.map((att) => {
                const isImage = /\.(jpe?g|png|gif|bmp)$/i.test(att.fileName);
                console.log(att.url)
                const fileHref = `http://10.25.68.72/claim${att.url}`;
                console.log(fileHref)
                return (
                  <div
                    key={att.id}
                    className="border rounded-lg p-2 bg-white flex flex-col items-center"
                  >
                    <a
                      href={fileHref}
                      // href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 w-full flex justify-center"
                    >
                      {isImage ? (
                        <img
                          src={fileHref}
                          // src={att.url}
                          alt={att.fileName}
                          className="h-24 object-contain"
                        />
                      ) : (
                        <div className="h-24 w-full flex items-center justify-center text-4xl">
                          📄
                        </div>
                      )}
                    </a>
                    <p className="text-xs text-gray-700 truncate w-full text-center">
                      {att.fileName}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      }

      {userEmpNum === claim.approverId &&
        claim.status === "PENDING_APPROVER_REVIEW" && (
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={() => handleApproverAction("approve")}
              disabled={actionLoading}
              className="flex items-center bg-green-500 hover:bg-green-600 text-white font-medium px-5 py-3 rounded-xl shadow-lg transition"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              อนุมัติ
            </button>
            <button
              onClick={() => handleApproverAction("reject")}
              disabled={actionLoading}
              className="flex items-center bg-red-600 hover:bg-red-700 text-white font-medium px-5 py-3 rounded-xl shadow-lg transition"
            >
              <XCircle className="h-5 w-5 mr-2" />
              ปฏิเสธ
            </button>
          </div>
        )}

      {session.user.role === "INSURANCE" &&
        claim.status === "PENDING_INSURER_REVIEW" && (
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={() => handleAction("approve")}
              disabled={actionLoading}
              className="flex items-center bg-green-500 hover:bg-green-600 text-white font-medium px-5 py-3 rounded-xl shadow-lg transition"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              อนุมัติ
            </button>
            <button
              onClick={() => handleAction("reject")}
              disabled={actionLoading}
              className="flex items-center bg-red-600 hover:bg-red-700 text-white font-medium px-5 py-3 rounded-xl shadow-lg transition"
            >
              <XCircle className="h-5 w-5 mr-2" />
              ปฏิเสธ
            </button>
            <button
              onClick={() => handleAction("request_evidence")}
              disabled={actionLoading}
              className="flex items-center bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-5 py-3 rounded-xl shadow-lg transition"
            >
              📝 {/* or use another icon if you like */}
              ขอเอกสารเพิ่มเติม
            </button>
          </div>
        )}

      {readOnly && <p className="text-gray-600 italic">View-only mode</p>}
    </div>
  );
}
