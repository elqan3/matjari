
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateStoreSettings(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const description = String(
    formData.get("description") ?? ""
  ).trim();

  if (
    name.length < 1 ||
    name.length > 100 ||
    slug.length < 3 ||
    slug.length > 50 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    description.length > 500
  ) {
    redirect("/dashboard/settings?error=invalid");
  }

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: store, error: readError } = await supabase
    .from("stores")
    .select("id, slug")
    .eq("owner_id", userId)
    .maybeSingle();

  if (readError) {
    console.error("Failed to load store settings:", readError);
    redirect("/dashboard/settings?error=server");
  }

  if (!store) {
    redirect("/dashboard/create-store");
  }

  const { error: updateError } = await supabase
    .from("stores")
    .update({
      name,
      slug,
      description: description || null,
    })
    .eq("id", store.id)
    .eq("owner_id", userId);

  if (updateError) {
    if (updateError.code === "23505") {
      redirect("/dashboard/settings?error=slug_taken");
    }

    console.error("Failed to update store settings:", updateError);
    redirect("/dashboard/settings?error=server");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath(`/store/${store.slug}`);
  revalidatePath(`/store/${slug}`);

  redirect("/dashboard/settings?saved=1");
}