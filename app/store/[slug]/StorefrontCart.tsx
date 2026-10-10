"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Product = {
  id: string;
  name: string;
  price: number | string;
  image_url: string | null;
};

type CartLine = {
  productId: string;
  quantity: number;
};

type CartContextValue = {
  addToCart: (productId: string) => void;
  changeQuantity: (productId: string, amount: number) => void;
  removeFromCart: (productId: string) => void;
  quantityFor: (productId: string) => number;
};

type StorefrontCartProviderProps = {
  storeSlug: string;
  products: Product[];
  children: ReactNode;
};

const CartContext = createContext<CartContextValue | null>(null);

function formatPrice(value: number) {
  return new Intl.NumberFormat("ar-LY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function StorefrontCartProvider({
  storeSlug,
  products,
  children,
}: StorefrontCartProviderProps) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const storageKey = `matjari-cart:${storeSlug}`;

  // استعادة السلة بعد تحميل الصفحة، مع تجاهل المنتجات غير المتاحة.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          const availableIds = new Set(products.map((p) => p.id));

          const validLines = parsed.filter(
            (line): line is CartLine =>
              typeof line === "object" &&
              line !== null &&
              typeof line.productId === "string" &&
              Number.isInteger(line.quantity) &&
              line.quantity > 0 &&
              line.quantity <= 99 &&
              availableIds.has(line.productId),
          );

          setCart(validLines);
        }
      }
    } catch {
      // تجاهل بيانات التخزين التالفة بدل تعطيل المتجر.
      setCart([]);
    } finally {
      setReady(true);
    }
  }, [storageKey, products]);

  // لا نحفظ السلة الفارغة الأولية قبل انتهاء محاولة استعادتها.
  useEffect(() => {
    if (!ready) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      // تظل السلة قابلة للاستخدام حتى إن تعذر التخزين المحلي.
    }
  }, [cart, ready, storageKey]);

  const addToCart = useCallback((productId: string) => {
    setCart((current) => {
      const existing = current.find(
        (line) => line.productId === productId,
      );

      if (existing) {
        if (existing.quantity >= 99) return current;

        return current.map((line) =>
          line.productId === productId
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }

      return [...current, { productId, quantity: 1 }];
    });
  }, []);

  const changeQuantity = useCallback(
    (productId: string, amount: number) => {
      setCart((current) =>
        current.flatMap((line) => {
          if (line.productId !== productId) return [line];

          const quantity = line.quantity + amount;

          if (quantity <= 0) return [];
          if (quantity > 99) return [line];

          return [{ ...line, quantity }];
        }),
      );
    },
    [],
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((current) =>
      current.filter((line) => line.productId !== productId),
    );
  }, []);

  const quantityFor = useCallback(
    (productId: string) =>
      cart.find((line) => line.productId === productId)?.quantity ?? 0,
    [cart],
  );

  const contextValue: CartContextValue = {
    addToCart,
    changeQuantity,
    removeFromCart,
    quantityFor,
  };

  const cartItems = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);

    if (!product) return [];

    return [{ ...line, product }];
  });

  const totalQuantity = cartItems.reduce(
    (sum, line) => sum + line.quantity,
    0,
  );

  const totalPrice = cartItems.reduce(
    (sum, line) => sum + Number(line.product.price) * line.quantity,
    0,
  );

  return (
    <CartContext.Provider value={contextValue}>
      {children}

      {ready && totalQuantity > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-5 sm:pb-5">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 rounded-2xl bg-slate-900 px-5 py-4 text-right text-white shadow-2xl shadow-slate-900/20 transition hover:bg-slate-800"
            aria-label={`فتح السلة، ${totalQuantity} قطعة`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg">
                <CartIcon />
              </span>

              <span className="min-w-0">
                <span className="block font-bold">سلة المشتريات</span>
                <span className="mt-1 block text-xs text-white/65">
                  {totalQuantity} قطعة
                </span>
              </span>
            </span>

            <span className="shrink-0 text-left">
              <span className="block text-xs text-white/65">الإجمالي</span>
              <span className="mt-1 block font-bold">
                {formatPrice(totalPrice)} د.ل
              </span>
            </span>
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="إغلاق السلة"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className="relative z-10 flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="cart-title" className="text-xl font-bold">
                  سلة المشتريات
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {totalQuantity} قطعة في السلة
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl transition hover:bg-slate-200"
                aria-label="إغلاق"
              >
                ×
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
              {cartItems.map((line) => (
                <article
                  key={line.productId}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3"
                >
                  {line.product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={line.product.image_url}
                      alt={line.product.name}
                      className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <CartIcon />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-bold">
                      {line.product.name}
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatPrice(Number(line.product.price))} د.ل
                    </p>

                    <button
                      type="button"
                      onClick={() => removeFromCart(line.productId)}
                      className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      حذف المنتج
                    </button>
                  </div>

                  <div
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 p-1"
                    aria-label={`كمية ${line.product.name}`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        changeQuantity(line.productId, -1)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg font-semibold hover:bg-slate-200"
                      aria-label="تقليل الكمية"
                    >
                      −
                    </button>

                    <span className="min-w-5 text-center text-sm font-bold tabular-nums">
                      {line.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        changeQuantity(line.productId, 1)
                      }
                      disabled={line.quantity >= 99}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg font-semibold hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="زيادة الكمية"
                    >
                      +
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <footer className="border-t border-slate-100 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">
                  إجمالي السلة
                </span>
                <span className="text-xl font-bold tabular-nums">
                  {formatPrice(totalPrice)}{" "}
                  <span className="text-sm">د.ل</span>
                </span>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                إتمام الطلب سيُضاف في المرحلة التالية. الأسعار هنا للعرض
                فقط، وسيتم التحقق منها من الخادم عند إنشاء الطلب.
              </p>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                متابعة التسوق
              </button>
            </footer>
          </section>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function AddToCartButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const cart = useContext(CartContext);

  if (!cart) {
    throw new Error(
      "AddToCartButton must be inside StorefrontCartProvider",
    );
  }

  const quantity = cart.quantityFor(productId);

  return (
    <button
      type="button"
      onClick={() => cart.addToCart(productId)}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.98]"
      aria-label={`إضافة ${productName} إلى السلة`}
    >
      <CartIcon />
      {quantity > 0 ? `في السلة: ${quantity} · أضف المزيد` : "أضف للسلة"}
    </button>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}