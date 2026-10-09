
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function fail(message: string): never {
  redirect(`/dashboard/products?error=${message}`);
}

export async function createProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const priceText = String(formData.get("price") ?? "").trim();
  const description = String(
    formData.get("description") ?? ""
  ).trim();
  const categoryId = String(
    formData.get("categoryId") ?? ""
  ).trim();
  const imagePath = String(
    formData.get("imagePath") ?? ""
  ).trim();

  if (!name || name.length > 120) fail("invalid_name");
  if (
    !priceText ||
    !/^\d+(?:\.\d{1,2})?$/.test(priceText) ||
    !Number.isFinite(Number(priceText)) ||
    Number(priceText) < 0
  ) {
    fail("invalid_price");
  }
  if (description.length > 2000) fail("invalid_description");

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
    console.error("Failed to load owned store:", storeError);
    fail("server");
  }

  if (!store) redirect("/dashboard/create-store");

  if (categoryId) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("store_id", store.id)
      .maybeSingle();

    if (categoryError) {
      console.error("Failed to verify category:", categoryError);
      fail("server");
    }

    if (!category) fail("invalid_category");
  }

  let imageUrl: string | null = null;

  if (imagePath) {
    const prefix = `${userId}/${store.id}/`;
    const fileName = imagePath.startsWith(prefix)
      ? imagePath.slice(prefix.length)
      : "";

    if (!/^product-\d+\.(jpg|png|webp)$/.test(fileName)) {
      fail("invalid_image");
    }

    const { data } = supabase.storage
      .from("store-assets")
      .getPublicUrl(imagePath);

    imageUrl = data.publicUrl;
  }

  const { error: insertError } = await supabase
    .from("products")
    .insert({
      store_id: store.id,
      category_id: categoryId || null,
      name,
      description: description || null,
      price: Number(priceText),
      image_url: imageUrl,
    });

  if (insertError) {
    console.error("Failed to create product:", insertError);
    fail("server");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  redirect("/dashboard/products?success=created");
}

export async function uploadProductImage(
  formData: FormData
): Promise<
  | { ok: true; path: string }
  | { ok: false; error: string }
> {
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "اختر صورة أولًا." };
  }

  const extension = IMAGE_TYPES[file.type];

  if (!extension) {
    return {
      ok: false,
      error: "الصيغ المسموحة: JPG وPNG وWebP.",
    };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return {
      ok: false,
      error: "يجب ألا يتجاوز حجم الصورة 2 MB.",
    };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    return { ok: false, error: "انتهت الجلسة. سجّل الدخول مجددًا." };
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (storeError || !store) {
    return { ok: false, error: "تعذر التحقق من ملكية المتجر." };
  }

  const path = `${userId}/${store.id}/product-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("store-assets")
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Product image upload failed:", uploadError);
    return { ok: false, error: "تعذر رفع الصورة. حاول مجددًا." };
  }

  return { ok: true, path };
}