import { NextResponse } from "next/server";

export async function POST(req) {
  const { password } = await req.json();
  if (password !== process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("dashboard_auth", password, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
