"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveAs } from "file-saver";
import { Textarea } from "@/components/ui/textarea";

// Types
type Location = {
  id: number;
  name: string;
  description: string;
  website: string;
  category: string;
  image: string;
  address: string;
  phone: string;
  latitude: string;
  longitude: string;
};

type FormData = Omit<Location, "id"> & { id: number | null };

const initialFormState: FormData = {
  id: null,
  name: "",
  description: "",
  website: "",
  category: "",
  image: "",
  address: "",
  phone: "",
  latitude: "",
  longitude: "",
};

export default function AdminListings() {
  const [listings, setListings] = useState<Location[]>([]);
  const [formData, setFormData] = useState<FormData>(initialFormState);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState<string>("");

  const handleLogin = async () => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginForm),
    });
    if (res.ok) {
      localStorage.setItem("admin_logged_in", "true");
      setLoggedIn(true);
      fetchListings();
    } else {
      setLoginError("Invalid credentials");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = localStorage.getItem("admin_logged_in");
      if (auth === "true") {
        setLoggedIn(true);
        fetchListings();
      }
    }
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/listings");
    const data: Location[] = await res.json();
    setListings(data);
    setLoading(false);
  };

  const validateForm = (data: FormData) => {
    const errors: Record<string, string> = {};
    if (!data.name) errors.name = "Name is required.";
    if (!data.address) errors.address = "Address is required.";
    if (!data.category) errors.category = "Category is required.";
    if (!data.latitude || isNaN(Number(data.latitude)))
      errors.latitude = "Latitude must be a number.";
    if (!data.longitude || isNaN(Number(data.longitude)))
      errors.longitude = "Longitude must be a number.";
    return errors;
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    const method = isEditing ? "PUT" : "POST";
    const res = await fetch("/api/admin/listings", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      await fetchListings();
      setFormData(initialFormState);
      setIsEditing(false);
      setDialogOpen(false);
      setFormErrors({});
    }
  };

  const handleEdit = (listing: Location) => {
    setFormData(listing);
    setIsEditing(true);
    setDialogOpen(true);
    setFormErrors({});
  };

  const handleDelete = async (id: number) => {
    const res = await fetch("/api/admin/listings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      await fetchListings();
    }
  };

  const handleExportCSV = () => {
    const headers = Object.keys(listings[0] || {}).join(",") + "\n";
    const rows = listings
      .map((loc) =>
        Object.values(loc)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([headers + rows], {
      type: "text/csv;charset=utf-8;",
    });
    saveAs(blob, "locations.csv");
  };

  const filteredListings = listings.filter((listing) => {
    const q = searchQuery.toLowerCase();
    return (
      listing.name.toLowerCase().includes(q) ||
      listing.category.toLowerCase().includes(q) ||
      listing.address.toLowerCase().includes(q)
    );
  });

  if (!loggedIn) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-muted">
        <Card className="w-[320px] p-4">
          <CardContent className="space-y-4">
            <h2 className="text-xl font-bold">Admin Login</h2>
            <Input
              placeholder="Username"
              name="username"
              value={loginForm.username}
              onChange={(e) =>
                setLoginForm({ ...loginForm, username: e.target.value })
              }
            />
            <Input
              //   type="password"
              placeholder="Password"
              name="password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
            />
            {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
            <Button className="w-full" onClick={handleLogin}>
              Log In
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Listings</h1>
        <Button onClick={handleExportCSV}>Export CSV</Button>
      </div>

      <Input
        placeholder="Search by name, category, or address..."
        className="mb-4"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            className="mb-4"
            onClick={() => {
              setFormData(initialFormState);
              setIsEditing(false);
              setDialogOpen(true);
              setFormErrors({});
            }}>
            Add New Listing
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogTitle>
            {isEditing ? "Edit Listing" : "Add New Listing"}
          </DialogTitle>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            {(Object.keys(initialFormState) as (keyof FormData)[]).map(
              (field) =>
                field !== "id" && (
                  <div key={field}>
                    <Label htmlFor={field}>
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </Label>
                    {field === "description" ? (
                      <Textarea
                        id={field}
                        name={field}
                        value={formData[field] || ""}
                        onChange={handleChange}
                      />
                    ) : (
                      <Input
                        id={field}
                        name={field}
                        value={formData[field] || ""}
                        onChange={handleChange}
                      />
                    )}
                    {formErrors[field] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors[field]}
                      </p>
                    )}
                  </div>
                )
            )}
            <Button type="submit">
              {isEditing ? "Update" : "Add"} Listing
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <p>Loading listings...</p>
      ) : (
        <table className="w-full text-sm border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Address</th>
              <th className="text-left p-2">Website</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredListings.map((listing) => (
              <tr key={listing.id} className="border-t">
                <td className="p-2 font-medium">{listing.name}</td>
                <td className="p-2">{listing.category}</td>
                <td className="p-2 text-sm text-muted-foreground">
                  {listing.address}
                </td>
                <td className="p-2 text-sm truncate max-w-[180px]">
                  {listing.website}
                </td>
                <td className="p-2">
                  <Button variant="link" onClick={() => handleEdit(listing)}>
                    Edit
                  </Button>
                  <Button
                    variant="link"
                    className="text-red-600"
                    onClick={() => handleDelete(listing.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
