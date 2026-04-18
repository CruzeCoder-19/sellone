import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import fs from "fs/promises";
import path from "path";

const PRIVATE_STORES = ["kyc-docs"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ store: string; key: string[] }> },
) {
  const { store, key: keySegments } = await params;
  const key = keySegments.join("/");

  if (PRIVATE_STORES.includes(store)) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const asset = await prisma.asset.findUnique({
      where: { store_key: { store, key } },
    });

    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Must be the uploader or have an elevated role
    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.user.id },
      select: { role: true },
    });
    const roles = userRoles.map((r) => r.role);
    const isOwner = asset.uploadedById === session.user.id;
    const isElevated = roles.some((r) => ["EMPLOYEE", "SALES", "ADMIN"].includes(r));

    if (!isOwner && !isElevated) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let bytes: Buffer;
    if (process.env.NODE_ENV === "development") {
      const tmpPath = path.join("/tmp/blobs", store, key);
      try {
        bytes = await fs.readFile(tmpPath);
      } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    } else {
      const { getStore } = await import("@netlify/blobs");
      const blobStore = getStore(store);
      const blob = await blobStore.get(key, { type: "arrayBuffer" });
      if (!blob) return NextResponse.json({ error: "Not found" }, { status: 404 });
      bytes = Buffer.from(blob);
    }

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "private, no-store",
      },
    });
  }

  return NextResponse.json({ error: "Use the CDN URL for public stores" }, { status: 400 });
}
