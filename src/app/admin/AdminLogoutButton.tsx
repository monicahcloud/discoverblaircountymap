"use client";

import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="ml-auto px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">
      Logout
    </button>
  );
}
