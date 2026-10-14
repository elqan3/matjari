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

function isValidPrice(value: string): boolean {
return (
/^\d+(?:\.\d{1,2})?$/.test(value) &&
Number.isFinite(Number(value))
);
}

function isValidProductId(value: string): boolean {
return /^[0-9a-f-]{36}$/i.test(value);
}

async function getOwnedStore() {
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

if (!store) {
redirect("/dashboard/create-store");
}

return { supabase, userId, store };
}

async function validateCategory(
supabase: Awaited<ReturnType<typeof createClient>>,
categoryId: string,
storeId: string
) {
if (!categoryId) return;

const { data: category, error } = await supabase
.from("categories")
.select("id")
.eq("id", categoryId)
.eq("store_id", storeId)
.maybeSingle();

if (error) {
console.error("Failed to verify category:", error);
fail("server");
}

if (!category) {
fail("invalid_category");
}
}

function validateImagePath(
imagePath: string,
userId: string,
storeId: string
) {
const prefix = `${userId}/${storeId}/`;
const fileName = imagePath.startsWith(prefix)
? imagePath.slice(prefix.length)
: "";

if (!/^product-\d+\.(jpg|png|webp)$/.test(fileName)) {
fail("invalid_image");
}
}

export async function createProduct(formData: FormData) {
const name = String(formData.get("name") ?? "").trim();
const priceText = String(formData.get("price") ?? "").trim();
const compareAtPriceText = String(
formData.get("compareAtPrice") ?? ""
).trim();
const description = String(
formData.get("description") ?? ""
).trim();
const categoryId = String(
formData.get("categoryId") ?? ""
).trim();
const imagePath = String(
formData.get("imagePath") ?? ""
).trim();

if (!name || name.length > 120) {
fail("invalid_name");
}

if (
!priceText ||
!isValidPrice(priceText) ||
Number(priceText) < 0
) {
fail("invalid_price");
}

let compareAtPrice: number | null = null;

if (compareAtPriceText) {
if (
!isValidPrice(compareAtPriceText) ||
Number(compareAtPriceText) <= Number(priceText)
) {
fail("invalid_discount");
}


compareAtPrice = Number(compareAtPriceText);


}

if (description.length > 2000) {
fail("invalid_description");
}

const { supabase, userId, store } = await getOwnedStore();

await validateCategory(supabase, categoryId, store.id);

let imageUrl: string | null = null;

if (imagePath) {
validateImagePath(imagePath, userId, store.id);

const { data } = supabase.storage
  .from("store-assets")
  .getPublicUrl(imagePath);

imageUrl = data.publicUrl;


}

const { error } = await supabase.from("products").insert({
store_id: store.id,
category_id: categoryId || null,
name,
description: description || null,
price: Number(priceText),
compare_at_price: compareAtPrice,
image_url: imageUrl,
});

if (error) {
console.error("Failed to create product:", error);
fail("server");
}

revalidatePath("/dashboard");
revalidatePath("/dashboard/products");
redirect("/dashboard/products?success=created");
}

export async function updateProduct(formData: FormData) {
const productId = String(
formData.get("productId") ?? ""
).trim();
const name = String(formData.get("name") ?? "").trim();
const priceText = String(formData.get("price") ?? "").trim();
const compareAtPriceText = String(
formData.get("compareAtPrice") ?? ""
).trim();
const description = String(
formData.get("description") ?? ""
).trim();
const categoryId = String(
formData.get("categoryId") ?? ""
).trim();
const imagePath = String(
formData.get("imagePath") ?? ""
).trim();

if (!isValidProductId(productId)) {
fail("invalid_product");
}

if (!name || name.length > 120) {
fail("invalid_name");
}

if (
!priceText ||
!isValidPrice(priceText) ||
Number(priceText) < 0
) {
fail("invalid_price");
}

let compareAtPrice: number | null = null;

if (compareAtPriceText) {
if (
!isValidPrice(compareAtPriceText) ||
Number(compareAtPriceText) <= Number(priceText)
) {
fail("invalid_discount");
}


compareAtPrice = Number(compareAtPriceText);


}

if (description.length > 2000) {
fail("invalid_description");
}

const { supabase, userId, store } = await getOwnedStore();

const { data: existingProduct, error: productError } =
await supabase
.from("products")
.select("id, image_url")
.eq("id", productId)
.eq("store_id", store.id)
.maybeSingle();

if (productError) {
console.error("Failed to load product:", productError);
fail("server");
}

if (!existingProduct) {
fail("not_found");
}

await validateCategory(supabase, categoryId, store.id);

let imageUrl: string | null = existingProduct.image_url;

if (imagePath) {
validateImagePath(imagePath, userId, store.id);


const { data } = supabase.storage
  .from("store-assets")
  .getPublicUrl(imagePath);

imageUrl = data.publicUrl;


}

const { data: updatedProduct, error: updateError } =
await supabase
.from("products")
.update({
name,
price: Number(priceText),
compare_at_price: compareAtPrice,
description: description || null,
category_id: categoryId || null,
image_url: imageUrl,
})
.eq("id", productId)
.eq("store_id", store.id)
.select("id")
.maybeSingle();

if (updateError) {
console.error("Failed to update product:", updateError);
fail("server");
}

if (!updatedProduct) {
fail("not_found");
}

revalidatePath("/dashboard");
revalidatePath("/dashboard/products");
redirect("/dashboard/products?success=updated");
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

const { supabase, userId, store } = await getOwnedStore();

const path = `${userId}/${store.id}/product-${Date.now()}.${extension}`;

const { error } = await supabase.storage
.from("store-assets")
.upload(path, file, {
contentType: file.type,
cacheControl: "3600",
upsert: false,
});

if (error) {
console.error("Product image upload failed:", error);
return {
ok: false,
error: "تعذر رفع الصورة. حاول مجددًا.",
};
}

return { ok: true, path };
}

export async function setProductAvailability(
formData: FormData
) {
const productId = String(
formData.get("productId") ?? ""
).trim();
const availableValue = String(
formData.get("available") ?? ""
);

if (
!isValidProductId(productId) ||
!["true", "false"].includes(availableValue)
) {
fail("invalid_product");
}

const { supabase, store } = await getOwnedStore();

const { data, error } = await supabase
.from("products")
.update({ is_available: availableValue === "true" })
.eq("id", productId)
.eq("store_id", store.id)
.select("id")
.maybeSingle();

if (error) {
console.error("Failed to update product availability:", error);
fail("server");
}

if (!data) {
fail("not_found");
}

revalidatePath("/dashboard");
revalidatePath("/dashboard/products");
redirect("/dashboard/products?success=availability");
}

export async function deleteProduct(formData: FormData) {
const productId = String(
formData.get("productId") ?? ""
).trim();

if (!isValidProductId(productId)) {
fail("invalid_product");
}

const { supabase, store } = await getOwnedStore();

const { data, error } = await supabase
.from("products")
.delete()
.eq("id", productId)
.eq("store_id", store.id)
.select("id")
.maybeSingle();

if (error) {
console.error("Failed to delete product:", error);
fail("server");
}

if (!data) {
fail("not_found");
}

revalidatePath("/dashboard");
revalidatePath("/dashboard/products");
redirect("/dashboard/products?success=deleted");
}
