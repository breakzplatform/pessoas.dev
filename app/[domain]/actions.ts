"use server"

import { redirect } from "next/navigation"

import { register } from "@/lib/register"

export async function registerHandle(formData: FormData) {
  const domain = String(formData.get("domain") ?? "")
  const actor = String(formData.get("handle") ?? "")
  const { status, handle } = await register({
    domain,
    actor,
    requested: String(formData.get("new-handle") ?? ""),
  })

  const search = new URLSearchParams({
    handle: actor,
    "new-handle": handle,
    result: status,
  })
  redirect(`?${search}`)
}
