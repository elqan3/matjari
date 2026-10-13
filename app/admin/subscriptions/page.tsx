export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_PLANS, getEffectiveSubscriptionStatus, isPlanCode } from "@/lib/subscriptions";
import { updateStoreSubscription } from "./actions";

type Props = { searchParams: Promise<{ error?: string; saved?: string }> };

const statusLabels = { trial: "تجربة مجانية", active: "نشط", suspended: "موقوف", expired: "منتهي", missing: "غير مهيأ" } as const;
const dateFormat = new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium" });

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing admin database configuration.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function SubscriptionsContent({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) redirect("/login");
  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || user.email?.trim().toLowerCase() !== adminEmail) redirect("/dashboard");

  const db = adminDb();
  const [{ data: stores, error: storesError }, { data: profiles }, { data: subscriptions }, { data: requests }] = await Promise.all([
    db.from("stores").select("id,name,slug,owner_id,created_at").order("created_at", { ascending: false }),
    db.from("profiles").select("id,email"),
    db.from("store_subscriptions").select("store_id,status,plan_code,trial_ends_at,started_at,ends_at,admin_note,updated_at"),
    db.from("subscription_plan_requests").select("id,store_id,requested_plan,status,created_at").eq("status","pending").order("created_at",{ascending:true}),
  ]);
  if (storesError) throw new Error("تعذر تحميل المتاجر.");
  const owners = new Map((profiles ?? []).map((profile) => [profile.id, profile.email ?? "—"]));
  const subs = new Map((subscriptions ?? []).map((subscription) => [subscription.store_id, subscription]));
  const pendingByStore = new Map<string, typeof requests>();
  for (const request of requests ?? []) {
    const existing = pendingByStore.get(request.store_id) ?? [];
    pendingByStore.set(request.store_id, [...existing, request]);
  }
  const counts = { trial: 0, active: 0, suspended: 0, expired: 0, missing: 0 };
  for (const store of stores ?? []) {
    const sub = subs.get(store.id);
    counts[getEffectiveSubscriptionStatus(sub as Parameters<typeof getEffectiveSubscriptionStatus>[0])] += 1;
  }
  const errorMessages: Record<string,string> = { invalid: "تحقق من بيانات الخطة والحالة.", save: "تعذر حفظ الاشتراك. تحقق من السجل وحاول مجددًا." };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f7f3] px-4 py-7 text-[#18372a] sm:px-7 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><Link href="/admin" className="text-sm text-[#718077] hover:text-[#172a25]">← لوحة الإدارة العامة</Link><p className="mt-5 text-sm font-bold text-[#2c8a5b]">إدارة المنصة</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">المتاجر والاشتراكات</h1><p className="mt-2 text-sm leading-6 text-[#758278]">تعيين الخطط، تمديد المدة، وإيقاف أو إعادة تفعيل المتاجر يدويًا.</p></div>
          <Link href="/dashboard" className="rounded-xl border border-[#dfe7dc] bg-white px-4 py-3 text-sm font-bold text-[#45604e]">لوحة المتجر</Link>
        </div>

        {params.error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorMessages[params.error] ?? "حدث خطأ."}</p>}
        {params.saved === "1" && <p role="status" className="mt-5 rounded-xl border border-[#c8e1cf] bg-[#eaf3ed] p-3 text-sm text-[#215c3d]">تم تحديث الاشتراك بنجاح.</p>}

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {Object.entries(counts).map(([key,value]) => <article key={key} className="rounded-2xl border border-[#e5ebe2] bg-white p-4"><p className="text-xs text-[#7b897f]">{statusLabels[key as keyof typeof statusLabels]}</p><p className="mt-2 text-2xl font-black tabular-nums">{new Intl.NumberFormat("ar-LY").format(value)}</p></article>)}
        </section>

        <section className="mt-7 space-y-4">
          {(stores ?? []).map((store) => {
            const sub = subs.get(store.id);
            const state = getEffectiveSubscriptionStatus(sub as Parameters<typeof getEffectiveSubscriptionStatus>[0]);
            const pending = pendingByStore.get(store.id) ?? [];
            const currentPlan = sub?.plan_code && isPlanCode(sub.plan_code) ? sub.plan_code : "basic";
            return (
              <article key={store.id} className="rounded-2xl border border-[#e5ebe2] bg-white p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0"><h2 className="break-words text-lg font-black">{store.name}</h2><p className="mt-1 font-mono text-xs text-[#829087]">{store.slug}</p><p className="mt-2 break-all text-sm text-[#65756a]">{owners.get(store.owner_id) ?? "—"}</p><p className="mt-2 text-xs text-[#8a968d]">أُنشئ في {dateFormat.format(new Date(store.created_at))}</p></div>
                  <div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#eaf3ed] px-3 py-1.5 text-xs font-bold text-[#21664b]">{statusLabels[state]}</span>{sub?.plan_code && isPlanCode(sub.plan_code) && <span className="rounded-full border border-[#e5e9e1] px-3 py-1.5 text-xs font-bold">{SUBSCRIPTION_PLANS[sub.plan_code].name}</span>}</div>
                </div>
                {pending.length > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">طلبات اشتراك جديدة</p>{pending.map((request) => <p key={request.id} className="mt-2 text-sm text-amber-900">طلب خطة {SUBSCRIPTION_PLANS[request.requested_plan as keyof typeof SUBSCRIPTION_PLANS]?.name ?? request.requested_plan} · {dateFormat.format(new Date(request.created_at))}</p>)}<p className="mt-2 text-xs text-amber-800">اختر الخطة نفسها في النموذج أدناه، وحدد الحالة «نشط» لتفعيل الطلب.</p></div>}
                <form action={updateStoreSubscription} className="mt-5 grid gap-3 border-t border-[#edf0eb] pt-5 sm:grid-cols-2 xl:grid-cols-5">
                  <input type="hidden" name="storeId" value={store.id} />
                  <label className="text-xs font-bold text-[#627268]">الخطة<select name="planCode" defaultValue={currentPlan} className="mt-2 w-full rounded-xl border border-[#d7e0d6] bg-white px-3 py-3 text-sm font-semibold text-[#18372a]">{Object.entries(SUBSCRIPTION_PLANS).map(([code,plan]) => <option key={code} value={code}>{plan.name} · {plan.price} د.ل/شهر</option>)}</select></label>
                  <label className="text-xs font-bold text-[#627268]">الحالة<select name="status" defaultValue={sub?.status === "suspended" ? "suspended" : state === "active" ? "active" : state === "trial" ? "trial" : "suspended"} className="mt-2 w-full rounded-xl border border-[#d7e0d6] bg-white px-3 py-3 text-sm font-semibold text-[#18372a]"><option value="trial">تجربة مجانية (30 يومًا)</option><option value="active">نشط باشتراك مدفوع</option><option value="suspended">إيقاف المتجر</option></select></label>
                  <label className="text-xs font-bold text-[#627268]">مدة الاشتراك<select name="durationDays" defaultValue="30" className="mt-2 w-full rounded-xl border border-[#d7e0d6] bg-white px-3 py-3 text-sm font-semibold text-[#18372a]"><option value="30">30 يومًا</option><option value="90">90 يومًا</option><option value="365">سنة (365 يومًا)</option></select></label>
                  <label className="text-xs font-bold text-[#627268] sm:col-span-2">ملاحظة داخلية<textarea name="adminNote" maxLength={500} defaultValue={sub?.admin_note ?? ""} rows={1} placeholder="اختياري" className="mt-2 w-full rounded-xl border border-[#d7e0d6] px-3 py-3 text-sm font-medium" /></label>
                  <div className="flex items-end"><button className="w-full rounded-xl bg-[#173f32] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#205744]">حفظ وتطبيق</button></div>
                </form>
              </article>
            );
          })}
          {(stores ?? []).length === 0 && <div className="rounded-2xl border border-[#e5ebe2] bg-white p-10 text-center text-sm text-[#718077]">لا توجد متاجر بعد.</div>}
        </section>
        <footer className="mt-8 text-xs leading-6 text-[#879389]">التفعيل اليدوي لا يستقبل أموالًا ولا يتحقق من الدفع تلقائيًا. تحقق من استلام المبلغ قبل تفعيل الخطة. الأسعار المعروضة اقتراح أولي قابل للتغيير.</footer>
      </div>
    </main>
  );
}

export default function AdminSubscriptionsPage(props: Props) {
  return <SubscriptionsContent {...props} />;
}