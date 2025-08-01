// app/claim/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function HomeRedirect() {
  const router = useRouter();
const { status } = useSession();
useEffect(() => {
  console.log(status)
    if (status === "unauthenticated") router.push("/login");
    else router.push("/login");
  }, [status, router]);
  return null;
}

