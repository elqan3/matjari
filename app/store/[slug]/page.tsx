
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AddToCartButton,
  StorefrontCartProvider,
} from "./StorefrontCart";

export const instant = false;

type Store = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
};

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  image_url: string | null;
  is_available: boolean;
};

type StorePageProps = {
  params: Promise<{ slug: string }>;
};

function formatPrice(value: number | string) {
  return new Intl.NumberFormat("ar-LY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function getDiscount(
  price: number | string,
  compareAtPrice: number | string | null,
) {
  const currentPrice = Number(price);
  const oldPrice = Number(compareAtPrice);

  if (
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(oldPrice) ||
    oldPrice <= currentPrice ||
    oldPrice <= 0
  ) {
    return null;
  }

  return Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
}

async function getStore(slug: string): Promise<Store | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stores")
    .select("id, name, slug, description, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Failed to load store:", error.message);
    throw new Error("تعذر تحميل المتجر.");
  }

  return data as Store | null;
}

export async function generateMetadata({
  params,
}: StorePageProps): Promise<Metadata> {
  await connection();

  const { slug } = await params;
  const store = await getStore(slug);

  if (!store) {
    return { title: "المتجر غير موجود | متجري" };
  }

  return {
    title: `${store.name} | متجري`,
    description:
      store.description?.trim() ||
      `تصفح منتجات ${store.name} وأسعارها عبر متجره الإلكتروني.`,
  };
}

export default async function StorePage({ params }: StorePageProps) {
  await connection();

  const { slug } = await params;
  const store = await getStore(slug);

  if (!store) {
    notFound();
  }

  const supabase = await createClient();

  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("store_id", store.id)
      .order("name", { ascending: true }),

    supabase
      .from("products")
      .select(
        "id, category_id, name, description, price, compare_at_price, image_url, is_available",
      )
      .eq("store_id", store.id)
      .eq("is_available", true)
      .order("created_at", { ascending: false }),
  ]);

  if (categoriesResult.error || productsResult.error) {
    console.error("Failed to load storefront data:", {
      categories: categoriesResult.error?.message,
      products: productsResult.error?.message,
    });

    throw new Error("تعذر تحميل منتجات المتجر.");
  }

  const categories = (categoriesResult.data ?? []) as Category[];
  const products = (productsResult.data ?? []) as Product[];

  const productsWithoutCategory = products.filter(
    (product) => !product.category_id,
  );

  const productsForCategory = (categoryId: string) =>
    products.filter((product) => product.category_id === categoryId);

  const hasProducts = products.length > 0;

  return (
    <StorefrontCartProvider
      storeSlug={store.slug}
      products={products.map((product) => ({
        ...product,
        price: Number(product.price),
        compare_at_price:
          product.compare_at_price == null
            ? null
            : Number(product.compare_at_price),
      }))}
    >
      <main
        dir="rtl"
        className="min-h-screen bg-[#f7f7f5] text-slate-900"
      >
        <header className="border-b border-black/5 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-5 sm:px-6">
            {store.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logo_url}
                alt={`شعار ${store.name}`}
                className="h-16 w-16 shrink-0 rounded-2xl border border-black/5 bg-white object-contain p-1"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-bold text-white"
              >
                {store.name.trim().charAt(0) || "م"}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {store.name}
              </h1>

              {store.description?.trim() ? (
                <p className="mt-1 max-w-2xl whitespace-pre-line text-sm leading-6 text-slate-600 sm:text-base">
                  {store.description}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-500">
                  أهلًا بك في متجرنا
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <section className="mb-8 rounded-3xl bg-slate-900 px-5 py-7 text-white sm:px-8 sm:py-9">
            <p className="text-sm font-medium text-white/65">
              اكتشف منتجاتنا
            </p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              اختيارات تناسبك
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
              تصفح المنتجات المتاحة واختر ما يناسبك.
            </p>

            {hasProducts && categories.length > 0 && (
              <a
                href="#products"
                className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
              >
                تصفح المنتجات
              </a>
            )}
          </section>

          {categories.length > 0 && hasProducts && (
            <nav
              aria-label="تصنيفات المنتجات"
              className="mb-8 flex gap-2 overflow-x-auto pb-2"
            >
              {categories.map((category) => {
                const categoryHasProducts = products.some(
                  (product) => product.category_id === category.id,
                );

                if (!categoryHasProducts) return null;

                return (
                  <a
                    key={category.id}
                    href={`#category-${category.id}`}
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                  >
                    {category.name}
                  </a>
                );
              })}

              {productsWithoutCategory.length > 0 && (
                <a
                  href="#category-other"
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                >
                  أخرى
                </a>
              )}
            </nav>
          )}

          <div id="products" className="scroll-mt-6">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">
                  منتجات المتجر
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {products.length}{" "}
                  {products.length === 1 ? "منتج" : "منتجات"} متاحة
                </p>
              </div>
            </div>

            {!hasProducts ? (
              <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  ◇
                </div>

                <h3 className="mt-4 text-lg font-bold">
                  لا توجد منتجات متاحة حاليًا
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  لم يضف صاحب المتجر منتجات بعد، أو أن المنتجات غير متاحة
                  مؤقتًا. يرجى العودة لاحقًا.
                </p>
              </section>
            ) : (
              <div className="space-y-10">
                {categories.map((category) => {
                  const categoryProducts = productsForCategory(category.id);

                  if (categoryProducts.length === 0) return null;

                  return (
                    <section
                      key={category.id}
                      id={`category-${category.id}`}
                      className="scroll-mt-6"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <h3 className="text-lg font-bold sm:text-xl">
                          {category.name}
                        </h3>
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs text-slate-500">
                          {categoryProducts.length} منتج
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                        {categoryProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}

                {productsWithoutCategory.length > 0 && (
                  <section
                    id="category-other"
                    className="scroll-mt-6"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <h3 className="text-lg font-bold sm:text-xl">
                        أخرى
                      </h3>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                      {productsWithoutCategory.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>

          <footer className="mt-16 border-t border-slate-200 py-6 text-center">
            <p className="text-xs text-slate-500">
              متجر إلكتروني مدعوم بواسطة{" "}
              <span className="font-semibold text-slate-700">
                متجري
              </span>
            </p>
          </footer>
        </div>
      </main>
    </StorefrontCartProvider>
  );
}

function ProductCard({ product }: { product: Product }) {
  const discount = getDiscount(
    product.price,
    product.compare_at_price,
  );

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/5 sm:rounded-3xl">
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              className="h-12 w-12"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}

        {discount !== null && (
          <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm sm:right-3 sm:top-3">
            خصم {discount}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h4 className="line-clamp-2 text-sm font-bold leading-6 sm:text-base">
          {product.name}
        </h4>

        {product.description?.trim() && (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 sm:text-sm">
            {product.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-4">
          <span className="text-base font-bold text-slate-900 sm:text-lg">
            {formatPrice(product.price)}{" "}
            <span className="text-xs font-medium text-slate-600">
              د.ل
            </span>
          </span>

          {discount !== null && (
            <span className="text-xs text-slate-400 line-through">
              {formatPrice(product.compare_at_price!)} د.ل
            </span>
          )}
        </div>

        <AddToCartButton
          productId={product.id}
          productName={product.name}
        />
      </div>
    </article>
  );
}
