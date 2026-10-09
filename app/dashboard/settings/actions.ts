
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



export async function saveStoreLogo(
  objectPath: string
): Promise<
  | { ok: true; logoUrl: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    return {
      ok: false,
      error: "انتهت جلسة تسجيل الدخول. سجّل الدخول مجددًا.",
    };
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (storeError || !store) {
    console.error("Failed to verify store for logo:", storeError);

    return {
      ok: false,
      error: "تعذر التحقق من ملكية المتجر.",
    };
  }

  const expectedPrefix = `${userId}/${store.id}/`;
const validLogoPath =
  objectPath.startsWith(expectedPrefix) &&
  /^logo-\d+\.(jpg|png|webp)$/.test(
    objectPath.slice(expectedPrefix.length)
  );

if (!validLogoPath) {
    return {
      ok: false,
      error: "مسار ملف الشعار غير صالح.",
    };
  }

  const { data: publicUrlData } = supabase.storage
  .from("store-assets")
  .getPublicUrl(objectPath);

  const logoUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabase
    .from("stores")
    .update({ logo_url: logoUrl })
    .eq("id", store.id)
    .eq("owner_id", userId);

  if (updateError) {
    console.error("Failed to save store logo URL:", updateError);

    return {
      ok: false,
      error: "رُفعت الصورة لكن تعذر حفظ رابطها. حاول مجددًا.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");

  return { ok: true, logoUrl };
}