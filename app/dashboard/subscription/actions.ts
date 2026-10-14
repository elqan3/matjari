"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlanCode } from "@/lib/subscriptions";

export async function requestSubscriptionPlan(formData: FormData) {
  const planCode = String(formData.get("planCode") ?? "");
  if (!isPlanCode(planCode)) redirect("/dashboard/subscription?error=invalid");

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/login");

  const { data: store, error: storeError } = await supabase
    .from("stores").select("id").eq("owner_id", userId).maybeSingle();
  if (storeError || !store) redirect("/dashboard/create-store");

  const { data: subscription } = await supabase
    .from("store_subscriptions").select("status, plan_code, ends_at, trial_ends_at")
    .eq("store_id", store.id).maybeSingle();

  if (subscription?.status === "active" && subscription.ends_at &&
      new Date(subscription.ends_at).getTime() > Date.now()) {
    redirect("/dashboard/subscription?error=already_active");
  }

  const { error } = await supabase.from("subscription_plan_requests").insert({
    store_id: store.id,
    requested_plan: planCode,
  });

  if (error) {
    if (error.code === "23505") redirect("/dashboard/subscription?error=pending");
    console.error("Failed to request subscription plan:", error.message);
    redirect("/dashboard/subscription?error=save");
  }

  revalidatePath("/dashboard/subscription");
  revalidatePath("/admin/subscriptions");
  redirect("/dashboard/subscription?requested=1");
}