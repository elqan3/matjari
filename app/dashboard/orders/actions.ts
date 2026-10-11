"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const validStatuses = [
  "new",
  "processing",
  "completed",
  "cancelled",
] as const;

type OrderStatus = (typeof validStatuses)[number];

export async function updateOrderStatus(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      orderId
    ) ||
    !validStatuses.includes(status as OrderStatus)
  ) {
    redirect("/dashboard/orders?error=invalid");
  }

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (storeError) {
    console.error("Failed to fetch owned store:", storeError);
    redirect("/dashboard/orders?error=server");
  }

  if (!store) {
    redirect("/dashboard/create-store");
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("store_id", store.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Failed to update order status:", updateError);
    redirect("/dashboard/orders?error=server");
  }

  if (!updatedOrder) {
    redirect("/dashboard/orders?error=not_found");
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");

  redirect("/dashboard/orders?success=updated");
}