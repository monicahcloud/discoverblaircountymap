import { Pool } from "pg";
import { NextRequest } from "next/server";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  await pool.query("UPDATE categories SET views = views + 1 WHERE id = $1", [
    id,
  ]);
  return new Response("OK");
}
