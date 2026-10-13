"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isPlanCode } from "@/lib/subscriptions";

function getAdminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing server-side Supabase admin configuration.");
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || user.email?.trim().toLowerCase() !== adminEmail) redirect("/dashboard");
}

export async function updateStoreSubscription(formData: FormData) {
  await requireAdmin();

  const storeId = String(formData.get("storeId") ?? "").trim();
  const status = String(formData.get("status") ?? "trial");
  const planCode = String(formData.get("planCode") ?? "");
  const duration = Number(formData.get("durationDays") ?? 30);
  const adminNote = String(formData.get("adminNote") ?? "").trim().slice(0, 500);

  if (!/^[0-9a-f-]{36}$/i.test(storeId) ||
      !["trial", "active", "suspended"].includes(status) ||
      ![30, 90, 365].includes(duration) ||
      (status === "active" && !isPlanCode(planCode)) ||
      (status !== "active" && planCode && !isPlanCode(planCode))) {
    redirect("/admin/subscriptions?error=invalid");
  }

  const db = getAdminDb();
  const now = new Date();
  const update: Record<string, unknown> = {
    status,
    plan_code: status === "active" ? planCode : null,
    admin_note: adminNote || null,
    updated_at: now.toISOString(),
  };

  if (status === "active") {
    update.started_at = now.toISOString();
    update.ends_at = new Date(now.getTime() + duration * 86400000).toISOString();
  } else if (status === "trial") {
    update.trial_ends_at = new Date(now.getTime() + 30 * 86400000).toISOString();
    update.started_at = null;
    update.ends_at = null;
  }

  const { error } = await db.from("store_subscriptions").update(update).eq("store_id", storeId);
  if (error) {
    console.error("Failed to update store subscription:", error.message);
    redirect("/admin/subscriptions?error=save");
  }

  if (status === "active") {
    await db.from("subscription_plan_requests")
      .update({ status: "approved", reviewed_at: now.toISOString() })
      .eq("store_id", storeId)
      .eq("status", "pending");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/dashboard/subscription");
  revalidatePath("/dashboard/products");
  redirect("/admin/subscriptions?saved=1");
}