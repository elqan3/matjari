import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_PLANS, getEffectiveSubscriptionStatus, isPlanCode } from "@/lib/subscriptions";
import { requestSubscriptionPlan } from "./actions";

type Props = { searchParams: Promise<{ error?: string; requested?: string }> };

const statusLabels = {
  trial: "تجربة مجانية",
  active: "اشتراك نشط",
  suspended: "موقوف من الإدارة",
  expired: "انتهت المدة",
  missing: "غير مهيأ",
} as const;

async function SubscriptionContent({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims, error: authError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (authError || typeof userId !== "string") redirect("/login");

  const { data: store } = await supabase.from("stores")
    .select("id, name").eq("owner_id", userId).maybeSingle();
  if (!store) redirect("/dashboard/create-store");

  const [{ data: subscription }, { data: requests }] = await Promise.all([
    supabase.from("store_subscriptions")
      .select("status, plan_code, trial_ends_at, started_at, ends_at, admin_note")
      .eq("store_id", store.id).maybeSingle(),
    supabase.from("subscription_plan_requests")
      .select("id, requested_plan, status, created_at")
      .eq("store_id", store.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const effectiveStatus = getEffectiveSubscriptionStatus(subscription as Parameters<typeof getEffectiveSubscriptionStatus>[0]);
  const pending = (requests ?? []).find((request) => request.status === "pending");
  const endDate = subscription?.status === "trial" ? subscription.trial_ends_at : subscription?.ends_at;
  const daysRemaining = endDate ? Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000) : null;
  const needsExpiryNotice = (effectiveStatus === "trial" || effectiveStatus === "active") &&
    daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;
  const errors: Record<string, string> = {
    invalid: "الخطة المختارة غير صالحة.",
    already_active: "اشتراكك نشط بالفعل. تواصل معنا إذا كنت تريد تغيير الخطة.",
    pending: "لديك طلب اشتراك قيد المراجعة بالفعل.",
    save: "تعذر إرسال الطلب. حاول مجددًا.",
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f8f5] px-4 py-8 text-[#172a25] sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm text-[#718077] hover:text-[#172a25]">العودة إلى لوحة التحكم</Link>
        <header className="mt-6">
          <p className="text-sm font-bold text-[#2b8a62]">اشتراك متجرك</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">{store.name}</h1>
          <p className="mt-3 text-sm leading-7 text-[#718077]">تبدأ المتاجر بتجربة مجانية لمدة 30 يومًا. عند اختيار خطة، يصل طلبك إلى إدارة متجري لتأكيده يدويًا.</p>
        </header>

        {params.error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errors[params.error] ?? "حدث خطأ غير متوقع."}</p>}
        {params.requested === "1" && <p role="status" className="mt-5 rounded-xl border border-[#c8e1cf] bg-[#eaf3ed] p-3 text-sm text-[#215c3d]">تم إرسال طلبك. سنفعّل الخطة بعد مراجعة الدفع.</p>}

        {needsExpiryNotice && <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">تنبيه: {effectiveStatus === "trial" ? "ستنتهي التجربة المجانية" : "سينتهي الاشتراك"} {daysRemaining === 0 ? "اليوم" : `خلال ${daysRemaining} يومًا`}. أرسل طلب الخطة قبل انتهاء المدة لتجنب توقف المتجر.</p>}

        <section className="mt-6 rounded-2xl border border-[#e5e9e1] bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm text-[#718077]">حالة الاشتراك</p><h2 className="mt-1 text-xl font-black">{statusLabels[effectiveStatus]}</h2></div>
            {subscription?.plan_code && isPlanCode(subscription.plan_code) && <span className="rounded-full bg-[#eaf3ed] px-3 py-1.5 text-xs font-bold text-[#21664b]">{SUBSCRIPTION_PLANS[subscription.plan_code].name}</span>}
          </div>
          {endDate && <p className="mt-3 text-sm text-[#718077]">{effectiveStatus === "trial" ? "تنتهي التجربة في: " : "تنتهي المدة الحالية في: "}{new Intl.DateTimeFormat("ar-LY", { dateStyle: "long" }).format(new Date(endDate))}</p>}
          {pending && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">طلب خطة {SUBSCRIPTION_PLANS[pending.requested_plan as keyof typeof SUBSCRIPTION_PLANS]?.name ?? pending.requested_plan} قيد المراجعة منذ {new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium" }).format(new Date(pending.created_at))}.</p>}
          {subscription?.admin_note && <p className="mt-3 text-sm leading-6 text-[#718077]">ملاحظة من الإدارة: {subscription.admin_note}</p>}
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-black">اختر خطتك</h2>
          <p className="mt-2 text-sm leading-6 text-[#718077]">الأسعار المقترحة شهريًا بالدينار الليبي. إرسال الطلب لا يخصم أي مبلغ ولا يفعّل الاشتراك تلقائيًا.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(Object.entries(SUBSCRIPTION_PLANS) as [keyof typeof SUBSCRIPTION_PLANS, (typeof SUBSCRIPTION_PLANS)[keyof typeof SUBSCRIPTION_PLANS]][]).map(([code, plan]) => (
              <article key={code} className="flex flex-col rounded-2xl border border-[#e5e9e1] bg-white p-5 sm:p-6">
                <p className="text-sm font-bold text-[#28684b]">{plan.name}</p>
                <p className="mt-3 text-3xl font-black">{plan.price}<span className="mr-1 text-sm font-semibold text-[#718077]">د.ل / شهر</span></p>
                <p className="mt-2 text-sm leading-6 text-[#718077]">{plan.description}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-[#45594c]">{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
                <form action={requestSubscriptionPlan} className="mt-6">
                  <input type="hidden" name="planCode" value={code} />
                  <button disabled={Boolean(pending) || effectiveStatus === "active" || effectiveStatus === "suspended"} className="w-full rounded-xl bg-[#173f32] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#205744] disabled:cursor-not-allowed disabled:bg-[#a8b5ac]">
                    {pending ? "طلبك قيد المراجعة" : effectiveStatus === "active" ? "الخطة مفعّلة" : effectiveStatus === "suspended" ? "تواصل مع الإدارة" : "طلب هذه الخطة"}
                  </button>
                </form>
              </article>
            ))}
          </div>
          <p className="mt-5 text-xs leading-6 text-[#8a968d]">ملاحظة: المزايا الموضحة تخص الإمكانات الحالية. لن نعرض وعودًا مثل نطاق خاص أو تقارير متقدمة قبل تنفيذها فعليًا.</p>
        </section>
      </div>
    </main>
  );
}

export default function SubscriptionPage(props: Props) {
  return <SubscriptionContent {...props} />;
}