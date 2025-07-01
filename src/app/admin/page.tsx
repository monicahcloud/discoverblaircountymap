import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAdminAuthed = cookieStore.get("isAdminAuthed")?.value === "true";

  if (!isAdminAuthed) {
    redirect("/admin/login");
  }

  return <AdminDashboard />;
}
