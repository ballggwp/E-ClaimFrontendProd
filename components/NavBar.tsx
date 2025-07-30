"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

// sanitize helper…
const sanitizeText = (s: string) => s.replace(/[^ก-๙A-Za-z0-9\s]/g, "");

export default function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") return null;

  const userName = session?.user.name ? sanitizeText(session.user.name) : "";
  const userRole = session?.user.role ? sanitizeText(session.user.role) : "";
  const userPosition = session?.user.position
    ? sanitizeText(session.user.position)
    : "";

  const showLoginLink =
    status !== "authenticated" && pathname !== "/claim" && pathname !== "/claim/login";

  // define your nav links
  const navLinks = [
    { href: "/claim/dashboard", label: "Dashboard", show: !!session },
    { href: "/claim/claims", label: "เคลม", show: session?.user != null },
    {
      href: "/claim/fppa04",
      label: "ฟปภ04",
      show: session?.user.role === "INSURANCE",
    },
    { href: "/claim/download", label: "Download", show: session?.user != null },
  ];

  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/claim/dashboard" className="flex items-center space-x-2">
          <Image
            src="/mitrphollogo.png"
            alt="Mitr Phol Logo"
            width={40}
            height={40}
            priority
          />
          <span className="text-xl font-bold text-blue-700">E-Claim</span>
        </Link>

        {/* Primary nav */}
        <div className="flex space-x-4 items-center">
          {navLinks.map(
            ({ href, label, show }) =>
              show && (
                <Link
                  key={href}
                  href={href}
                  className={
                    "px-4 py-2 rounded-md text-sm font-medium transition " +
                    (pathname.startsWith(href)
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-blue-100 hover:text-blue-700")
                  }
                >
                  {label}
                </Link>
              )
          )}
        </div>

        {/* User / Auth */}
        <div className="flex items-center space-x-4">
          {status === "authenticated" && session.user ? (
            <>
              <div className="text-sm text-gray-600">
                เข้าสู่ระบบโดย{" "}
                <span className="font-medium text-gray-800">{userName}</span>{" "}
                <span className="text-gray-500">
                  ({userRole}
                  {userPosition ? `, ${userPosition}` : ""})
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/claim/login" })}
                className="px-4 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-medium transition"
              >
                Logout
              </button>
            </>
          ) : (
            showLoginLink && (
              <Link
                href="/claim/login"
                className="px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm font-medium transition"
              >
                Login
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
