"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createStore(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const description = String(formData.get("description") ?? "").trim();

  if (
    name.length < 1 ||
    name.length > 100 ||
    slug.length < 3 ||
    slug.length > 50 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    description.length > 500
  ) {
    redirect("/dashboard/create-store?error=invalid");
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    redirect("/login");
  }

  // Enforce one store per account before attempting the insert.
  const { data: existingStore, error: existingError } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to check existing store:", existingError);
    redirect("/dashboard/create-store?error=server");
  }

  if (existingStore) {
    redirect("/dashboard");
  }

  const { error: insertError } = await supabase.from("stores").insert({
    owner_id: userId,
    name,
    slug,
    description: description || null,
  });

  if (insertError) {
    // 23505 is PostgreSQL's unique-constraint violation.
    if (insertError.code === "23505") {
      const { data: storeAfterConflict } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", userId)
        .maybeSingle();

      if (storeAfterConflict) {
        redirect("/dashboard");
      }

      redirect("/dashboard/create-store?error=slug_taken");
    }

    console.error("Failed to create store:", insertError);
    redirect("/dashboard/create-store?error=server");
  }

  redirect("/dashboard");
}
