/* eslint-disable @typescript-eslint/no-explicit-any */
// ✅ API ROUTE: /api/admin/categories/import.ts
import { NextRequest, NextResponse } from "next/server";
import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const config = { runtime: "nodejs" };

type Row = { name: string; icon: string; color: string };

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase();
    let rows: Row[] = [];

    if (ext === "csv") {
      rows = parseCsv(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } else if (ext === "xlsx") {
      const wb = XLSX.read(buffer, { type: "buffer" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json<Row>(sheet, { raw: false });
    } else {
      return NextResponse.json(
        { error: "Only .csv or .xlsx files are supported" },
        { status: 415 }
      );
    }

    const valid: Row[] = [];
    const errors: { row: number; message: string }[] = [];

    rows.forEach((row, i) => {
      if (!row.name || !row.icon || !/^#([0-9A-F]{3}){1,2}$/i.test(row.color)) {
        errors.push({ row: i + 2, message: "Invalid or missing fields" });
      } else {
        valid.push(row);
      }
    });

    const values: string[] = [];
    const params: any[] = [];

    valid.forEach(({ name, icon, color }, i) => {
      values.push(`($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`);
      params.push(name, icon, color);
    });

    const query = `INSERT INTO categories (name, icon, color) VALUES ${values.join(
      ","
    )} ON CONFLICT (name) DO NOTHING`;

    const client = await pool.connect();
    if (valid.length) await client.query(query, params);

    // ✅ Log the import attempt
    await client.query(
      `INSERT INTO import_logs (table_name, file_name, success_count, error_count, import_type)
       VALUES ($1, $2, $3, $4, $5)`,
      ["categories", file.name, valid.length, errors.length, "manual"]
    );

    client.release();

    return NextResponse.json({ inserted: valid.length, errors });
  } catch (err) {
    console.error("Import failed", err);
    return NextResponse.json(
      { error: "Server error during import" },
      { status: 500 }
    );
  }
}
