
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

type StoreProduct = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  compare_at_price: number | null;
};

type CartItem = {
  productId: string;
  quantity: number;
};

type CustomerDetails = {
  name: string;
  phone: string;
  address: string;
  notes: string;
};

type OrderConfirmation = {
  order_id: string;
  order_number: string | number;
  total: number;
};

type CartContextValue = {
  addToCart: (productId: string) => void;
  cartCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function formatPrice(price: number) {
  return `${new Intl.NumberFormat("ar-LY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)} د.ل`;
}

function isValidCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.productId === "string" &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity >= 1 &&
    item.quantity <= 99
  );
}

export function StorefrontCartProvider({
  storeSlug,
  products,
  children,
}: {
  storeSlug: string;
  products: StoreProduct[];
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsHydrated, setDetailsHydrated] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [orderConfirmation, setOrderConfirmation] =
    useState<OrderConfirmation | null>(null);

  const cartStorageKey = `matjari-cart:${storeSlug}`;
  const detailsStorageKey = `matjari-customer:${storeSlug}`;
  const orderAttemptStorageKey = `matjari-order-attempt:${storeSlug}`;

  // These effects hydrate client-only state from localStorage after mount.
  // The state updates are intentional; preserve SSR initialization and persistence order.
  /* eslint-disable react-hooks/set-state-in-effect */
  // Restore the cart and keep only products that are currently available.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(cartStorageKey);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          const availableIds = new Set(
            products
              .filter((product) => product.is_available)
              .map((product) => product.id),
          );

          const restored = parsed
            .filter(isValidCartItem)
            .filter((item) => availableIds.has(item.productId));

          const merged = new Map<string, number>();

          for (const item of restored) {
            merged.set(
              item.productId,
              Math.min(
                99,
                (merged.get(item.productId) ?? 0) + item.quantity,
              ),
            );
          }

          setCart(
            Array.from(merged, ([productId, quantity]) => ({
              productId,
              quantity,
            })),
          );
        }
      }
    } catch {
      // Ignore corrupted cart data.
    } finally {
      setCartHydrated(true);
    }
  }, [cartStorageKey, products]);

  // Persist only after the initial cart restoration.
  useEffect(() => {
    if (!cartHydrated) return;

    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch {
      // The cart remains usable if browser storage is unavailable.
    }
  }, [cart, cartHydrated, cartStorageKey]);

  // Restore previously saved customer details.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(detailsStorageKey);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (typeof parsed === "object" && parsed !== null) {
          const value = parsed as Record<string, unknown>;

          if (
            typeof value.name === "string" &&
            typeof value.phone === "string" &&
            typeof value.address === "string" &&
            typeof value.notes === "string"
          ) {
            setCustomerName(value.name);
            setCustomerPhone(value.phone);
            setCustomerAddress(value.address);
            setCustomerNotes(value.notes);
            setDetailsSaved(true);
          }
        }
      }
    } catch {
      // Ignore corrupted customer data.
    } finally {
      setDetailsHydrated(true);
    }
  }, [detailsStorageKey]);

  /* eslint-enable react-hooks/set-state-in-effect */

  const availableProducts = useMemo(
    () => products.filter((product) => product.is_available),
    [products],
  );

  const cartProducts = useMemo(() => {
    return cart
      .map((item) => {
        const product = availableProducts.find(
          (candidate) => candidate.id === item.productId,
        );

        if (!product) return null;

        return {
          ...product,
          quantity: item.quantity,
          subtotal: product.price * item.quantity,
        };
      })
      .filter((item) => item !== null);
  }, [cart, availableProducts]);

  const cartCount = cartProducts.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const cartTotal = cartProducts.reduce(
    (total, item) => total + item.subtotal,
    0,
  );

  const addToCart = useCallback(
    (productId: string) => {
      const product = products.find(
        (candidate) =>
          candidate.id === productId && candidate.is_available,
      );

      if (!product) return;

      setCart((current) => {
        const existing = current.find(
          (item) => item.productId === productId,
        );

        if (existing) {
          return current.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity: Math.min(99, item.quantity + 1),
                }
              : item,
          );
        }

        return [...current, { productId, quantity: 1 }];
      });

      setIsDetailsOpen(false);
    },
    [products],
  );

  function changeQuantity(productId: string, change: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: Math.min(99, item.quantity + change),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) =>
      current.filter((item) => item.productId !== productId),
    );
  }

  function openCustomerDetails() {
    setSubmitError("");
    setIsCartOpen(false);
    setIsDetailsOpen(true);
  }

  function returnToCart() {
    setIsDetailsOpen(false);
    setIsReviewOpen(false);
    setSubmitError("");
    setIsCartOpen(true);
  }

  function saveCustomerDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = customerName.trim();
    const phone = customerPhone.trim();
    const address = customerAddress.trim();
    const notes = customerNotes.trim();

    if (name.length < 2 || name.length > 100) return;
    if (phone.length < 3 || phone.length > 30) return;
    if (address.length < 5 || address.length > 300) return;
    if (notes.length > 500) return;

    const details: CustomerDetails = {
      name,
      phone,
      address,
      notes,
    };

    try {
      localStorage.setItem(detailsStorageKey, JSON.stringify(details));
    } catch {
      // Do not prevent the current session from continuing.
    }

    setCustomerName(name);
    setCustomerPhone(phone);
    setCustomerAddress(address);
    setCustomerNotes(notes);
    setDetailsSaved(true);
    setSubmitError("");
    setIsDetailsOpen(false);
    setIsReviewOpen(true);
  }

  async function submitOrder() {
    if (isSubmitting) return;

    if (cartProducts.length === 0) {
      setSubmitError("السلة فارغة. أضف المنتجات قبل تأكيد الطلب.");
      return;
    }

    const name = customerName.trim();
    const phone = customerPhone.trim();
    const address = customerAddress.trim();
    const notes = customerNotes.trim();

    if (
      name.length < 2 ||
      name.length > 100 ||
      phone.length < 3 ||
      phone.length > 30 ||
      address.length < 5 ||
      address.length > 300 ||
      notes.length > 500
    ) {
      setSubmitError("بيانات العميل غير مكتملة أو غير صالحة. عدّل بياناتك وحاول مجددًا.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const orderPayload = {
        customerName: name,
        customerPhone: phone,
        customerAddress: address,
        customerNotes: notes,
        items: cartProducts.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      };
      const fingerprint = JSON.stringify(orderPayload);
      let requestKey = "";

      try {
        const savedAttempt = localStorage.getItem(orderAttemptStorageKey);
        if (savedAttempt) {
          const parsed: unknown = JSON.parse(savedAttempt);
          if (
            typeof parsed === "object" && parsed !== null &&
            "fingerprint" in parsed && parsed.fingerprint === fingerprint &&
            "requestKey" in parsed && typeof parsed.requestKey === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.requestKey)
          ) {
            requestKey = parsed.requestKey;
          }
        }
      } catch {
        // A new key is generated if local storage contains invalid data.
      }

      if (!requestKey) {
        requestKey = crypto.randomUUID();
        try {
          localStorage.setItem(orderAttemptStorageKey, JSON.stringify({ fingerprint, requestKey }));
        } catch {
          // The order can still be submitted, but retry protection requires browser storage.
        }
      }

      const response = await fetch(
        `/api/store/${encodeURIComponent(storeSlug)}/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...orderPayload, requestKey }),
        },
      );

      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "تعذر إنشاء الطلب. تحقق من اتصالك وحاول مجددًا.";

        setSubmitError(message);
        return;
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("order" in result) ||
        typeof result.order !== "object" ||
        result.order === null
      ) {
        setSubmitError(
          "وصل رد غير متوقع من الخادم. تحقق من صفحة الطلبات قبل محاولة الإرسال مرة أخرى.",
        );
        return;
      }

      const order = result.order as Record<string, unknown>;

      if (
        typeof order.order_id !== "string" ||
        (typeof order.order_number !== "string" &&
          typeof order.order_number !== "number") ||
        !Number.isFinite(Number(order.total))
      ) {
        setSubmitError(
          "تعذر قراءة تأكيد الطلب من الخادم. تحقق من صفحة الطلبات قبل إعادة المحاولة.",
        );
        return;
      }

      const confirmation: OrderConfirmation = {
        order_id: order.order_id,
        order_number: order.order_number,
        total: Number(order.total),
      };

      // Clear the retry token only after the server confirms the order.
      try {
        const savedAttempt = localStorage.getItem(orderAttemptStorageKey);
        if (savedAttempt) {
          const parsed: unknown = JSON.parse(savedAttempt);
          if (typeof parsed === "object" && parsed !== null && "requestKey" in parsed && parsed.requestKey === requestKey) {
            localStorage.removeItem(orderAttemptStorageKey);
          }
        }
      } catch {
        // The confirmed order should not be blocked by browser storage errors.
      }

      // Clear the cart only after the server confirms order creation.
      setCart([]);
      setIsReviewOpen(false);
      setIsCartOpen(false);
      setIsDetailsOpen(false);
      setOrderConfirmation(confirmation);
    } catch {
      setSubmitError(
        "تعذر الاتصال بالخادم. إذا لم تتأكد من حالة الطلب، تحقق من المتجر قبل محاولة إرساله مجددًا.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeOrderConfirmation() {
    setOrderConfirmation(null);
  }

  return (
    <CartContext.Provider value={{ addToCart, cartCount }}>
      {children}

      {/* Sticky cart summary */}
      {cartCount > 0 && (
        <div
          dir="rtl"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur"
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-500">
                سلتك · {cartCount}{" "}
                {cartCount === 1 ? "منتج" : "منتجات"}
              </p>
              <p className="truncate font-bold text-slate-900">
                {formatPrice(cartTotal)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              عرض السلة
            </button>
          </div>
        </div>
      )}

      {/* Cart dialog */}
      {isCartOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsCartOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2
                  id="cart-title"
                  className="text-xl font-bold text-slate-900"
                >
                  سلة المشتريات
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  راجع المنتجات والكميات قبل المتابعة.
                </p>
              </div>

              <button
                type="button"
                aria-label="إغلاق السلة"
                onClick={() => setIsCartOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-700 hover:bg-slate-200"
              >
                ×
              </button>
            </div>

            {cartProducts.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center">
                <p className="font-semibold text-slate-800">
                  سلتك فارغة
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  أضف بعض المنتجات للمتابعة.
                </p>

                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                >
                  متابعة التسوق
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {cartProducts.map((item) => (
                    <article
                      key={item.id}
                      className="flex gap-3 border-b border-slate-100 pb-4"
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400">
                            لا توجد صورة
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-semibold text-slate-900">
                          {item.name}
                        </h3>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatPrice(item.price)}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-2 py-1">
                            <button
                              type="button"
                              aria-label={`تقليل كمية ${item.name}`}
                              onClick={() =>
                                changeQuantity(item.id, -1)
                              }
                              className="h-7 w-7 rounded-lg text-lg text-slate-700 hover:bg-slate-100"
                            >
                              −
                            </button>

                            <span className="min-w-5 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              aria-label={`زيادة كمية ${item.name}`}
                              disabled={item.quantity >= 99}
                              onClick={() =>
                                changeQuantity(item.id, 1)
                              }
                              className="h-7 w-7 rounded-lg text-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                          >
                            حذف
                          </button>
                        </div>
                      </div>

                      <div className="shrink-0 self-start text-sm font-bold text-slate-900">
                        {formatPrice(item.subtotal)}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 p-4">
                  <span className="font-medium text-slate-600">
                    إجمالي المنتجات
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatPrice(cartTotal)}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-amber-800">
                  الإجمالي لا يشمل رسوم التوصيل. سيبلغك المتجر برسوم
                  التوصيل عند تأكيد الطلب.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    متابعة التسوق
                  </button>

                  <button
                    type="button"
                    onClick={openCustomerDetails}
                    className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {detailsSaved
                      ? "متابعة الطلب"
                      : "متابعة الطلب"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* Customer details dialog */}
      {isDetailsOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsDetailsOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-details-title"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="customer-details-title"
                  className="text-xl font-bold text-slate-900"
                >
                  بيانات العميل
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  أدخل بيانات التواصل وعنوان التوصيل.
                </p>
              </div>

              <button
                type="button"
                aria-label="إغلاق بيانات العميل"
                onClick={() => setIsDetailsOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-700 hover:bg-slate-200"
              >
                ×
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
              <p className="font-bold">تنبيه بخصوص التوصيل</p>
              <p>
                أسعار المنتجات لا تشمل رسوم التوصيل. سيُبلغك المتجر
                بسعر التوصيل عند تأكيد الطلب.
              </p>
            </div>

            <form
              onSubmit={saveCustomerDetails}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="customer-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>

                <input
                  id="customer-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={customerName}
                  onChange={(event) => {
                    setCustomerName(event.target.value);
                    setDetailsSaved(false);
                  }}
                  placeholder="أدخل اسمك"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-phone"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  رقم الهاتف <span className="text-red-500">*</span>
                </label>

                <input
                  id="customer-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  minLength={3}
                  maxLength={30}
                  value={customerPhone}
                  onChange={(event) => {
                    setCustomerPhone(event.target.value);
                    setDetailsSaved(false);
                  }}
                  placeholder="أدخل رقم الهاتف"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-address"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  عنوان التوصيل <span className="text-red-500">*</span>
                </label>

                <input
                  id="customer-address"
                  name="address"
                  type="text"
                  autoComplete="street-address"
                  required
                  minLength={5}
                  maxLength={300}
                  value={customerAddress}
                  onChange={(event) => {
                    setCustomerAddress(event.target.value);
                    setDetailsSaved(false);
                  }}
                  placeholder="المدينة، المنطقة، الشارع وأقرب علامة مميزة"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-notes"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  ملاحظات إضافية
                  <span className="font-normal text-slate-400">
                    {" "}
                    (اختياري)
                  </span>
                </label>

                <textarea
                  id="customer-notes"
                  name="notes"
                  rows={3}
                  maxLength={500}
                  value={customerNotes}
                  onChange={(event) => {
                    setCustomerNotes(event.target.value);
                    setDetailsSaved(false);
                  }}
                  placeholder="أي تفاصيل تريد إبلاغ المتجر بها..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                إجمالي المنتجات الحالي:{" "}
                <strong>{formatPrice(cartTotal)}</strong>
                <p className="mt-1 text-xs text-amber-800">
                  لم يتم إرسال الطلب بعد. ستراجع تفاصيله قبل التأكيد.
                  رسوم التوصيل غير مشمولة.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={returnToCart}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  رجوع للسلة
                </button>

                <button
                  type="submit"
                  disabled={!detailsHydrated || cartProducts.length === 0}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  مراجعة الطلب
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Order review dialog */}
      {isReviewOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-review-title"
            className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="order-review-title"
                  className="text-xl font-bold text-slate-900"
                >
                  مراجعة الطلب
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  تأكد من المنتجات وعنوان التوصيل قبل تأكيد طلبك.
                </p>
              </div>

              <button
                type="button"
                aria-label="إغلاق مراجعة الطلب"
                onClick={() => setIsReviewOpen(false)}
                disabled={isSubmitting}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {cartProducts.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                السلة فارغة. أضف منتجات للمتابعة.
              </div>
            ) : (
              <>
                <div className="mb-5 space-y-3">
                  {cartProducts.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-bold text-slate-900">
                        {formatPrice(item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mb-5 rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-600">
                      إجمالي المنتجات
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatPrice(cartTotal)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    رسوم التوصيل غير مشمولة. سيحدد المتجر رسوم التوصيل
                    ويبلغك بها عند متابعة الطلب.
                  </p>
                </div>

                <div className="mb-5 rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-900">
                      بيانات التوصيل
                    </h3>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setIsReviewOpen(false);
                        setIsDetailsOpen(true);
                      }}
                      className="text-sm font-semibold text-slate-700 underline underline-offset-4 disabled:opacity-50"
                    >
                      تعديل
                    </button>
                  </div>

                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-slate-500">الاسم</dt>
                      <dd className="mt-1 break-words font-medium text-slate-900">
                        {customerName}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">رقم الهاتف</dt>
                      <dd dir="auto" className="mt-1 break-words font-medium text-slate-900">
                        {customerPhone}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">عنوان التوصيل</dt>
                      <dd className="mt-1 break-words font-medium leading-6 text-slate-900">
                        {customerAddress}
                      </dd>
                    </div>

                    {customerNotes.trim() && (
                      <div>
                        <dt className="text-slate-500">
                          الملاحظات الإضافية
                        </dt>
                        <dd className="mt-1 break-words leading-6 text-slate-900">
                          {customerNotes}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {submitError && (
                  <div
                    role="alert"
                    className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"
                  >
                    {submitError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={returnToCart}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    رجوع للسلة
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || cartProducts.length === 0}
                    onClick={submitOrder}
                    className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "جارٍ إرسال الطلب..." : "تأكيد الطلب"}
                  </button>
                </div>

                {isSubmitting && (
                  <p
                    role="status"
                    className="mt-3 text-center text-sm text-slate-500"
                  >
                    يرجى الانتظار وعدم إغلاق الصفحة حتى تنتهي العملية.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {/* Successful order confirmation */}
      {orderConfirmation && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-success-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-700">
              ✓
            </div>

            <h2
              id="order-success-title"
              className="mt-4 text-2xl font-bold text-slate-900"
            >
              تم استلام طلبك بنجاح
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              تم إنشاء الطلب. احتفظ برقم الطلب للرجوع إليه عند التواصل
              مع المتجر.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">رقم الطلب</p>
              <p className="mt-1 break-words text-2xl font-bold text-slate-900">
                {orderConfirmation.order_number}
              </p>

              <div className="my-4 border-t border-slate-200" />

              <p className="text-sm text-slate-500">
                إجمالي المنتجات المعتمد
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {formatPrice(orderConfirmation.total)}
              </p>

              <p className="mt-2 text-xs leading-5 text-amber-800">
                الإجمالي لا يشمل رسوم التوصيل. سيبلغك المتجر بها.
              </p>
            </div>

            <button
              type="button"
              onClick={closeOrderConfirmation}
              className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              متابعة التسوق
            </button>
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
  const context = useContext(CartContext);
  const [justAdded, setJustAdded] = useState(false);

  if (!context) {
    throw new Error(
      "AddToCartButton must be used inside StorefrontCartProvider",
    );
  }

  function handleAdd() {
  const cartContext = context;
  if (!cartContext) return;

  cartContext.addToCart(productId);
  setJustAdded(true);

  window.setTimeout(() => {
    setJustAdded(false);
  }, 1200);
}

  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-label={`إضافة ${productName} إلى السلة`}
      className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99]"
    >
      {justAdded ? "تمت الإضافة ✓" : "أضف إلى السلة"}
    </button>
  );
}