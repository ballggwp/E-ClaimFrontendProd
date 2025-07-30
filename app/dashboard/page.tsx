// app/dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, ReactNode } from "react";
import Link from "next/link";
import { ClaimTimelineWithDates } from "@/components/ClaimTimeline";
import React from "react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { fetchJson } from "@/lib/fetchJson";
interface ClaimSummary {
  statusDates: Record<string, string>;
  createdById: string;
  id: string;
  docNum: string;
  approverId: string;
  categorySub: string;
  cause?: string | null;
  status: string;
  createdAt: string;
  submittedAt: string;
  insurerComment?: string;
  createdByName: string;
}
const STEPS = [
  { code: "DRAFT",                    label: "Draft"     },
  { code: "PENDING_APPROVER_REVIEW",  label: "Approver"  },
  { code: "PENDING_INSURER_REVIEW",   label: "Insurer"   },
  { code: "PENDING_INSURER_FORM",   label: "InsurerForm"   },
  { code: "PENDING_MANAGER_REVIEW",   label: "Manager"   },
  { code: "PENDING_USER_CONFIRM",       label: "Signing"   },
  { code: "COMPLETED",                label: "Done"      },
];
const statusColor = (status: string) => {
  switch (status) {
    case "DRAFT":
      return "bg-gray-200 text-gray-700";
    case "PENDING_APPROVER_REVIEW":
      return "bg-blue-100 text-blue-800";
    case "PENDING_INSURER_REVIEW":
      return "bg-yellow-100 text-yellow-800";
    case "PENDING_MANAGER_REVIEW":
      return "bg-blue-100 text-blue-800";
    case "AWAITING_EVIDENCE":
      return "bg-orange-100 text-orange-800";
    case "PENDING_USER_CONFIRM":
      return "bg-purple-100 text-purple-800";
    case "AWAITING_SIGNATURES":
      return "bg-blue-200 text-blue-900";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "REJECTED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const fppaLinkStatuses = [
  "PENDING_MANAGER_REVIEW",
  "PENDING_USER_CONFIRM",
  "AWAITING_SIGNATURES",
  "COMPLETED",
];

export default function DashboardPage() {
  const ITEMS_PER_PAGE = 5;

// one page state per section
const [draftPage,    setDraftPage]    = useState(1);
const [approverPage, setApproverPage] = useState(1);
const [insurerPage,  setInsurerPage]  = useState(1);
const [managerPage,  setManagerPage]  = useState(1);
const [otherPage,    setOtherPage]    = useState(1);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [claims, setClaims] = useState<ClaimSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return claims;
    return claims.filter((c) =>
      [c.createdByName,c.docNum, c.cause, c.status, c.insurerComment, c.submittedAt].some((f) =>
        f?.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, claims]);

  // redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") router.push("/claim/login");
  }, [status, router]);

  // fetch both created and assigned claims
  useEffect(() => {
    if (status !== "authenticated" || !session) return;
    const { employeeNumber, email, accessToken, role } = session.user;
    const myId = String(employeeNumber);
    const headers = { Authorization: `Bearer ${accessToken}` };

    (async () => {
      setLoading(true);
      try {
        let claimsToSet: ClaimSummary[] = [];

        if (role === "INSURANCE") {
          // Insurers see all pending‐insurer claims
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/claims?status=PENDING_INSURER_REVIEW`,
            { headers }
          );
          if (!res.ok) throw new Error(await res.text());
          const body = await res.json();
          claimsToSet = body.claims;
        } else if (role === "MANAGER") {
          // Managers see all pending‐manager claims
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/claims?status=PENDING_MANAGER_REVIEW`,
            { headers }
          );
          if (!res.ok) throw new Error(await res.text());
          const body = await res.json();
          claimsToSet = body.claims;
        } else {
          // Everyone else: pull both created‐by and approver‐assigned
          const [r1, r2] = await Promise.all([
            fetch(
              `${
                process.env.NEXT_PUBLIC_BACKEND_URL
              }/api/claims?userEmail=${encodeURIComponent(email!)}`,
              { headers }
            ),
            fetch(
              `${
                process.env.NEXT_PUBLIC_BACKEND_URL
              }/api/claims?approverId=${encodeURIComponent(myId)}`,
              { headers }
            ),
          ]);
          if (!r1.ok) throw new Error(await r1.text());
          if (!r2.ok) throw new Error(await r2.text());
          const b1 = await r1.json();
          const b2 = await r2.json();
          // dedupe by id
          const all = [...b1.claims, ...b2.claims];
          const unique: ClaimSummary[] = [];
          all.forEach((c) => {
            if (!unique.find((x) => x.id === c.id)) unique.push(c);
          });
          claimsToSet = unique;
        }

        setClaims(claimsToSet);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, session]);

  // loading / error states
  if (status === "loading" || loading) return <p className="p-6">Loading…</p>;
  if (error) return <p className="p-6 text-red-600">Error: {error}</p>;
  if (!session) return <p className="p-6">Redirecting…</p>;

  const { employeeNumber, role, name } = session.user;
  const myId = String(employeeNumber);
  const userName = session.user.name;
  const isInsurer = role === "INSURANCE";
  const isManager = role === "MANAGER";

  // split into sections
  const draftClaims = filtered.filter(
    (c) => c.status === "DRAFT" && c.createdByName === userName
  );
  const totalDraftPages = Math.ceil(draftClaims.length / ITEMS_PER_PAGE);
const pagedDraft     = draftClaims.slice(
  (draftPage - 1) * ITEMS_PER_PAGE,
  draftPage * ITEMS_PER_PAGE
);
  const pendingApprover = filtered.filter(
    (c) => c.status === "PENDING_APPROVER_REVIEW" && c.approverId === myId
  );
  const totalApproverPages = Math.ceil(pendingApprover.length / ITEMS_PER_PAGE);
const pagedApprover      = pendingApprover.slice(
  (approverPage - 1) * ITEMS_PER_PAGE,
  approverPage * ITEMS_PER_PAGE
);
  const pendingInsurer = filtered.filter(
    (c) => c.status === "PENDING_INSURER_REVIEW"
  );
  const totalInsurerPages = Math.ceil(pendingInsurer.length / ITEMS_PER_PAGE);
const pagedInsurer      = pendingInsurer.slice(
  (insurerPage - 1) * ITEMS_PER_PAGE,
  insurerPage * ITEMS_PER_PAGE
);
  const pendingConfirm = filtered.filter(
    (c) => c.status === "PENDING_MANAGER_REVIEW"
  );
  const totalManagerPages = Math.ceil(pendingConfirm.length / ITEMS_PER_PAGE);
const pagedManager      = pendingConfirm.slice(
  (managerPage - 1) * ITEMS_PER_PAGE,
  managerPage * ITEMS_PER_PAGE
);
  const otherClaims = filtered.filter((c) => {
    // exclude drafts
    if (c.status === "DRAFT"||c.status === "REJECTED"||c.status === "COMPLETED") return false;
    // exclude pending-approver if assigned to me
    if (c.status === "PENDING_APPROVER_REVIEW" && c.approverId === myId)
      return false;
    // insurers should not see pending-insurer-review
    if (
      (role === "INSURANCE" && (c.status === "PENDING_INSURER_REVIEW"||c.status === "PENDING_APPROVER_REVIEW"))
    )
      return false;

    // managers should not see pending-manager-review
    if (role === "MANAGER" && c.status === "PENDING_MANAGER_REVIEW")
      return false;
    // normal users only see their own claims
    if (role !== "INSURANCE" && role !== "MANAGER") {
      return c.createdByName === userName;
    }
    // otherwise show remaining claims
    return true;
  });
  const totalOtherPages = Math.ceil(otherClaims.length / ITEMS_PER_PAGE);
const pagedOther      = otherClaims.slice(
  (otherPage - 1) * ITEMS_PER_PAGE,
  otherPage * ITEMS_PER_PAGE
);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8 space-y-10">
          <header className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">เคลมของคุณ</h1>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-300 px-3 py-1 rounded focus:outline-none focus:border-blue-500"
              />
              <Link
                href="/claim/claims/new"
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
              >
                + สร้างเคลมใหม่
              </Link>
            </div>
          </header>

          {draftClaims.length > 0 && (
  <section className="space-y-4">
    <Section
      title="ร่าง (Draft)"
      claims={pagedDraft}
      emptyText="ไม่มีร่างเคลม"
    />
    <Pagination
      page={draftPage}
      totalPages={totalDraftPages}
      onChange={setDraftPage}
    />
  </section>
)}

{pendingApprover.length > 0 && (
  <section className="space-y-4">
    <Section
      title="เคลมที่รอคุณอนุมัติ"
      claims={pagedApprover}
      emptyText="ไม่มีรายการที่ต้องอนุมัติ"
    />
    <Pagination
      page={approverPage}
      totalPages={totalApproverPages}
      onChange={setApproverPage}
    />
  </section>
)}

{isInsurer && pendingInsurer.length > 0 && (
  <section className="space-y-4">
    <Section
      title="รอตรวจสอบประกัน (Pending Insurer)"
      claims={pagedInsurer}
      emptyText="ไม่มีรอตรวจสอบ"
    />
    <Pagination
      page={insurerPage}
      totalPages={totalInsurerPages}
      onChange={setInsurerPage}
    />
  </section>
)}

{isManager && pendingConfirm.length > 0 && (
  <section className="space-y-4">
    <Section
      title="เคลมที่รอคุณยืนยัน"
      claims={pagedManager}
      emptyText="ไม่มีรายการให้ยืนยัน"
    />
    <Pagination
      page={managerPage}
      totalPages={totalManagerPages}
      onChange={setManagerPage}
    />
  </section>
)}

{otherClaims.length > 0 && (
  <section className="space-y-4">
    <Section
      title="เคลมกำลังดำเนินการ"
      claims={pagedOther}
      emptyText="ไม่มีรายการ"
    />
    <Pagination
      page={otherPage}
      totalPages={totalOtherPages}
      onChange={setOtherPage}
    />
  </section>
)}
        </div>
      </div>
    </div>
  );
}
function Section({
  title,
  claims,
  emptyText,
}: {
  title: string;
  claims: ClaimSummary[];
  emptyText: string;
}) {
  if (!claims.length) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
        <p className="p-6 text-gray-500">{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="space-y-10">
      <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
      <div className="space-y-6">
        {claims.map((c) => {
          // compute days passed
          
          // compute next status label
          const STEPS = [
            "SUBMITTED",
            "PENDING_APPROVER_REVIEW",
            "PENDING_INSURER_REVIEW",
            "PENDING_INSURER_FORM",
            "PENDING_MANAGER_REVIEW",
            "PENDING_USER_CONFIRM",
            "COMPLETED",
          ];
          const idx = STEPS.indexOf(c.status);
          const nextLabel =
            idx >= 0 && idx < STEPS.length - 1
              ? STEPS[idx + 1]
                  .split("_")
                  .map((w) => w[0] + w.slice(1).toLowerCase())
                  .join(" ")
              : "—";
          const currIdx = STEPS.indexOf(c.status);

// 3) helper to safely read from your statusDates map:
const getDate = (code: string) => {
  const iso = c.statusDates[code];
  return iso ? parseISO(iso) : null;
};

let daysPassed = 0;
if (c.status === "COMPLETED") {
  // completed: days between when you submitted and when you completed
  const manager = (getDate(STEPS[5]));
  const done      = getDate("COMPLETED");
  if (manager && done) {
    daysPassed = differenceInCalendarDays(done, manager);
  }
} else if (currIdx > 0) {
  // in‐flight: days between previous step and this step
  const prevDate = getDate(STEPS[currIdx - 1]);
  const currDate = getDate(c.status);
  if (prevDate && currDate) {
    daysPassed = differenceInCalendarDays(currDate, prevDate);
  }
} else {
  // still in DRAFT: days since creation
  daysPassed = differenceInCalendarDays(new Date(), new Date(c.createdAt));
}
          return (
            <div
              key={c.id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition p-6"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <Link
                  href={`/claim/claims/cpm/${c.id}`}
                  className="text-xl text-blue-600 font-semibold hover:underline"
                >
                  {c.docNum}
                </Link>
                <span
                  className={`
                    px-3 py-1 rounded-full text-xs font-semibold
                    ${statusColor(c.status)}
                  `}
                >
                  {c.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Timeline */}
              <ClaimTimelineWithDates
                statusDates={c.statusDates}
                currentStatus={c.status}
              />

              {/* Details grid */}
              <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <dt className="font-medium text-gray-600">Created By</dt>
                  <dd className="mt-1 text-gray-900">{c.createdByName}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Cause</dt>
                  <dd className="mt-1 text-gray-900">{c.cause ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">จำนวนวัน</dt>
                  <dd className="mt-1 text-gray-900">{daysPassed}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Comment</dt>
                  <dd className="mt-1 text-gray-900">
                    {c.insurerComment ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">FPPA-04</dt>
                  <dd className="mt-1">
                    {fppaLinkStatuses.includes(c.status) ? (
                      <Link
                        href={`/claim/fppa04/${c.categorySub}/${c.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        ดูฟอร์ม
                      </Link>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center items-center space-x-4 mt-4">
      <button
        onClick={() => onChange(Math.max(page - 1, 1))}
        disabled={page === 1}
        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onChange(Math.min(page + 1, totalPages))}
        disabled={page === totalPages}
        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}


