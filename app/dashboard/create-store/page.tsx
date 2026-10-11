
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createStore } from "./actions";

async function CreateStoreContent() {
  await connection();

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: existingStore, error: storeError } =
    await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

  if (storeError) {
    console.error("Failed to check existing store:", storeError);
    throw new Error("تعذر التحقق من متجرك. حاول مجددًا.");
  }

  if (existingStore) {
    redirect("/dashboard");
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#f7f8f5] px-4 py-10 text-[#172a25]"
    >
      <div className="mx-auto max-w-xl">
        <Link
          href="/dashboard"
          className="text-sm text-[#718077] hover:text-[#172a25]"
        >
          العودة إلى لوحة التحكم
        </Link>

        <section className="mt-6 rounded-2xl border border-[#e5e9e1] bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold">
            أنشئ متجرك الأول
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718077]">
            أدخل بيانات متجرك للبدء في عرض منتجاتك واستقبال الطلبات.
          </p>

          <form action={createStore} className="mt-8 space-y-5">
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
                placeholder="مثال: متجري"
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
                  placeholder="my-store"
                  className="min-w-0 flex-1 rounded-xl border border-[#d7e0d6] px-4 py-3 outline-none focus:border-[#29936b]"
                />
              </div>
              <p className="mt-2 text-xs text-[#78857d]">
                استخدم الحروف الإنجليزية الصغيرة والأرقام والشرطة فقط.
              </p>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium"
              >
                وصف المتجر (اختياري)
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={500}
                placeholder="اكتب نبذة قصيرة عن متجرك..."
                className="w-full rounded-xl border border-[#d7e0d6] px-4 py-3 outline-none focus:border-[#29936b]"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#173f32] px-4 py-3 font-medium text-white transition hover:bg-[#205744]"
            >
              إنشاء المتجر
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function CreateStorePage() {
  return (
    <Suspense
      fallback={
        <main
          dir="rtl"
          className="min-h-screen bg-[#f7f8f5] p-8 text-[#718077]"
        >
          جارٍ التحقق من حسابك...
        </main>
      }
    >
      <CreateStoreContent />
    </Suspense>
  );
}