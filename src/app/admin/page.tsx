// app/admin/page.tsx
"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminListings from "./AdminListings";
import AdminCategories from "./AdmingCategories";

export default function AdminDashboard() {
  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
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
