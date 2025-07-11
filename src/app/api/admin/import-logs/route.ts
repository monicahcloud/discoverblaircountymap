// src/app/api/admin/import-logs/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Remove the unused parameter
export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query(
      `SELECT id, table_name, file_name, success_count, error_count, import_type, created_at
         FROM import_logs
         ORDER BY created_at DESC
         LIMIT 100`
    );
    client.release();
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch import logs", err);
    return NextResponse.json(
      { error: "Failed to fetch import logs" },
      { status: 500 }
    );
  }
}
