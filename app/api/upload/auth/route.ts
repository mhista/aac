import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getProfile } from "@/lib/auth/session";
import { canWrite } from "@/lib/auth/permissions";

/**
 * Upload credentials for the browser.
 *
 * Files go straight from the person's phone to ImageKit — they never pass
 * through this server. That matters for two reasons: a serverless function
 * caps request bodies at a few megabytes (a single phone video would exceed
 * it), and a coordinator on a bad connection should not wait for a round trip
 * through Vercel before the upload even starts.
 *
 * ImageKit allows that by accepting a signature this route generates with the
 * private key. The signature is valid for a few minutes and for nothing else —
 * the private key itself never leaves the server.
 *
 * GATED. Without the permission check, anyone who found this URL could get
 * credentials to upload anything into AAC's media account.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getProfile();
  if (!profile || !canWrite(profile)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  if (!privateKey || !publicKey) {
    return NextResponse.json(
      { error: "Uploads are not configured on this server yet." },
      { status: 503 }
    );
  }

  const token = crypto.randomUUID();
  /* Ten minutes: long enough for a large video on a slow connection, short
     enough that a leaked token is worthless by the time anyone finds it.
     ImageKit refuses anything more than an hour out. */
  const expire = Math.floor(Date.now() / 1000) + 60 * 10;

  const signature = crypto
    .createHmac("sha1", privateKey)
    .update(token + expire)
    .digest("hex");

  return NextResponse.json(
    { token, expire, signature, publicKey },
    { headers: { "Cache-Control": "no-store" } }
  );
}
