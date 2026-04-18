import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCreditAccountForUser } from "@/server/queries/credit.queries";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await getCreditAccountForUser(session.user.id);
  return NextResponse.json({ account });
}
