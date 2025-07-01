"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminListings from "./AdminListings";
import AdminCategories from "./AdmingCategories";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="destructive" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <Tabs defaultValue="listings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <AdminListings />
        </TabsContent>
        <TabsContent value="categories">
          <AdminCategories />
        </TabsContent>
      </Tabs>
    </main>
  );
}
