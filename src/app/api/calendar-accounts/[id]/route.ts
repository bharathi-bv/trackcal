import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import {
  deleteCalendarAccount,
  setWriteCalendarAccount,
  updateCalendarAccountIds,
  syncWriteAccountToHostSettings,
  type CalendarAccount,
} from "@/lib/calendar-accounts";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const db = createServerClient();
    const newWrite = await deleteCalendarAccount(id, db);
    await syncWriteAccountToHostSettings(newWrite, db);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = (await req.json()) as { is_write?: boolean; calendar_ids?: string[] };
    const db = createServerClient();

    if (body.is_write === true) {
      const account = await setWriteCalendarAccount(id, db);
      await syncWriteAccountToHostSettings(account, db);
    }

    if (body.calendar_ids) {
      await updateCalendarAccountIds(id, body.calendar_ids, db);
      // If this is the write account, sync host_settings
      const { data } = await db
        .from("calendar_accounts")
        .select("*")
        .eq("id", id)
        .single();
      if ((data as CalendarAccount)?.is_write_calendar) {
        await syncWriteAccountToHostSettings(data as CalendarAccount, db);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
