import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateOrderStatus } from "./actions";
import { Suspense } from "react";
type OrdersPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const statusLabels: Record<string, string> = {
  new: "جديد",
  processing: "قيد المعالجة",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const statusStyles: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  processing: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function OrdersPage(props: OrdersPageProps) {
  return (
    <Suspense
      fallback={
        <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8">
          <div className="mx-auto max-w-5xl animate-pulse">
            <div className="h-8 w-48 rounded bg-slate-200" />
            <div className="mt-6 h-40 rounded-2xl bg-white" />
          </div>
        </main>
      }
    >
      <OrdersContent {...props} />
    </Suspense>
  );
}

async function OrdersContent({ searchParams }: OrdersPageProps) {
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
    console.error("Failed to fetch store:", storeError);
  }

  if (!store) {
    redirect("/dashboard/create-store");
  }

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      customer_name,
      customer_phone,
      customer_address,
      note,
      fulfillment_type,
      status,
      total,
      created_at,
      order_items (
        id,
        product_name,
        price,
        quantity
      )
    `)
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("Failed to fetch orders:", ordersError);
  }

  const errorMessages: Record<string, string> = {
    invalid: "بيانات الطلب أو الحالة غير صالحة.",
    not_found: "لم يتم العثور على الطلب ضمن متجرك.",
    server: "تعذر تنفيذ العملية. حاول مرة أخرى.",
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              ← لوحة التحكم
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              إدارة الطلبات
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              طلبات متجر {store.name}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm text-slate-500">إجمالي الطلبات المعروضة</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {orders?.length ?? 0}
            </p>
          </div>
        </header>

        {params.success === "updated" && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            تم تحديث حالة الطلب بنجاح.
          </div>
        )}

        {params.error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {errorMessages[params.error] ?? "حدث خطأ غير متوقع."}
          </div>
        )}

        {ordersError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            تعذر تحميل الطلبات. تحقق من الاتصال ثم أعد المحاولة.
          </div>
        )}

        {!ordersError && (!orders || orders.length === 0) && (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              لا توجد طلبات حتى الآن
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              ستظهر هنا طلبات الزبائن عندما يرسلون طلباتهم من متجرك.
            </p>
          </section>
        )}

        <div className="space-y-5">
          {orders?.map((order) => (
            <article
              key={order.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    الطلب #{order.order_number}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(order.created_at).toLocaleString("ar-LY", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    statusStyles[order.status] ??
                    "bg-slate-100 text-slate-700"
                  }`}
                >
                  {statusLabels[order.status] ?? order.status}
                </span>
              </div>

              <div className="grid gap-6 p-5 md:grid-cols-2">
                <section className="space-y-3">
                  <h3 className="font-semibold text-slate-900">
                    بيانات الزبون
                  </h3>

                  <p className="text-sm text-slate-700">
                    الاسم: {order.customer_name}
                  </p>

                  <p className="text-sm text-slate-700">
                    الهاتف:{" "}
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="text-blue-700 underline underline-offset-2"
                    >
                      {order.customer_phone}
                    </a>
                  </p>

                  <p className="text-sm text-slate-700">
                    طريقة الاستلام:{" "}
                    {order.fulfillment_type === "delivery"
                      ? "توصيل"
                      : "استلام من المتجر"}
                  </p>

                  {order.customer_address && (
                    <p className="text-sm text-slate-700">
                      العنوان: {order.customer_address}
                    </p>
                  )}

                  {order.note && (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        ملاحظة الزبون
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {order.note}
                      </p>
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="font-semibold text-slate-900">
                    الأصناف المطلوبة
                  </h3>

                  <div className="mt-3 divide-y divide-slate-100">
                    {order.order_items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {item.product_name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {Number(item.price).toFixed(2)} × {item.quantity}
                          </p>
                        </div>

                        <p className="whitespace-nowrap text-sm font-medium text-slate-800">
                          {(Number(item.price) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-4">
                    <span className="font-semibold text-slate-900">
                      الإجمالي
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {Number(order.total).toFixed(2)}
                    </span>
                  </div>
                </section>
              </div>

              <form
                action={updateOrderStatus}
                className="flex flex-wrap items-end gap-3 border-t border-slate-100 bg-slate-50 p-5"
              >
                <input type="hidden" name="orderId" value={order.id} />

                <div className="min-w-48 flex-1">
                  <label
                    htmlFor={`status-${order.id}`}
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    تحديث حالة الطلب
                  </label>

                  <select
                    id={`status-${order.id}`}
                    name="status"
                    defaultValue={order.status}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
                  >
                    <option value="new">جديد</option>
                    <option value="processing">قيد المعالجة</option>
                    <option value="completed">مكتمل</option>
                    <option value="cancelled">ملغي</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  حفظ الحالة
                </button>
              </form>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}