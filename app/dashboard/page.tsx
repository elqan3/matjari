
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

async function DashboardContent() {
  await connection();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug")
    .eq("owner_id", data.claims.sub)
    .maybeSingle();

  if (storeError) {
    console.error("Failed to load store:", storeError);
    throw new Error(
      `تعذر تحميل بيانات المتجر (${storeError.code ?? "unknown"}).`
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <Link href="/" className="text-lg font-bold">
            متجري
          </Link>

          <form action="/auth/signout" method="post">
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">
              تسجيل الخروج
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-slate-500">لوحة التحكم</p>
        <h1 className="mt-2 text-3xl font-bold">أهلًا بك في متجري</h1>

        {store ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">{store.name}</h2>
            <p className="mt-2 text-sm text-slate-500">
              رابط المتجر: /store/{store.slug}
            </p>
            <p className="mt-5 text-sm text-slate-600">
              الخطوة التالية هي بناء إدارة المنتجات والطلبات.
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">لننشئ متجرك الأول</h2>
            <p className="mt-2 text-sm text-slate-600">
              حسابك جاهز، لكن لم تنشئ متجرًا بعد. سنضيف نموذج إنشاء المتجر في المرحلة التالية.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main dir="rtl" className="min-h-screen bg-slate-50 p-8">
          جارٍ تحميل لوحة التحكم...
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}