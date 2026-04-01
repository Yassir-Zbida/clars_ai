import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { isAdminEmail } from "@/lib/admin"

export async function requireAdminUser() {
  const session = await auth()
  const email = session?.user?.email ?? null
  if (!isAdminEmail(email)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { email: email! }
}
