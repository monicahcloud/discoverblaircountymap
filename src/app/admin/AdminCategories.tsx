"use client";

import { useEffect, useState, ChangeEvent, FormEvent, useRef } from "react";
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
import { toast } from "sonner";
import Image from "next/image";

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

const initialFormState: Omit<Category, "id"> = {
  name: "",
  icon: "",
  color: "#4B5563",
};

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [importResult, setImportResult] = useState<null | {
    inserted: number;
    errors: { row: number; message: string }[];
  }>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  const triggerFilePicker = () => fileInputRef.current?.click();

  const validateForm = (data: Omit<Category, "id">) => {
    const errors: Record<string, string> = {};
    if (!data.name) errors.name = "Name is required.";
    if (!data.icon) errors.icon = "Icon is required.";
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(data.color))
      errors.color = "Color must be a valid hex code.";
    return errors;
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-icon", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Import failed");
      setImportResult(result);
      await fetchCategories();
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setIconPreview(result);
        setFormData((prev) => ({ ...prev, icon: "" })); // Clear raw icon if file is selected
      }
    };
    reader.readAsDataURL(file);
  };
  const handleSVGInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, icon: value }));
    setIconPreview(value);
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File;
    const name = form.get("name")?.toString() || "";
    const color = formData.color;

    let iconUrl = formData.icon;

    try {
      if (file && file.name) {
        if (editingId) {
          const existing = categories.find((c) => c.id === editingId);
          const isBlob = existing?.icon?.startsWith(
            "https://blob.vercel-storage.com"
          );

          if (isBlob && existing?.icon) {
            await fetch("/api/upload-icon", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: existing.icon }),
            });
          }
        }

        const iconFormData = new FormData();
        iconFormData.append("file", file);

        const uploadRes = await fetch("/api/upload-icon", {
          method: "POST",
          body: iconFormData,
        });

        const { url } = await uploadRes.json();
        iconUrl = url;
      }

      // ✅ Use validateForm
      const errors = validateForm({ name, color, icon: iconUrl });
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
      const payload = {
        name,
        color,
        icon: iconUrl,
      };

      const method = editingId ? "PUT" : "POST";

      const res = await fetch("/api/admin/categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: editingId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save category.");
        return;
      }

      // On success
      toast.success(
        `Category ${editingId ? "updated" : "added"} successfully!`
      );
      await fetchCategories();
      setFormData(initialFormState);
      setEditingId(null);
      setFormErrors({});
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setSaving(false); // ← Stop spinner
    }
  }

  const handleEdit = (cat: Category) => {
    setFormData({ name: cat.name, icon: cat.icon, color: cat.color });
    setEditingId(cat.id);
    setDialogOpen(true);
    setFormErrors({});
  };

  const handleDelete = async (id: number) => {
    const category = categories.find((c) => c.id === id);
    const isBlob = category?.icon?.startsWith(
      "https://blob.vercel-storage.com"
    );

    const res = await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      if (isBlob && category?.icon) {
        // Attempt to delete the file from Blob storage
        await fetch("/api/upload-icon", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: category.icon }),
        });
      }
      toast.success("Category deleted");
      await fetchCategories();
    } else {
      toast.error("Failed to delete category.");
    }
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
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Categories</h1>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button onClick={triggerFilePicker} disabled={importing}>
            {importing ? "Importing…" : "Import CSV / Excel"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      {importResult && (
        <div className="my-4 p-4 border rounded-md bg-gray-50 text-sm">
          {importResult.inserted} row(s) imported.
          {importResult.errors.length > 0 && (
            <>
              <p className="text-red-600 mt-2 font-medium">
                {importResult.errors.length} row(s) had errors:
              </p>
              <ul className="list-disc pl-6 text-red-500">
                {importResult.errors.map((err) => (
                  <li key={err.row}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

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
              setFormErrors({});
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
              {formErrors.name && (
                <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="file">Upload Icon (SVG, PNG, JSX)</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".svg,.png,.jsx"
                onChange={handleFileChange}
              />
              <Label htmlFor="svgInput" className="text-center mt-5">
                Or <br /> Paste Raw SVG Code (Optional){" "}
                <a
                  href="https://lucide.dev/icons"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline ml-1">
                  (Browse icons)
                </a>
                <br />
                <p className="text-xs text-muted-foreground mt-1">
                  Click an icon, then copy the SVG and paste it below.
                </p>
              </Label>
              <textarea
                id="svgCode"
                name="icon"
                rows={7}
                className="w-full p-2 border rounded-md font-mono"
                value={formData.icon}
                onChange={handleSVGInputChange}
                placeholder="<svg viewBox=...>...</svg>"
              />
            </div>
            {iconPreview && (
              <div className="border p-3 rounded bg-white">
                <Label>Icon Preview</Label>
                <div className="w-12 h-12 mt-2">
                  {iconPreview.startsWith("<svg") ? (
                    <div dangerouslySetInnerHTML={{ __html: iconPreview }} />
                  ) : (
                    <Image
                      src={iconPreview}
                      alt="Icon preview"
                      width={48}
                      height={48}
                      className="rounded"
                    />
                  )}
                </div>
              </div>
            )}

            <ColorPicker
              value={formData.color}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, color: val }))
              }
            />
            {formErrors.color && (
              <p className="text-red-500 text-xs mt-1">{formErrors.color}</p>
            )}
            <Button type="submit" className="mt-2" disabled={saving}>
              {saving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>Saving...
                </>
              ) : editingId ? (
                "Update"
              ) : (
                "Add Category"
              )}
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
