import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid multipart form" }, { status: 400 });
  }

  const file = formData.get("file");
  const store = (formData.get("store") as string | null) ?? "kyc-docs";

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { ok: false, error: "Only PDF, JPG, and PNG files are allowed." },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { ok: false, error: "File must be 5 MB or smaller." },
      { status: 400 },
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const key = `${userId}/${randomUUID()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  // In dev: write to /tmp/blobs/{store}/{key} for local testability
  // In prod: write to Netlify Blobs
  if (process.env.NODE_ENV === "development") {
    const tmpPath = path.join("/tmp/blobs", store, key);
    await fs.mkdir(path.dirname(tmpPath), { recursive: true });
    await fs.writeFile(tmpPath, Buffer.from(arrayBuffer));
  } else {
    const { getStore } = await import("@netlify/blobs");
    const blobStore = getStore(store);
    await blobStore.set(key, arrayBuffer);
  }

  const asset = await prisma.asset.create({
    data: {
      store,
      key,
      contentType: file.type,
      sizeBytes: file.size,
      uploadedById: userId,
    },
  });

  return NextResponse.json({ ok: true, data: { assetId: asset.id, key, store } });
}
