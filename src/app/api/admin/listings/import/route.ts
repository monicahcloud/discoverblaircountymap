/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const config = { runtime: "nodejs" };

type Row = {
  name: string;
  description?: string;
  website?: string;
  category: string;
  image?: string;
  address: string;
  phone?: string;
  latitude: string;
  longitude: string;
};

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase();
    let rows: Row[] = [];

    if (ext === "csv") {
      rows = parseCsv(buf, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } else if (ext === "xlsx") {
      const wb = XLSX.read(buf, { type: "buffer" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json<Row>(sheet, { raw: false });
    } else {
      return NextResponse.json(
        { error: "Only .csv or .xlsx files supported" },
        { status: 415 }
      );
    }

    const valid: Row[] = [];
    const errors: { row: number; message: string }[] = [];

    rows.forEach((r, i) => {
      if (
        !r.name ||
        !r.address ||
        !r.category ||
        isNaN(+r.latitude) ||
        isNaN(+r.longitude)
      ) {
        errors.push({
          row: i + 2,
          message: "Missing required fields or invalid coordinates",
        });
      } else {
        valid.push(r);
      }
    });

    if (!valid.length && errors.length) {
      return NextResponse.json(
        { error: "File contained no valid rows", errors },
        { status: 422 }
      );
    }

    const client = await pool.connect();

    /** Auto-create missing categories */
    const uniqueCategories = [...new Set(valid.map((r) => r.category))];
    const existingRes = await client.query(
      `SELECT name FROM categories WHERE name = ANY($1)`,
      [uniqueCategories]
    );
    const existing = new Set(existingRes.rows.map((r) => r.name));
    const toCreate = uniqueCategories.filter((c) => !existing.has(c));

    if (toCreate.length) {
      await client.query(
        `INSERT INTO categories (name, icon, color) VALUES ${toCreate
          .map((_, i) => `($${i + 1}, 'MapPin', '#6B7280')`)
          .join(",")}`,
        toCreate
      );
    }

    /** Build INSERT */
    const vals: string[] = [];
    const params: any[] = [];
    valid.forEach((r, i) => {
      const base = i * 9;
      vals.push(
        `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${
          base + 6
        },$${base + 7},$${base + 8},$${base + 9})`
      );
      params.push(
        r.name,
        r.description ?? "",
        r.website ?? "",
        r.category,
        r.image ?? "",
        r.address,
        r.phone ?? "",
        r.latitude,
        r.longitude
      );
    });

    await client.query(
      `
      INSERT INTO locations
        (name, description, website, category, image, address, phone, latitude, longitude)
      VALUES ${vals.join(",")}
      ON CONFLICT DO NOTHING
    `,
      params
    );

    /** Log the import */
    await client.query(
      `INSERT INTO import_logs (table_name, file_name, success_count, error_count, import_type)
       VALUES ($1, $2, $3, $4, $5)`,
      ["locations", file.name, valid.length, errors.length, "manual"]
    );

    client.release();

    return NextResponse.json({ inserted: valid.length, errors });
  } catch (err) {
    console.error("POST /api/admin/listings/import failed", err);
    return NextResponse.json(
      { error: "Failed to import listings" },
      { status: 500 }
    );
  }
}
