
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "./actions";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "أدخل اسمًا صحيحًا للتصنيف، بحد أقصى 80 حرفًا.",
  duplicate: "يوجد تصنيف بهذا الاسم بالفعل.",
  not_found: "لم يُعثر على التصنيف. حدّث الصفحة وحاول مجددًا.",
  server: "تعذرت العملية. حاول مجددًا.",
};

const successMessages: Record<string, string> = {
  created: "تمت إضافة التصنيف بنجاح.",
  updated: "تم تعديل التصنيف بنجاح.",
  deleted: "تم حذف التصنيف بنجاح.",
};

async function CategoriesContent({ searchParams }: PageProps) {
  await connection();

  const params = await searchParams;
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
    console.error("Failed to load store:", storeError);
    throw new Error("تعذر تحميل بيانات المتجر.");
  }

  if (!store) {
    redirect("/dashboard/create-store");
  }

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load categories:", error);
    throw new Error("تعذر تحميل التصنيفات.");
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:py-10"
    >
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          العودة إلى لوحة التحكم
        </Link>

        <header className="mt-6">
          <p className="text-sm text-slate-500">إدارة المتجر</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            التصنيفات
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            نظّم منتجاتك في تصنيفات ليسهل على عملائك العثور عليها.
          </p>
        </header>

        {params.error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {errorMessages[params.error] ?? "حدث خطأ غير متوقع."}
          </p>
        )}

        {params.success && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {successMessages[params.success] ?? "تمت العملية بنجاح."}
          </p>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">إضافة تصنيف</h2>

          <form action={createCategory} className="mt-4">
            <label
              htmlFor="new-category-name"
              className="mb-2 block text-sm font-medium"
            >
              اسم التصنيف
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="new-category-name"
                name="name"
                required
                minLength={1}
                maxLength={80}
                placeholder="مثال: ملابس، إلكترونيات..."
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              />

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                إضافة التصنيف
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              من حرف واحد إلى 80 حرفًا. يجب أن يكون الاسم فريدًا داخل متجرك.
            </p>
          </form>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">تصنيفات متجرك</h2>
            <span className="text-sm text-slate-500">
              {categories.length} تصنيف
            </span>
          </div>

          {categories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
              <h3 className="font-semibold">لا توجد تصنيفات بعد</h3>
              <p className="mt-2 text-sm text-slate-500">
                أضف أول تصنيف لتنظيم منتجات متجرك لاحقًا.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
                >
                  <form
                    action={updateCategory}
                    className="flex flex-col gap-3 sm:flex-row sm:items-end"
                  >
                    <input
                      type="hidden"
                      name="categoryId"
                      value={category.id}
                    />

                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`category-${category.id}`}
                        className="mb-2 block text-sm font-medium"
                      >
                        اسم التصنيف
                      </label>

                      <input
                        id={`category-${category.id}`}
                        name="name"
                        required
                        minLength={1}
                        maxLength={80}
                        defaultValue={category.name}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                      />
                    </div>

                    <button
                      type="submit"
                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium transition hover:bg-slate-50"
                    >
                      حفظ الاسم
                    </button>
                  </form>

                  <div className="mt-3 flex justify-start border-t border-slate-100 pt-3">
                    <form action={deleteCategory}>
                      <input
                        type="hidden"
                        name="categoryId"
                        value={category.id}
                      />

                      <button
                        type="submit"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                      >
                        حذف التصنيف
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function CategoriesPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <main dir="rtl" className="min-h-screen bg-slate-50 p-8 text-slate-600">
          جارٍ تحميل التصنيفات...
        </main>
      }
    >
      <CategoriesContent {...props} />
    </Suspense>
  );
}