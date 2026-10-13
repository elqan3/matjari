
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { updateStoreSettings } from "./actions";
import LogoUpload from "./logo-upload";
import { canUseTheme, getEffectiveSubscriptionStatus } from "@/lib/subscriptions";

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
  plan_theme: "هذا التصميم غير متاح في خطتك الحالية. اختر تصميمًا آخر أو اطلب الترقية من صفحة الاشتراك.",
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
  .select("id, name, slug, description, logo_url, theme_preset")
  .eq("owner_id", userId)
  .maybeSingle();

  if (error) {
    console.error("Failed to load store settings:", error);
    throw new Error("تعذر تحميل إعدادات المتجر.");
  }

  if (!store) {
    redirect("/dashboard/create-store");
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("store_subscriptions")
    .select("status, plan_code, trial_ends_at, ends_at")
    .eq("store_id", store.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error("Failed to load subscription for settings:", subscriptionError.message);
    throw new Error("تعذر تحميل حالة الاشتراك.");
  }

  const effectiveStatus = getEffectiveSubscriptionStatus(
    subscription as Parameters<typeof getEffectiveSubscriptionStatus>[0],
  );
  const canChooseTheme = (themeId: string) =>
    (effectiveStatus === "trial" || effectiveStatus === "active") &&
    Boolean(subscription && canUseTheme(subscription as Parameters<typeof canUseTheme>[0], themeId));

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


            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">تصميم واجهة الزبائن</legend>
              <p className="text-sm leading-6 text-[#718077]">
                اختر الشكل الذي يناسب هوية متجرك. يمكنك تغيير التصميم لاحقًا دون التأثير في المنتجات أو الطلبات.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { id: "simple", name: "البسيط", note: "هادئ وواضح — مجاني", colors: ["#f8fafc", "#ffffff", "#334155"], premium: false },
                  { id: "terracotta", name: "الطين الدافئ", note: "هوية دافئة للمتاجر المستقلة", colors: ["#fbf5ef", "#fffaf5", "#a64e32"], premium: true },
                  { id: "botanical", name: "البوتانيكي", note: "طبيعي وأنيق بلمسات خضراء", colors: ["#f2f7f0", "#fcfff9", "#326747"], premium: true },
                  { id: "midnight", name: "منتصف الليل", note: "داكن وفاخر مع لمسات ذهبية", colors: ["#111827", "#1f2937", "#d6ad62"], premium: true },
                  { id: "blush", name: "بلَش", note: "ناعم وعصري للجمال والهدايا", colors: ["#fff5f7", "#fffdfd", "#be5676"], premium: true },
                ].map((theme) => (
                  <label
                    key={theme.id}
                    className={`flex gap-3 rounded-2xl border p-4 transition ${canChooseTheme(theme.id) ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-sm" : "cursor-not-allowed opacity-55"} ${store.theme_preset === theme.id ? "border-[#173f32] bg-[#f3f7f2] ring-1 ring-[#173f32]" : "border-[#e5e9e1] bg-white"}`}
                  >
                    <input
                      type="radio"
                      name="theme_preset"
                      value={theme.id}
                      defaultChecked={store.theme_preset === theme.id}
                      disabled={!canChooseTheme(theme.id)}
                      className="mt-1 accent-[#173f32] disabled:cursor-not-allowed"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold">
                        {theme.name}
                        {!canChooseTheme(theme.id) ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">يتطلب ترقية</span>
                        ) : theme.premium && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">مميز</span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#718077]">{theme.note}</span>
                      <span className="mt-3 flex gap-1.5" aria-hidden="true">
                        {theme.colors.map((color) => (
                          <span key={color} className="h-5 w-8 rounded-md border border-black/5" style={{ backgroundColor: color }} />
                        ))}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs leading-5 text-[#8a7560]">
                تختلف التصاميم المتاحة حسب الخطة. إذا كان التصميم مقفلًا، يمكنك مراجعة الخطط من صفحة الاشتراك.
              </p>
            </fieldset>

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