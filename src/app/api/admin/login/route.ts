// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const isValid =
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD;

  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ message: "Authenticated" });
  res.cookies.set("isAdminAuthed", "true", {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });

  return res;
}
