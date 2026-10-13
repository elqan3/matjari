
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveSubscriptionStatus } from "@/lib/subscriptions";
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
  theme_preset: string | null;
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

const storefrontThemes: Record<string, { style: CSSProperties }> = {
  simple: { style: {
    "--theme-page": "#f8fafc", "--theme-surface": "#ffffff", "--theme-text": "#263238",
    "--theme-muted": "#64748b", "--theme-border": "#e2e8f0", "--theme-accent": "#334155",
    "--theme-accent-soft": "#f1f5f9", "--theme-accent-contrast": "#1e293b", "--theme-on-accent": "#ffffff", "--theme-soft": "#f1f5f9",
  } as CSSProperties },
  terracotta: { style: {
    "--theme-page": "#fbf8f4", "--theme-surface": "#fffdfb", "--theme-text": "#292522",
    "--theme-muted": "#75685f", "--theme-border": "#e9ddd3", "--theme-accent": "#9b523b",
    "--theme-accent-soft": "#fff8f2", "--theme-accent-contrast": "#763d2c", "--theme-on-accent": "#ffffff", "--theme-soft": "#f6ebe3",
  } as CSSProperties },
  botanical: { style: {
    "--theme-page": "#f2f7f0", "--theme-surface": "#fcfff9", "--theme-text": "#20352a",
    "--theme-muted": "#617666", "--theme-border": "#dce8dc", "--theme-accent": "#326747",
    "--theme-accent-soft": "#eaf4e9", "--theme-accent-contrast": "#244d35", "--theme-on-accent": "#ffffff", "--theme-soft": "#e6f0e3",
  } as CSSProperties },
  midnight: { style: {
    "--theme-page": "#111827", "--theme-surface": "#1f2937", "--theme-text": "#f8fafc",
    "--theme-muted": "#cbd5e1", "--theme-border": "#374151", "--theme-accent": "#d6ad62",
    "--theme-accent-soft": "#f6e8c8", "--theme-accent-contrast": "#5a4218", "--theme-on-accent": "#211a0e", "--theme-soft": "#273449",
  } as CSSProperties },
  blush: { style: {
    "--theme-page": "#fff5f7", "--theme-surface": "#fffdfd", "--theme-text": "#432b35",
    "--theme-muted": "#896b78", "--theme-border": "#f0dce4", "--theme-accent": "#be5676",
    "--theme-accent-soft": "#ffedf2", "--theme-accent-contrast": "#873750", "--theme-on-accent": "#ffffff", "--theme-soft": "#fbe6ed",
  } as CSSProperties },
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
    .select("id, name, slug, description, logo_url, theme_preset")
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
  const { data: subscription, error: subscriptionError } = await supabase
    .from("store_subscriptions")
    .select("status, plan_code, trial_ends_at, ends_at")
    .eq("store_id", store.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error("Failed to load storefront subscription:", subscriptionError.message);
    throw new Error("تعذر التحقق من حالة المتجر.");
  }

  const subscriptionState = getEffectiveSubscriptionStatus(
    subscription as Parameters<typeof getEffectiveSubscriptionStatus>[0],
  );

  if (subscriptionState === "expired" || subscriptionState === "suspended" || subscriptionState === "missing") {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-4 py-12 text-[#172a25]">
        <section className="w-full max-w-lg rounded-3xl border border-[#e5e9e1] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf3ed] text-2xl">م</div>
          <h1 className="mt-5 text-2xl font-black">{store.name}</h1>
          <p className="mt-3 text-sm leading-7 text-[#718077]">
            {subscriptionState === "suspended"
              ? "هذا المتجر متوقف مؤقتًا. يرجى التواصل مع إدارة متجري."
              : "هذا المتجر غير متاح حاليًا لانتهاء فترة التجربة أو الاشتراك. يمكن لصاحب المتجر التواصل مع إدارة متجري لإعادة تفعيله."}
          </p>
          <Link href="/" className="mt-6 inline-flex rounded-xl bg-[#173f32] px-5 py-3 text-sm font-bold text-white">العودة إلى متجري</Link>
        </section>
      </main>
    );
  }

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
  const theme = storefrontThemes[store.theme_preset ?? "simple"] ?? storefrontThemes.simple;

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
        style={theme.style}
        className="min-h-screen bg-[var(--theme-page)] text-[var(--theme-text)]"
      >
        <header className="border-b border-[var(--theme-border)] bg-[var(--theme-surface)]">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-7">
            {store.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logo_url}
                alt={`شعار ${store.name}`}
                className="h-16 w-16 shrink-0 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] object-contain p-1.5 shadow-sm sm:h-20 sm:w-20"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--theme-accent)] text-2xl font-bold text-[var(--theme-on-accent)] sm:h-20 sm:w-20"
              >
                {store.name.trim().charAt(0) || "م"}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {store.name}
              </h1>

              {store.description?.trim() ? (
                <p className="mt-2 max-w-2xl whitespace-pre-line text-sm leading-6 text-[var(--theme-muted)] sm:text-base sm:leading-7">
                  {store.description}
                </p>
              ) : (
                <p className="mt-2 text-sm text-[var(--theme-muted)]">
                  أهلًا بك في متجرنا
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <section className="mb-8 overflow-hidden rounded-3xl bg-[var(--theme-accent)] px-5 py-7 text-[var(--theme-on-accent)] shadow-[0_18px_45px_rgba(115,60,40,0.12)] sm:px-8 sm:py-9">
            <p className="text-sm font-semibold text-[var(--theme-on-accent)]/80">
              اكتشف منتجاتنا
            </p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              اختيارات تناسبك
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--theme-on-accent)]/85">
              تصفح المنتجات المتاحة واختر ما يناسبك.
            </p>

            {hasProducts && categories.length > 0 && (
              <a
                href="#products"
                className="mt-5 inline-flex rounded-xl bg-[var(--theme-accent-soft)] px-5 py-3 text-sm font-bold text-[var(--theme-accent-contrast)] transition hover:bg-[var(--theme-surface)]"
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
                    className="shrink-0 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-text)] transition hover:border-[var(--theme-accent)] hover:bg-[var(--theme-accent)] hover:text-[var(--theme-on-accent)]"
                  >
                    {category.name}
                  </a>
                );
              })}

              {productsWithoutCategory.length > 0 && (
                <a
                  href="#category-other"
                  className="shrink-0 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm font-medium transition hover:border-[var(--theme-accent)] hover:bg-[var(--theme-accent)] hover:text-[var(--theme-on-accent)]"
                >
                  أخرى
                </a>
              )}
            </nav>
          )}

          <div id="products" className="scroll-mt-6">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  منتجات المتجر
                </h2>
                <p className="mt-1 text-sm text-[var(--theme-muted)]">
                  {products.length}{" "}
                  {products.length === 1 ? "منتج" : "منتجات"} متاحة
                </p>
              </div>
            </div>

            {!hasProducts ? (
              <section className="rounded-3xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--theme-soft)] text-2xl text-[var(--theme-accent)]">
                  ◇
                </div>

                <h3 className="mt-4 text-lg font-bold">
                  لا توجد منتجات متاحة حاليًا
                </h3>

                <p className="mt-2 text-sm leading-6 text-[var(--theme-muted)]">
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
                        <div className="h-px flex-1 bg-[var(--theme-border)]" />
                        <span className="text-xs text-[var(--theme-muted)]">
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
                      <div className="h-px flex-1 bg-[var(--theme-border)]" />
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

          <footer className="mt-16 border-t border-[var(--theme-border)] py-6 text-center">
            <p className="text-xs text-[var(--theme-muted)]">
              متجر إلكتروني مدعوم بواسطة{" "}
              <span className="font-semibold text-[var(--theme-text)]">
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
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--theme-border)] hover:shadow-lg hover:shadow-slate-900/5 sm:rounded-3xl">
      <div className="relative aspect-square overflow-hidden bg-[var(--theme-soft)]">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--theme-muted)]">
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
          <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-[var(--theme-on-accent)] shadow-sm sm:right-3 sm:top-3">
            خصم {discount}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h4 className="line-clamp-2 text-sm font-bold leading-6 sm:text-base">
          {product.name}
        </h4>

        {product.description?.trim() && (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--theme-muted)] sm:text-sm">
            {product.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-4">
          <span className="text-base font-bold text-[var(--theme-text)] sm:text-lg">
            {formatPrice(product.price)}{" "}
            <span className="text-xs font-medium text-[var(--theme-muted)]">
              د.ل
            </span>
          </span>

          {discount !== null && (
            <span className="text-xs text-[var(--theme-muted)] line-through">
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
