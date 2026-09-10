import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const pool = db();
  const { rows } = await pool.query(
    `select id, kind, status, error, updated_at from events
     where story_id = $1 order by updated_at desc limit 50`,
    [params.id]
  );
  return NextResponse.json({ events: rows });
}
