// components/FPPA04CPMForm.tsx
"use client";

import { useParams } from "next/navigation";
import React, { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Swal from "sweetalert2";
import ThaiDatePicker from "../components/ThaiDatePicker";

export interface FPPA04CPMFormItem {
  category: string;
  description: string;
  total: string;
  exception: string;
}

export interface FPPA04CPMAdjustment {
  type: "บวก" | "หัก";
  description: string;
  amount: string;
}

export interface FPPA04CPMFormValues {
  eventType: string;
  claimRefNumber: string;
  eventDescription: string;
  productionYear: string;
  accidentDate: string;
  reportedDate: string;
  receivedDocDate: string;
  company: string;
  factory: string;
  policyNumber: string;
  surveyorRefNumber: string;
  items: FPPA04CPMFormItem[];
  adjustments: FPPA04CPMAdjustment[];
  signatureFiles: File[];
  signatureUrls?: string[];
  insurancePayout: string;
}

interface Props {
  defaults: {
    signerName: string | number | readonly string[] | undefined;
    docNum: string;
    accidentDate?: string;
    status: string;
    cause: string;
    approverName: string;
  };
  initialData?: FPPA04CPMFormValues;
  onChange?: (vals: FPPA04CPMFormValues) => void;
  onSave: (vals: FPPA04CPMFormValues) => void | Promise<void>;
}

export default function FPPA04Form({
  defaults,
  initialData,
  onChange,
  onSave,
}: Props) {
  const { claimId } = useParams();
  const defaultAdjustments: FPPA04CPMAdjustment[] = [
    { type: "หัก", description: "ส่วนลดจากตัวแทนจำหน่าย", amount: "0.00" },
    { type: "หัก", description: "รายได้จากการขายเศษซาก", amount: "0.00" },
    {
      type: "หัก",
      description: "กำหนดวงเงินเอาประกันภัยต่ำกว่ามูลค่าที่แท้จริง",
      amount: "0.00",
    },
    {
      type: "บวก",
      description: "รายการที่เจรจาต่อได้เพิ่มขึ้น",
      amount: "0.00",
    },
    { type: "หัก", description: "รายการที่ปรับลดลง", amount: "0.00" },
    {
      type: "หัก",
      description: "ความรับผิดชอบส่วนแรก 10% หรือขั้นต่ำ 20,000 (พลิกคว่ำ)",
      amount: "0.00",
    },
  ];
  const defaultItems: FPPA04CPMFormItem[] = [
    {
      category: "1.1 รายการซ่อมแซม",
      description: "",
      total: "0.00",
      exception: "0.00",
    },
    {
      category: "1.2 รายการเปลี่ยนใหม่",
      description: "",
      total: "0.00",
      exception: "0.00",
    },
    {
      category: "1.3 รายการอื่นๆ (ไม่อยู่ในเงื่อนไขการเคลม)",
      description: "",
      total: "0.00",
      exception: "0.00",
    },
    {
      category: "1.4 ค่าบริการ",
      description: "",
      total: "0.00",
      exception: "0.00",
    },
  ];
  const canEdit = defaults.status === "PENDING_INSURER_FORM";
  const { data: session } = useSession();
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const [existingUrls, setExistingUrls] = useState<string[]>(
    () => initialData?.signatureUrls || []
  );
  const [vals, setVals] = useState<FPPA04CPMFormValues>(() => ({
    eventType: initialData?.eventType || "",
    claimRefNumber: initialData?.claimRefNumber || "",
    eventDescription: initialData?.eventDescription || "",
    productionYear:
      initialData?.productionYear || new Date().getFullYear().toString(),
    accidentDate: initialData?.accidentDate || "",
    reportedDate: initialData?.reportedDate || "",
    receivedDocDate: initialData?.receivedDocDate || "",
    company: initialData?.company || "",
    factory: initialData?.factory || "",
    policyNumber: initialData?.policyNumber || "",
    surveyorRefNumber: initialData?.surveyorRefNumber || "",
    items: initialData?.items.length ? initialData.items : defaultItems,
    adjustments: initialData?.adjustments?.length
      ? initialData.adjustments
      : defaultAdjustments,
    signatureFiles: [],
    insurancePayout: initialData?.insurancePayout || "",
  }));
  useEffect(() => {
    if (onChange) onChange(vals);
  }, [vals, onChange]);
  const sanitizeText = (s: string) =>
    s.replace(/[^ก-๙A-Za-z0-9\s\-\/\(\)]/g, "");
  const decimalRegex = /^(?:\d+|\d*\.\d{0,2})?$/;
  // list out every field name that must obey “no minus, max 2 decimals”
  const numericFields = [
    "productionYear",
    "insurancePayout",
    // if you ever use a netAmount input directly:
    "netAmount",
    // for your table rows:
    ...vals.items.map((_, i) => `items[${i}].total`),
    ...vals.items.map((_, i) => `items[${i}].exception`),
    ...vals.adjustments.map((_, i) => `adjustments[${i}].amount`),
  ];
  const updateField = <K extends keyof FPPA04CPMFormValues>(
    key: K,
    value: FPPA04CPMFormValues[K]
  ) => {
    setVals((v) => ({ ...v, [key]: value }));
  };

  const handleInput = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!canEdit) return;

    const { name, value: raw } = e.target;
    let value = raw;

    // numeric fields: block '-' and enforce up to 2 decimals
    if (numericFields.includes(name)) {
      if (value.startsWith("-")) return;
      if (!/^(?:\d+|\d*\.\d{0,2})?$/.test(value)) return;
    }
    // all other text fields: strip out special chars (but keep hyphens)
    else {
      value = sanitizeText(value);
    }

    // now commit
    setVals((v) => ({ ...v, [name]: value }));
  };

  // handlers preventing edit when not allowed
  const handleField = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!canEdit) return;
    const { name, value } = e.target;
    setVals((v) => ({ ...v, [name]: value }));
  };

  const changeItem = (i: number, k: keyof FPPA04CPMFormItem, v: string) => {
    if (!canEdit) return;
    setVals((vs) => {
      const items = [...vs.items];
      items[i] = { ...items[i], [k]: v };
      return { ...vs, items };
    });
  };
  const addItem = () =>
    canEdit &&
    setVals((vs) => ({
      ...vs,
      items: [
        ...vs.items,
        { category: "", description: "", total: "", exception: "" },
      ],
    }));
  const delItem = (i: number) =>
    canEdit &&
    setVals((vs) => ({ ...vs, items: vs.items.filter((_, idx) => idx !== i) }));

  const changeAdj = (i: number, k: keyof FPPA04CPMAdjustment, v: string) => {
    if (!canEdit) return;

    // Only on the `amount` key: block negatives, max 2 decimals
    if (k === "amount") {
      if (v.startsWith("-")) return;
      if (!/^(?:\d+|\d*\.\d{0,2})?$/.test(v)) return;
    }

    setVals((vs) => {
      const a = [...vs.adjustments];
      a[i] = { ...a[i], [k]: v };
      return { ...vs, adjustments: a };
    });
  };
  const addAdj = () =>
    canEdit &&
    setVals((vs) => ({
      ...vs,
      adjustments: [
        ...vs.adjustments,
        { type: "บวก", description: "", amount: "" },
      ],
    }));
  const delAdj = (i: number) =>
    canEdit &&
    setVals((vs) => ({
      ...vs,
      adjustments: vs.adjustments.filter((_, idx) => idx !== i),
    }));

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    const files = Array.from(e.target.files || []);
    setNewFiles((f) => [...f, ...files]);
    const urls = files.map((f) => URL.createObjectURL(f));
    setNewPreviews((p) => [...p, ...urls]);
    // เก็บ files ไว้ใน vals ด้วย (ส่งขึ้น API)
    setVals((v) => ({ ...v, signatureFiles: [...v.signatureFiles, ...files] }));
  };

  useEffect(() => {
    return () => newPreviews.forEach((url) => URL.revokeObjectURL(url));
  }, [newPreviews]);
  const removeNew = (i: number) => {
    URL.revokeObjectURL(newPreviews[i]);
    setNewPreviews((p) => p.filter((_, idx) => idx !== i));
    setNewFiles((f) => f.filter((_, idx) => idx !== i));
    setVals((v) => ({
      ...v,
      signatureFiles: v.signatureFiles.filter((_, idx) => idx !== i),
    }));
  };
  const removeExisting = (i: number) => {
    setExistingUrls((u) => u.filter((_, idx) => idx !== i));
  };

  

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const result = await Swal.fire({
      title: "คุณแน่ใจหรือไม่?",
      text: "ยืนยันจะส่งข้อมูลแบบฟอร์มหรือไม่",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ใช่, ส่งเลย",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;

    const fd = new FormData();
    (
      [
        "eventType",
        "claimRefNumber",
        "eventDescription",
        "productionYear",
        "accidentDate",
        "reportedDate",
        "receivedDocDate",
        "company",
        "factory",
        "policyNumber",
        "surveyorRefNumber",
      ] as const
    ).forEach((k) => fd.append(k, vals[k]));
    vals.items.forEach((i) => fd.append("items", JSON.stringify(i)));
    vals.adjustments.forEach((a) =>
      fd.append("adjustments", JSON.stringify(a))
    );
    vals.signatureFiles.forEach((file) => {
      fd.append("signatureFiles", file);
    });
    fd.append("insurancePayout", payout.toFixed(2));
    fd.append("netAmount", finalNet.toFixed(2));

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/fppa04/${claimId}/cpm`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.user.accessToken}` },
        body: fd,
      }
    );
    if (!res.ok) return Swal.fire("Error", await res.text(), "error");
    await onSave(vals);
  };

  const inputClass = (editable: boolean) =>
    `w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm focus:outline-none transition ${
      editable ? "bg-white" : "bg-gray-100 text-gray-600 cursor-not-allowed"
    }`;

const primaryCount = 3; // or vals.adjustments.slice(0,3).length
const primaryAdjustments   = vals.adjustments.slice(0, primaryCount);
const secondaryAdjustments = vals.adjustments.slice(primaryCount);

  const totalSum     = vals.items.reduce((s, i) => s + +i.total     || 0, 0);
const exceptionSum = vals.items.reduce((s, i) => s + +i.exception || 0, 0);
const coverageSum  = totalSum - exceptionSum;

// 2) split adjustments
const primary   = vals.adjustments.slice(0, 3);
const secondary = vals.adjustments.slice(3);

// 3) primary adjustments sums
const primaryPlus  = primary
  .filter(a => a.type === "บวก")
  .reduce((s, a) => s + +a.amount, 0);
const primaryMinus = primary
  .filter(a => a.type === "หัก")
  .reduce((s, a) => s + +a.amount, 0);

  const secondaryPlus  = secondary
  .filter(a => a.type === "บวก")
  .reduce((s, a) => s + +a.amount, 0);
const secondaryMinus = secondary
  .filter(a => a.type === "หัก")
  .reduce((s, a) => s + +a.amount, 0);
// 4) computed payout
const payout = coverageSum + primaryPlus - primaryMinus;

// 5) secondary total
const secondarySum = secondary.reduce((s, a) => s + +a.amount, 0);

// 6) final net
const finalNet = payout + secondaryPlus - secondaryMinus;

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Top Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block mb-1 font-medium">เลขที่ฟอร์ม</label>
          <input
            readOnly
            value={defaults.docNum}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg bg-gray-50"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">สาเหตุของอุบัติเหตุ</label>
          <textarea
            readOnly
            value={defaults.cause}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg bg-gray-50"
          />
        </div>
      </div>

      {/* Policy & Claim Ref */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block mb-1 font-medium">ประเภทกรมธรรม์</label>
          <input
            name="eventType"
            value={vals.eventType}
            onChange={handleInput}
            disabled={!canEdit}
            className={inputClass(canEdit)}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">หมายเลขรับ Claim</label>
          <input
            name="claimRefNumber"
            value={vals.claimRefNumber}
            onChange={handleInput}
            disabled={!canEdit}
            className={inputClass(canEdit)}
          />
        </div>
      </div>

      {/* Event Description */}
      <div>
        <label className="block mb-1 font-medium">เหตุการณ์</label>
        <textarea
          name="eventDescription"
          value={vals.eventDescription}
          onChange={handleInput}
          disabled={!canEdit}
          className={`${inputClass(canEdit)} h-24`}
        />
      </div>

      {/* Dates & Company/Factory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block mb-1 font-medium">ปีรถที่ผลิต</label>
          <input
            name="productionYear"
            type="number"
            onWheel={(e) => e.currentTarget.blur()}
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            min={1900}
            max={new Date().getFullYear()}
            value={vals.productionYear}
            onChange={handleInput}
            disabled={!canEdit}
            className={inputClass(canEdit)}
          />
        </div>
        <div>
          <ThaiDatePicker
            name="accidentDate"
            label="วันที่เกิดเหตุ"
            value={vals.accidentDate}
            onChange={(iso) => setVals((v) => ({ ...v, accidentDate: iso }))}
            disabled={!canEdit}
            inputClass={inputClass(canEdit)}
          />
        </div>
      </div>

      {/* Second row: reportedDate + receivedDocDate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <ThaiDatePicker
            name="reportedDate"
            label="วันที่รับแจ้ง"
            value={vals.reportedDate}
            onChange={(iso) => setVals((v) => ({ ...v, reportedDate: iso }))}
            disabled={!canEdit}
            inputClass={inputClass(canEdit)}
          />
        </div>
        <div>
          <ThaiDatePicker
            name="receivedDocDate"
            label="วันที่ได้รับเอกสาร"
            value={vals.receivedDocDate}
            onChange={(iso) => setVals((v) => ({ ...v, receivedDocDate: iso }))}
            disabled={!canEdit}
            inputClass={inputClass(canEdit)}
          />
        </div>
      </div>

      {/* Company & Factory & Approver */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block mb-1 font-medium">บริษัท</label>
          <input
            name="company"
            value={vals.company}
            onChange={handleInput}
            disabled={!canEdit}
            className={inputClass(canEdit)}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">โรงงาน</label>
          <input
            name="factory"
            value={vals.factory}
            onChange={handleInput}
            disabled={!canEdit}
            className={inputClass(canEdit)}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">ผู้อนุมัติเอกสาร</label>
          <input
            readOnly
            value={defaults.signerName}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg bg-gray-50"
          />
        </div>
      </div>

      {/* Policy Number & Surveyor Ref */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block mb-1 font-medium">เลขที่กรมธรรม์</label>
          <input
            name="policyNumber"
            value={vals.policyNumber}
            onChange={handleInput}
            disabled={!canEdit}
            className={inputClass(canEdit)}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">
            เลขที่ Claim Surveyor
          </label>
          <input
            name="surveyorRefNumber"
            value={vals.surveyorRefNumber}
            onChange={handleInput}
            disabled={!canEdit}
            className={inputClass(canEdit)}
          />
        </div>
      </div>

      {/* ตารางรายการแจ้งเคลมประกัน */}
      <div className="overflow-auto">
        <table className=" table-fixed border-collapse ">
          <colgroup>
            <col className="w-1/5" />
            <col className="w-2/5" />
            <col className="w-1/5" />
            <col className="w-1/5" />
            <col className="w-1/5" />
          </colgroup>
          <thead className="bg-blue-50 sticky top-0">
            <tr>
              {["รายการ", "รายละเอียด", "รวม", "ข้อยกเว้น", "คุ้มครอง"].map(
                (h, i) => (
                  <th
                    key={i}
                    className="px-2 py-1 border border-blue-200 text-center text-sm text-blue-800"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {vals.items.map((it, idx) => {
              const cover = (
                parseFloat(it.total || "0") - parseFloat(it.exception || "0")
              ).toFixed(2);
              return (
                <tr key={idx} className="hover:bg-blue-100">
                  {(
                    ["category", "description", "total", "exception"] as const
                  ).map((f, ci) => (
                    <td key={ci} className="px-2 py-1.5 border border-blue-200">
                      <input
                        type={
                          f === "total" || f === "exception" ? "number" : "text"
                        }
                        step="0.01"
                        placeholder={
                          f === "total" || f === "exception"
                            ? "0.00"
                            : undefined
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        value={(it as any)[f]}
                        onChange={(e) => {
                          const v = e.target.value;
                          // only enforce on the numeric columns
                          if (f === "total" || f === "exception") {
                            // block negatives
                            if (v.startsWith("-")) return;
                            // allow only digits with up to 2 decimals
                            if (!/^(?:\d+|\d*\.\d{0,2})?$/.test(v)) return;
                            // for exception, ensure it never exceeds its row's total
                            if (f === "exception") {
                              const totalVal =
                                parseFloat(vals.items[idx].total) || 0;
                              if (parseFloat(v) > totalVal) return;
                            }
                          }
                          changeItem(idx, f as any, v);
                        }}
                        disabled={!canEdit}
                        className="w-full border border-gray-300 px-2 py-1.5 rounded text-xs transition
                             bg-white focus:outline-none focus:ring-2 focus:ring-blue-400
                             disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 border border-blue-200 text-right text-xs">
                    {cover}
                  </td>
                  {canEdit && (
                    <td
                      className="px-2 py-1 text-center text-red-600 cursor-pointer text-xs"
                      onClick={() => delItem(idx)}
                    >
                      ✖
                    </td>
                  )}
                </tr>
              );
            })}
            <tr className="bg-blue-50 font-semibold text-xs">
              <td
                colSpan={2}
                className="px-2 py-1.5 border border-blue-200 text-right"
              >
                รวม
              </td>
              <td className="px-2 py-1.5 border border-blue-200 text-right">
                {totalSum.toFixed(2)}
              </td>
              <td className="px-2 py-1.5 border border-blue-200 text-right">
                {exceptionSum.toFixed(2)}
              </td>
              <td className="px-2 py-1.5 border border-blue-200 text-right">
                {coverageSum.toFixed(2)}
              </td>
              {canEdit && <td className="bg-white"></td>}
            </tr>
          </tbody>
        </table>
        {canEdit && (
          <button
            type="button"
            onClick={addItem}
            className="mt-2 text-blue-600 hover:underline text-xs"
          >
            + เพิ่มรายการ
          </button>
        )}
      </div>
        <div>
      <hr className="my-6 border-t border-blue-200" />

      {/* ตารางรายการบวก/หัก */}
      <div className="overflow-auto w-full">
        <table className="table-fixed border-collapse w-full">
          <colgroup>
            <col className="w-1/6" />
            <col className="w-3/6" />
            <col className="w-2/6" />
          </colgroup>
          <thead className="bg-blue-50 sticky top-0">
            <tr>
              {["บวก/หัก", "รายละเอียด", "จำนวนเงิน (บาท)"].map((h, i) => (
                <th
                  key={i}
                  className="px-2 py-1.5 border border-blue-200 text-center text-sm text-blue-800"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {primaryAdjustments.map((a, idx) => (
              <tr key={idx} className="hover:bg-blue-100">
                {/* บวก/หัก */}
                <td className="px-2 py-1.5 border border-blue-200 text-center text-xs">
                  <select
                    value={a.type}
                    onChange={(e) => changeAdj(idx, "type", e.target.value)}
                    disabled={!canEdit}
                    className="w-full border border-gray-300 px-2 py-1.5 rounded text-xs transition
                         bg-white focus:outline-none focus:ring-2 focus:ring-blue-400
                         disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                  >
                    <option value="บวก">บวก</option>
                    <option value="หัก">หัก</option>
                  </select>
                </td>
                {/* รายละเอียด */}
                <td className="px-2 py-1.5 border border-blue-200">
                  <input
                    type="text"
                    value={a.description}
                    onChange={(e) =>
                      changeAdj(idx, "description", e.target.value)
                    }
                    disabled={!canEdit}
                    className="w-full border border-gray-300 px-2 py-1.5 rounded text-xs transition
                         bg-white focus:outline-none focus:ring-2 focus:ring-blue-400
                         disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                  />
                </td>
                {/* จำนวนเงิน */}
                <td className="px-2 py-1.5 border border-blue-200">
                  <input
                    type="number"
                    onWheel={(e) => e.currentTarget.blur()}
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    pattern="^\d+(\.\d{1,2})?$"
                    value={a.amount}
                    onChange={(e) => changeAdj(idx, "amount", e.target.value)}
                    disabled={!canEdit}
                    className="w-full border border-gray-300 px-2 py-1.5 rounded text-xs transition
                         bg-white focus:outline-none focus:ring-2 focus:ring-blue-400
                         disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                  />
                </td>
                {/* ปุ่มลบ */}
                {canEdit && (
                  <td
                    className="px-2 py-1 text-center text-red-600 cursor-pointer text-sm"
                    onClick={() => delAdj(idx)}
                  >
                    ✖
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {canEdit && (
          <button
            type="button"
            onClick={addAdj}
            className="mt-2 text-blue-600 hover:underline text-xs"
          >
            + เพิ่มรายการปรับ
          </button>
        )}
      </div>
      </div>
      <div>
        <section className="flex items-end justify-end mt-6 flex items-baseline justify-between">
  <div>
    <span className="font-semibold">การพิจารณาจ่ายสินไหมจาก บ.ประกันภัย (บาท):</span>
    <span className="ml-2">{payout.toFixed(2)} บาท</span>
  </div>
</section>
        <div>
          {/* ตารางรายการบวก/หัก */}
          <div className="overflow-auto w-full py-5">
            <table className="table-fixed border-collapse w-full">
              <colgroup>
                <col className="w-1/6" />
                <col className="w-3/6" />
                <col className="w-2/6" />
              </colgroup>
              <thead className="bg-blue-50 sticky top-0">
                <tr>
                  {["บวก/หัก", "รายละเอียด", "จำนวนเงิน (บาท)"].map((h, i) => (
                    <th
                      key={i}
                      className="px-2 py-1.5 border border-blue-200 text-center text-sm text-blue-800"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {secondaryAdjustments.map((a, idx) => {
                  const globalIdx = primaryCount + idx;
                  return (
                  <tr key={globalIdx} className="hover:bg-blue-100">
                    {/* บวก/หัก */}
                    
                    <td className="px-2 py-1.5 border border-blue-200 text-center text-xs">
                      <select
                        value={a.type}
                        onChange={(e) => changeAdj(globalIdx, "type", e.target.value)}
                        disabled={!canEdit}
                        className="w-full border border-gray-300 px-2 py-1.5 rounded text-xs transition
                         bg-white focus:outline-none focus:ring-2 focus:ring-blue-400
                         disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                      >
                        <option value="บวก">บวก</option>
                        <option value="หัก">หัก</option>
                      </select>
                    </td>
                    {/* รายละเอียด */}
                    <td className="px-2 py-1.5 border border-blue-200">
                      <input
                        type="text"
                        value={a.description}
                        onChange={(e) =>
                          changeAdj(globalIdx, "description", e.target.value)
                        }
                        disabled={!canEdit}
                        className="w-full border border-gray-300 px-2 py-1.5 rounded text-xs transition
                         bg-white focus:outline-none focus:ring-2 focus:ring-blue-400
                         disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                      />
                    </td>
                    {/* จำนวนเงิน */}
                    <td className="px-2 py-1.5 border border-blue-200">
                      <input
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        pattern="^\d+(\.\d{1,2})?$"
                        value={a.amount}
                        onChange={(e) =>
                          changeAdj(globalIdx, "amount", e.target.value)
                        }
                        disabled={!canEdit}
                        className="w-full border border-gray-300 px-2 py-1.5 rounded text-xs transition
                         bg-white focus:outline-none focus:ring-2 focus:ring-blue-400
                         disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                      />
                    </td>
                    {/* ปุ่มลบ */}
                    {canEdit && (
                      <td
                        className="px-2 py-1 text-center text-red-600 cursor-pointer text-sm"
                        onClick={() => delAdj(globalIdx)}
                      >
                        ✖
                      </td>
                    )}
                  </tr>
                  )
                })}
              </tbody>
            </table>
            {canEdit && (
              <button
                type="button"
                onClick={addAdj}
                className="mt-2 text-blue-600 hover:underline text-xs"
              >
                + เพิ่มรายการปรับ
              </button>
            )}
          </div>

          {/* right: net summary */}
          <div className="flex items-end justify-end items-baseline space-x-2 py-5">
            <span className="font-semibold">เงินรับค่าสินไหมสุทธิ:</span>
            <input
              readOnly
              value={finalNet.toFixed(2)}
              className="w-32 text-right bg-blue-50 border border-blue-200 rounded px-2 py-1.5 font-medium"
            />
            <span>บาท</span>
          </div>
        </div>
      </div>
      {/* Signature upload */}
      <div>
        <label className="block mb-1 font-medium">Signature Files</label>
        <input
          type="file"
          multiple
          name="signatureFiles"
          onChange={onFile}
          disabled={!canEdit}
          className={inputClass(canEdit)}
        />

        {/* Preview gallery */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {/* 1) รูปเดิมที่มี URL มาโชว์ */}
          {existingUrls.map((url, idx) => {
            const isImage = /\.(jpe?g|png|gif|bmp|webp)$/i.test(url);
            const fileName =
              url.split("/").pop()?.split("?")[0] || `file-${idx + 1}`;

            return (
              <div
                key={`old-${idx}`}
                className="relative p-2 border rounded bg-gray-50"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-1"
                >
                  {isImage ? (
                    <img
                      src={url}
                      alt={fileName}
                      className="w-full h-24 object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-24 text-4xl">
                      📄
                    </div>
                  )}
                </a>
                <div className="text-xs text-gray-700 truncate">{fileName}</div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => removeExisting(idx)}
                    className="absolute top-1 right-1 text-red-600 hover:text-red-800"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          {/* 2) รูปใหม่ที่เพิ่งอัปโหลด */}
          {vals.signatureFiles.map((file, idx) => {
            const isImage = file.type.startsWith("image/");
            const sizeKB = (file.size / 1024).toFixed(1);

            // if name already contains a dot, use it; otherwise append the subtype from file.type
            const hasDot = file.name.includes(".");
            const subtype = file.type.split("/")[1] || "";
            const displayName = hasDot ? file.name : `${file.name}.${subtype}`;

            const blobUrl = URL.createObjectURL(file);

            return (
              <div
                key={`new-${idx}`}
                className="relative p-2 border rounded bg-white"
              >
                <a
                  href={blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={!isImage ? displayName : undefined}
                  className="block mb-1"
                >
                  {isImage ? (
                    <img
                      src={blobUrl}
                      alt={displayName}
                      className="w-full h-24 object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-24 text-4xl">
                      📄
                    </div>
                  )}
                </a>
                {/* here we show “name” plus “.subtype” if it was missing */}
                <div className="text-xs text-gray-700 truncate">
                  {displayName}
                </div>
                <div className="text-xs text-gray-500">{sizeKB} KB</div>
                <button
                  type="button"
                  onClick={() => removeNew(idx)}
                  className="absolute top-1 right-1 text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {/* Submit */}
      {canEdit && (
        <div className="text-right">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
          >
            บันทึก ฟปภ04
          </button>
        </div>
      )}
    </form>
  );
}
