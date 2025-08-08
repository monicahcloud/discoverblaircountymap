import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No valid IDs provided" },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    const deleteQuery = `
      DELETE FROM locations
      WHERE id = ANY($1::int[])
      RETURNING *;
    `;
    const result = await client.query(deleteQuery, [ids]);
    client.release();

    return NextResponse.json({
      deletedCount: result.rowCount,
      deleted: result.rows,
    });
  } catch (error) {
    console.error("Bulk DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete selected listings" },
      { status: 500 }
    );
  }
}
