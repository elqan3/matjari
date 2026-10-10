
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ProductCreateForm from "./product-create-form";
import ProductRowActions from "./product-row-actions";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid_name: "أدخل اسم المنتج، بحد أقصى 120 حرفًا.",
  invalid_price: "أدخل سعرًا صحيحًا غير سالب، وبحد أقصى منزلتين عشريتين.",
  invalid_discount: "يجب أن يكون السعر قبل الخصم أكبر من السعر الحالي.",
  invalid_description: "يجب ألا يتجاوز الوصف 2000 حرف.",
  invalid_category: "التصنيف المختار غير صالح أو لا يتبع متجرك.",
  invalid_image: "مسار صورة المنتج غير صالح. أعد رفع الصورة.",
  invalid_product: "بيانات المنتج غير صالحة.",
  not_found: "المنتج غير موجود أو لا يتبع متجرك.",
  server: "تعذرت العملية. تحقق من البيانات وحاول مجددًا.",
};

async function ProductsContent({ searchParams }: PageProps) {
  await connection();

  const params = await searchParams;
  const supabase = await createClient();

  const { data, error: authError } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name")
    .eq("owner_id", userId)
    .maybeSingle();

  if (storeError) {
    throw new Error("تعذر تحميل بيانات المتجر");
  }

  if (!store) {
    redirect("/dashboard");
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("store_id", store.id)
    .order("name");

  if (categoriesError) {
    throw new Error("تعذر تحميل التصنيفات");
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      "id, name, description, price, compare_at_price, image_url, is_available, category_id, created_at"
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (productsError) {
    throw new Error("تعذر تحميل المنتجات");
  }

  const categoryList = categories ?? [];
  const productList = products ?? [];

  const categoryNames = new Map(
    categoryList.map((category) => [category.id, category.name])
  );

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
            إدارة المنتجات
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            أضف منتجات متجرك، وعدّل بياناتها وأسعارها وصورها، وتحكم في توفرها.
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

        {params.success === "updated" && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            تم تحديث المنتج بنجاح.
          </p>
        )}

        {params.success === "availability" && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            تم تحديث توفر المنتج.
          </p>
        )}

        {params.success === "deleted" && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            تم حذف المنتج.
          </p>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">إضافة منتج جديد</h2>
          <ProductCreateForm categories={categoryList} />
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">منتجات متجرك</h2>
            <span className="text-sm text-slate-500">
              {productList.length} منتج
            </span>
          </div>

          {productList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-medium">لا توجد منتجات حتى الآن</p>
              <p className="mt-2 text-sm text-slate-500">
                استخدم نموذج الإضافة أعلاه لإنشاء أول منتج في متجرك.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {productList.map((product) => {
                const currentPrice = Number(product.price);
                const compareAtPrice =
                  product.compare_at_price == null
                    ? null
                    : Number(product.compare_at_price);

                const hasDiscount =
                  compareAtPrice !== null &&
                  Number.isFinite(currentPrice) &&
                  Number.isFinite(compareAtPrice) &&
                  compareAtPrice > currentPrice;

                const discountPercentage = hasDiscount
                  ? Math.round(
                      ((compareAtPrice - currentPrice) / compareAtPrice) * 100
                    )
                  : null;

                return (
                  <article
                    key={product.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-24 w-24 shrink-0 rounded-xl border border-slate-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400">
                          بلا صورة
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{product.name}</h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs ${
                              product.is_available
                                ? "bg-green-50 text-green-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {product.is_available ? "متوفر" : "غير متوفر"}
                          </span>

                          {hasDiscount && (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                              خصم {discountPercentage}%
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-baseline gap-2">
                          <p className="text-lg font-bold text-slate-900">
                            {currentPrice.toFixed(2)}
                          </p>

                          {hasDiscount && (
                            <p className="text-sm text-slate-400 line-through">
                              {compareAtPrice.toFixed(2)}
                            </p>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          التصنيف:{" "}
                          {product.category_id
                            ? categoryNames.get(product.category_id) ??
                              "غير محدد"
                            : "غير محدد"}
                        </p>

                        {product.description && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <ProductRowActions
                        product={{
                          id: product.id,
                          name: product.name,
                          description: product.description,
                          price: currentPrice,
                          compare_at_price: compareAtPrice,
                          image_url: product.image_url,
                          category_id: product.category_id,
                        }}
                        categories={categoryList}
                        isAvailable={product.is_available}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ProductsPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <main
          dir="rtl"
          className="min-h-screen bg-slate-50 p-8 text-slate-600"
        >
          جارٍ تحميل المنتجات...
        </main>
      }
    >
      <ProductsContent {...props} />
    </Suspense>
  );
}