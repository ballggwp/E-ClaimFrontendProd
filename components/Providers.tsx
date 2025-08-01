// components/Providers.tsx
"use client";
import {jwtDecode} from "jwt-decode";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
function AutoLogout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  useEffect(() => {
    if (session?.user.accessToken) {
      const { exp } = jwtDecode<{ exp: number }>(session.user.accessToken);
      const ms = exp * 1000 - Date.now();
      if (ms > 0) {
        const id = setTimeout(() => {
          signOut({ callbackUrl: "/login" });
        }, ms);
        return () => clearTimeout(id);
      }
    }
  }, [session]);
  return <>{children}</>;
}

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider basePath="/api/auth" refetchInterval={300}>
      <AutoLogout>{children}</AutoLogout>
    </SessionProvider>
  );
}


