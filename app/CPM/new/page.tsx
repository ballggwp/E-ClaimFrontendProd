// app/CPM/new/page.tsx
import React, { Suspense } from "react";
import ClientNewCpm from "./ClientNewCpm";

export default function NewCpmPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading form…</p>}>
      <ClientNewCpm />
    </Suspense>
  );
}
