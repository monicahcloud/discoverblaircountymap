import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM locations ORDER BY name ASC"
    );
    client.release();
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      name,
      description,
      website,
      category,
      image,
      address,
      phone,
      latitude,
      longitude,
    } = data;

    const client = await pool.connect();
    const insertQuery = `
      INSERT INTO locations (name, description, website, category, image, address, phone, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const result = await client.query(insertQuery, [
      name,
      description,
      website,
      category,
      image,
      address,
      phone,
      latitude,
      longitude,
    ]);
    client.release();

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      id,
      name,
      description,
      website,
      category,
      image,
      address,
      phone,
      latitude,
      longitude,
    } = data;

    const client = await pool.connect();
    const updateQuery = `
      UPDATE locations
      SET name = $1, description = $2, website = $3, category = $4, image = $5,
          address = $6, phone = $7, latitude = $8, longitude = $9
      WHERE id = $10
      RETURNING *;
    `;
    const result = await client.query(updateQuery, [
      name,
      description,
      website,
      category,
      image,
      address,
      phone,
      latitude,
      longitude,
      id,
    ]);
    client.release();

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update listing" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    const client = await pool.connect();
    const deleteQuery = `DELETE FROM locations WHERE id = $1 RETURNING *`;
    const result = await client.query(deleteQuery, [id]);
    client.release();

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete listing" },
      { status: 500 }
    );
  }
}
