
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
      className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"
    >
      <div className="mx-auto max-w-xl">
        <Link
          href="/dashboard"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          العودة إلى لوحة التحكم
        </Link>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold">
            أنشئ متجرك الأول
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
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
                <span className="text-sm text-slate-500">
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
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700"
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
          className="min-h-screen bg-slate-50 p-8 text-slate-600"
        >
          جارٍ التحقق من حسابك...
        </main>
      }
    >
      <CreateStoreContent />
    </Suspense>
  );
}