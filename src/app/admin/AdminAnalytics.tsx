import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type AnalyticsItem = {
  name: string;
  views: number;
  category?: string; // optional for listings
  address?: string; // optional
};

export default function AdminAnalytics() {
  const [topListings, setTopListings] = useState<AnalyticsItem[]>([]);
  const [topCategories, setTopCategories] = useState<AnalyticsItem[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const res = await fetch("/api/admin/analytics");
      const data = await res.json();
      setTopListings(data.topListings);
      setTopCategories(data.topCategories);
    };

    fetchAnalytics();
  }, []);

  return (
    <Tabs
      defaultValue="listings"
      className="w-full justify-center items-center ">
      <TabsList className="mb-4">
        <TabsTrigger value="listings">Top Listings</TabsTrigger>
        <TabsTrigger value="categories">Top Categories</TabsTrigger>
      </TabsList>

      <TabsContent value="listings">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topListings.map((item, i) => (
            <Card key={`${item.name}-${i}`} className="p-4 space-y-2">
              <div className="text-lg font-bold">{item.name}</div>
              {item.category && (
                <div className="text-sm text-muted-foreground">
                  Category: {item.category}
                </div>
              )}
              {item.address && (
                <div className="text-sm text-muted-foreground">
                  {item.address}
                </div>
              )}
              <div className="text-blue-600 font-semibold">
                {item.views} views
              </div>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="categories">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topCategories.map((item, i) => (
            <Card key={`${item.name}-${i}`} className="p-4 space-y-2">
              <div className="text-lg font-bold">{item.name}</div>
              <div className="text-blue-600 font-semibold">
                {item.views} views
              </div>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
