
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createProduct } from "./actions";
import ProductImageUpload from "./product-image-upload";
import ProductCreateForm from "./product-create-form";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid_name: "أدخل اسم المنتج، بحد أقصى 120 حرفًا.",
  invalid_price: "أدخل سعرًا صحيحًا غير سالب، وبحد أقصى منزلتين عشريتين.",
  invalid_description: "يجب ألا يتجاوز الوصف 2000 حرف.",
  invalid_category: "التصنيف المختار غير صالح أو لا يتبع متجرك.",
  invalid_image: "مسار صورة المنتج غير صالح. أعد رفع الصورة.",
  server: "تعذرت العملية. تحقق من البيانات وحاول مجددًا.",
};

async function ProductsContent({ searchParams }: PageProps) {
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
    .select("id, name")
    .eq("owner_id", userId)
    .maybeSingle();

  if (storeError) {
    console.error("Failed to load store:", storeError);
    throw new Error("تعذر تحميل بيانات المتجر.");
  }

  if (!store) redirect("/dashboard/create-store");

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("store_id", store.id)
    .order("name", { ascending: true });

  if (categoriesError) {
    console.error("Failed to load categories:", categoriesError);
    throw new Error("تعذر تحميل تصنيفات المتجر.");
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
          <p className="text-sm text-slate-500">{store.name}</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            إضافة منتج
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            أدخل بيانات المنتج. يمكنك إضافة الصورة والوصف والتصنيف لاحقًا.
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

        {params.success === "created" && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            تم إنشاء المنتج بنجاح.
          </p>
        )}

      
<section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
  <ProductCreateForm categories={categories ?? []} />
</section>
      </div>
    </main>
  );
}

export default function ProductsPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <main dir="rtl" className="min-h-screen bg-slate-50 p-8 text-slate-600">
          جارٍ تحميل المنتجات...
        </main>
      }
    >
      <ProductsContent {...props} />
    </Suspense>
  );
}