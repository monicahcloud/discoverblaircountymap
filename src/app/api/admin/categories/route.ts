import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM categories ORDER BY name ASC"
    );

    client.release();
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET /api/admin/categories failed", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// export async function POST(req: Request) {
//   try {
//     const { name, icon, color } = await req.json();
//     const client = await pool.connect();
//     await client.query(
//       "INSERT INTO categories (name, icon, color) VALUES ($1, $2, $3)",
//       [name, icon, color]
//     );
//     client.release();
//     return NextResponse.json({ message: "Category added" });
//   } catch (error) {
//     console.error("POST /api/admin/categories failed", error);
//     return NextResponse.json(
//       { error: "Failed to add category" },
//       { status: 500 }
//     );
//   }
// }

// export async function PUT(req: Request) {
//   try {
//     const { name, icon, color } = await req.json();
//     const client = await pool.connect();
//     await client.query(
//       "UPDATE categories SET icon = $1, color = $2 WHERE name = $3",
//       [icon, color, name]
//     );
//     client.release();
//     return NextResponse.json({ message: "Category updated" });
//   } catch (error) {
//     console.error("PUT /api/admin/categories failed", error);
//     return NextResponse.json(
//       { error: "Failed to update category" },
//       { status: 500 }
//     );
//   }
// }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, icon, color } = body;

    console.log("Received POST:", { name, icon, color }); // ← Add this line for debug

    const client = await pool.connect();
    await client.query(
      "INSERT INTO categories (name, icon, color) VALUES ($1, $2, $3)",
      [name, icon, color]
    );
    client.release();

    return NextResponse.json({ message: "Category added" });
  } catch (error) {
    console.error("POST /api/admin/categories failed", error);
    return NextResponse.json(
      { error: "Failed to add category" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, icon, color } = body;

    console.log("Received PUT:", { id, name, icon, color }); // ← Debug

    const client = await pool.connect();
    await client.query(
      "UPDATE categories SET name = $1, icon = $2, color = $3 WHERE id = $4",
      [name, icon, color, id]
    );
    client.release();

    return NextResponse.json({ message: "Category updated" });
  } catch (error) {
    console.error("PUT /api/admin/categories failed", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

import { del } from "@vercel/blob";

export async function DELETE(req: Request) {
  try {
    const { id, icon } = await req.json();
    const client = await pool.connect();

    await client.query("DELETE FROM categories WHERE id = $1", [id]);
    client.release();

    // Delete icon from Vercel Blob Storage
    if (icon) {
      await del(new URL(icon).pathname, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    }

    return NextResponse.json({ message: "Category and icon deleted" });
  } catch (error) {
    console.error("DELETE /api/admin/categories failed", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
