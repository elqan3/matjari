
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getOwnedStoreId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (storeError) {
    console.error("Failed to load owned store:", storeError);
    redirect("/dashboard/categories?error=server");
  }

  if (!store) {
    redirect("/dashboard/create-store");
  }

  return { supabase, storeId: store.id };
}

function readName(formData: FormData) {
  return String(formData.get("name") ?? "").trim();
}

function readCategoryId(formData: FormData) {
  return String(formData.get("categoryId") ?? "").trim();
}

function validateName(name: string) {
  return name.length >= 1 && name.length <= 80;
}

function handleCategoryError(code?: string) {
  if (code === "23505") {
    redirect("/dashboard/categories?error=duplicate");
  }

  console.error("Category operation failed:", code);
  redirect("/dashboard/categories?error=server");
}

export async function createCategory(formData: FormData) {
  const name = readName(formData);

  if (!validateName(name)) {
    redirect("/dashboard/categories?error=invalid");
  }

  const { supabase, storeId } = await getOwnedStoreId();

  const { error } = await supabase.from("categories").insert({
    store_id: storeId,
    name,
  });

  if (error) handleCategoryError(error.code);

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard");
  redirect("/dashboard/categories?success=created");
}

export async function updateCategory(formData: FormData) {
  const name = readName(formData);
  const categoryId = readCategoryId(formData);

  if (!validateName(name) || !categoryId) {
    redirect("/dashboard/categories?error=invalid");
  }

  const { supabase, storeId } = await getOwnedStoreId();

  const { data, error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", categoryId)
    .eq("store_id", storeId)
    .select("id")
    .maybeSingle();

  if (error) handleCategoryError(error.code);

  if (!data) {
    redirect("/dashboard/categories?error=not_found");
  }

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard");
  redirect("/dashboard/categories?success=updated");
}

export async function deleteCategory(formData: FormData) {
  const categoryId = readCategoryId(formData);

  if (!categoryId) {
    redirect("/dashboard/categories?error=invalid");
  }

  const { supabase, storeId } = await getOwnedStoreId();

  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("store_id", storeId)
    .select("id")
    .maybeSingle();

  if (error) handleCategoryError(error.code);

  if (!data) {
    redirect("/dashboard/categories?error=not_found");
  }

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard");
  redirect("/dashboard/categories?success=deleted");
}