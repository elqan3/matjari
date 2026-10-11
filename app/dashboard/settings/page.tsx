
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { updateStoreSettings } from "./actions";
import LogoUpload from "./logo-upload";

type SettingsPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "تحقق من البيانات المدخلة ثم حاول مجددًا.",
  slug_taken: "هذا الرابط مستخدم بالفعل. اختر رابطًا آخر.",
  server: "تعذر حفظ الإعدادات. حاول مجددًا.",
};

async function StoreSettingsContent({
  searchParams,
}: SettingsPageProps) {
  await connection();

  const params = await searchParams;
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: store, error } = await supabase
  .from("stores")
  .select("id, name, slug, description, logo_url")
  .eq("owner_id", userId)
  .maybeSingle();

  if (error) {
    console.error("Failed to load store settings:", error);
    throw new Error("تعذر تحميل إعدادات المتجر.");
  }

  if (!store) {
    redirect("/dashboard/create-store");
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#f7f8f5] px-4 py-10 text-[#172a25]"
    >
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="text-sm text-[#718077] hover:text-[#172a25]"
        >
          العودة إلى لوحة التحكم
        </Link>

        <section className="mt-6 rounded-2xl border border-[#e5e9e1] bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold">
            إعدادات المتجر
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718077]">
            عدّل بيانات متجرك الأساسية. ستظهر التغييرات
            في واجهة متجرك العامة عند تجهيزها.
          </p>
          <LogoUpload
  userId={userId}
  storeId={store.id}
  initialLogoUrl={store.logo_url}
/>

          {params.saved === "1" && (
            <p
              role="status"
              className="mt-5 rounded-xl border border-[#c8e1cf] bg-[#eaf3ed] p-3 text-sm text-[#215c3d]"
            >
              تم حفظ إعدادات المتجر بنجاح.
            </p>
          )}

          {params.error && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {errorMessages[params.error] ??
                "حدث خطأ غير متوقع. حاول مجددًا."}
            </p>
          )}

          <form
            action={updateStoreSettings}
            className="mt-8 space-y-6"
          >
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium"
              >
                اسم المتجر
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                minLength={1}
                maxLength={100}
                defaultValue={store.name}
                className="w-full rounded-xl border border-[#d7e0d6] px-4 py-3 outline-none focus:border-[#29936b]"
              />
            </div>

            <div>
              <label
                htmlFor="slug"
                className="mb-2 block text-sm font-medium"
              >
                رابط المتجر
              </label>

              <div dir="ltr" className="flex items-center gap-2">
                <span className="text-sm text-[#78857d]">
                  /store/
                </span>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  required
                  minLength={3}
                  maxLength={50}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="استخدم الحروف الإنجليزية الصغيرة والأرقام والشرطة فقط"
                  defaultValue={store.slug}
                  className="min-w-0 flex-1 rounded-xl border border-[#d7e0d6] px-4 py-3 outline-none focus:border-[#29936b]"
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-amber-700">
                تنبيه: تغيير الرابط سيغيّر عنوان متجرك،
                وقد تتوقف الروابط القديمة عن العمل.
              </p>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium"
              >
                وصف المتجر
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={500}
                defaultValue={store.description ?? ""}
                placeholder="اكتب نبذة قصيرة عن متجرك..."
                className="w-full rounded-xl border border-[#d7e0d6] px-4 py-3 outline-none focus:border-[#29936b]"
              />
              <p className="mt-2 text-xs text-[#78857d]">
                اختياري، حتى 500 حرف.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="w-full rounded-xl bg-[#173f32] px-4 py-3 font-medium text-white transition hover:bg-[#205744]"
              >
                حفظ التغييرات
              </button>

              <Link
                href="/dashboard"
                className="w-full rounded-xl border border-[#d7e0d6] px-4 py-3 text-center text-sm font-medium transition hover:bg-[#f7f8f5]"
              >
                إلغاء
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function StoreSettingsPage(
  props: SettingsPageProps
) {
  return (
    <Suspense
      fallback={
        <main
          dir="rtl"
          className="min-h-screen bg-[#f7f8f5] p-8 text-[#718077]"
        >
          جارٍ تحميل إعدادات المتجر...
        </main>
      }
    >
      <StoreSettingsContent {...props} />
    </Suspense>
  );
}