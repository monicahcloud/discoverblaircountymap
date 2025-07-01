"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveAs } from "file-saver";
import { ColorPicker } from "../components/ColorPicker";

// Types
interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

const initialFormState: Omit<Category, "id"> = {
  name: "",
  icon: "",
  color: "#4B5563", // default gray
};

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    setCategories(data);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const method = editingId ? "PUT" : "POST";
    const res = await fetch("/api/admin/categories", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, id: editingId }),
    });
    if (res.ok) {
      await fetchCategories();
      setDialogOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
    }
  };

  const handleEdit = (cat: Category) => {
    setFormData({ name: cat.name, icon: cat.icon, color: cat.color });
    setEditingId(cat.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const res = await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) await fetchCategories();
  };

  const handleExportCSV = () => {
    const headers = "name,icon,color\n";
    const rows = categories
      .map((c) => `"${c.name}","${c.icon}","${c.color}"`)
      .join("\n");
    const blob = new Blob([headers + rows], {
      type: "text/csv;charset=utf-8;",
    });
    saveAs(blob, "categories.csv");
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Categories</h1>
        <Button onClick={handleExportCSV}>Export CSV</Button>
      </div>

      <Input
        placeholder="Search categories..."
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
              setEditingId(null);
              setDialogOpen(true);
            }}>
            Add Category
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogTitle className="mb-4">
            {editingId ? "Edit Category" : "Add New Category"}
          </DialogTitle>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="icon">
                Icon (Lucide){" "}
                <a
                  href="https://lucide.dev/icons"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline ml-1">
                  (browse icons)
                </a>
              </Label>
              <Input
                id="icon"
                name="icon"
                value={formData.icon}
                onChange={handleChange}
                placeholder="e.g. Mountain, MapPin, Star"
              />
            </div>

            <ColorPicker
              value={formData.color}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, color: val }))
              }
            />

            <Button type="submit" className="mt-2">
              {editingId ? "Update" : "Add"} Category
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <table className="w-full text-sm border border-gray-300 mt-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Icon</th>
            <th className="p-2 text-left">Color</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCategories.map((cat) => (
            <tr key={cat.id} className="border-t">
              <td className="p-2 font-medium">{cat.name}</td>
              <td className="p-2">{cat.icon}</td>
              <td className="p-2">
                <span
                  className="inline-block w-4 h-4 mr-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.color}
              </td>
              <td className="p-2">
                <Button variant="link" onClick={() => handleEdit(cat)}>
                  Edit
                </Button>
                <Button
                  variant="link"
                  className="text-red-600"
                  onClick={() => handleDelete(cat.id)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
