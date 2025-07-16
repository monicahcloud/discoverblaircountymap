// src/app/api/track-view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: NextRequest) {
  const { type, name } = await req.json();

  if (!type || !name || !["location", "category"].includes(type)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const table = type === "location" ? "locations" : "categories";

  try {
    const client = await pool.connect();
    await client.query(
      `UPDATE ${table} SET view_count = COALESCE(view_count, 0) + 1 WHERE name = $1`,
      [name]
    );
    client.release();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Tracking error:", err);
    return NextResponse.json(
      { error: "Failed to track view" },
      { status: 500 }
    );
  }
}
