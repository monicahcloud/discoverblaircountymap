import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.redirect("/admin/login");
  response.cookies.set("isAdminAuthed", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0), // expires immediately
  });
  return response;
}
