import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

function StoreMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#173f32] text-[#e8f7ee] ${small ? "h-9 w-9" : "h-11 w-11"}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={small ? "h-4 w-4" : "h-5 w-5"}>
        <path d="M4 10.5V20h16v-9.5M3 4h18l-1.5 6.5a2.5 2.5 0 0 1-4.5 1.1 3.1 3.1 0 0 1-5 0 2.5 2.5 0 0 1-4.5-1.1L3 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function NavIcon({ kind }: { kind: "home" | "box" | "tag" | "orders" | "settings" | "external" }) {
  const paths = {
    home: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></>,
    tag: <><path d="M20.5 13.5 13 21l-10-10V3h8l9.5 9.5a.7.7 0 0 1 0 1Z" /><circle cx="7.5" cy="7.5" r="1" /></>,
    orders: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.1.9-1.1 1.9-1.4-.5a7.7 7.7 0 0 1-1.6.9l-.3 1.5h-2.2l-.3-1.5a7.7 7.7 0 0 1-1.6-.9l-1.4.5-1.1-1.9 1.1-.9a7 7 0 0 1 0-1.8l-1.1-.9 1.1-1.9 1.4.5a7.7 7.7 0 0 1 1.6-.9l.3-1.5h2.2l.3 1.5a7.7 7.7 0 0 1 1.6.9l1.4-.5 1.1 1.9-1.1.9a7 7 0 0 1 0 1.8Z" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">{paths[kind]}</svg>;
}

const navItems = [
  { href: "/dashboard", label: "نظرة عامة", kind: "home" as const },
  { href: "/dashboard/orders", label: "الطلبات", kind: "orders" as const },
  { href: "/dashboard/products", label: "المنتجات", kind: "box" as const },
  { href: "/dashboard/categories", label: "التصنيفات", kind: "tag" as const },
  { href: "/dashboard/settings", label: "إعدادات المتجر", kind: "settings" as const },
  { href: "/dashboard/subscription", label: "الاشتراك", kind: "settings" as const },
];

async function DashboardContent() {
  await connection();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) redirect("/login");

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug, logo_url")
    .eq("owner_id", data.claims.sub)
    .maybeSingle();

  if (storeError) {
    console.error("Failed to load store:", storeError);
    throw new Error(`تعذر تحميل بيانات المتجر (${storeError.code ?? "unknown"}).`);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f8f5] text-[#172a25]">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-[248px] shrink-0 border-l border-[#e7e9e2] bg-white px-5 py-7 lg:flex lg:flex-col">
          <Link href="/" className="mb-10 flex items-center gap-3">
            <StoreMark />
            <span className="text-xl font-black tracking-tight">متجري<span className="text-[#29936b]">.</span><span className="mt-1 block text-[11px] font-medium tracking-normal text-[#8a9890]">مساحة إدارة متجرك</span></span>
          </Link>
          <p className="mb-3 px-3 text-[11px] font-bold tracking-wider text-[#98a39c]">القائمة الرئيسية</p>
          <nav className="space-y-1">
            {navItems.map((item, index) => (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${index === 0 ? "bg-[#eaf3ed] text-[#174b39]" : "text-[#68766e] hover:bg-[#f5f7f3] hover:text-[#174b39]"}`}>
                <NavIcon kind={item.kind} />{item.label}
                {index === 0 && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-[#29936b]" />}
              </Link>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl bg-[#f3f6f1] p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#28664d]"><NavIcon kind="external" /></div>
            <p className="mt-3 text-sm font-bold">متجرك، بطريقتك</p>
            <p className="mt-1 text-xs leading-5 text-[#77847c]">أدر منتجاتك وطلباتك من مكان واحد.</p>
            {store && <Link href={`/store/${store.slug}`} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#21664b]">عرض المتجر <NavIcon kind="external" /></Link>}
          </div>
          <form action="/auth/signout" method="post" className="mt-5 border-t border-[#edf0e9] pt-4">
            <button className="w-full rounded-xl px-3 py-2.5 text-right text-sm font-semibold text-[#77847c] transition hover:bg-red-50 hover:text-red-700">تسجيل الخروج</button>
          </form>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-[#e7e9e2] bg-white/80 px-4 py-4 sm:px-7 lg:px-10">
            <div className="flex items-center gap-3 lg:hidden"><StoreMark small /><span className="font-black">متجري<span className="text-[#29936b]">.</span></span></div>
            <div className="hidden lg:block"><p className="text-xs font-medium text-[#87938b]">مساحة العمل</p><p className="mt-1 text-sm font-bold">لوحة التحكم</p></div>
            <div className="flex items-center gap-3">
              {store ? <span className="hidden max-w-48 truncate rounded-full border border-[#e7e9e2] bg-white px-3 py-2 text-xs font-semibold text-[#58685f] sm:inline-flex">{store.name}</span> : <span className="text-xs text-[#849087]">حسابك جاهز للبدء</span>}
              <form action="/auth/signout" method="post" className="lg:hidden"><button className="rounded-xl border border-[#dfe6de] px-3 py-2 text-xs font-bold text-[#4e6156]">خروج</button></form>
            </div>
          </header>

          <section className="mx-auto max-w-6xl px-4 py-7 sm:px-7 sm:py-9 lg:px-10 lg:py-11">
            <div className="mb-8">
              <p className="text-sm font-semibold text-[#2b8a62]">أهلًا بك في متجري</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">كل شيء يبدأ من هنا.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#718077] sm:text-base">مساحة واحدة لإدارة متجرك، ترتيب منتجاتك، ومتابعة طلبات عملائك بسهولة.</p>
            </div>

            {store ? (
              <>
                <section className="overflow-hidden rounded-[28px] bg-[#173f32] text-white shadow-[0_16px_45px_rgba(23,63,50,0.12)]">
                  <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
                    <div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#d8eee1]"><span className="h-1.5 w-1.5 rounded-full bg-[#8be0ad]" /> متجرك جاهز للإدارة</span>
                      <div className="mt-5 flex min-w-0 items-center gap-3 sm:gap-4 lg:block"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 sm:h-16 sm:w-16 lg:hidden">{store.logo_url ? <img src={store.logo_url} alt={`شعار ${store.name}`} className="h-full w-full object-contain p-1" /> : <StoreMark small />}</div><h2 className="min-w-0 break-words text-2xl font-black sm:text-3xl lg:mt-0">{store.name}</h2></div>
                      <p className="mt-2 text-sm leading-6 text-white/70">حدّث منتجاتك، راجع الطلبات، واجعل متجرك جاهزًا لاستقبال العملاء.</p>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link href="/dashboard/products" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f6faf6] px-4 py-3 text-sm font-bold text-[#173f32] transition hover:bg-white">إدارة المنتجات <NavIcon kind="box" /></Link>
                        <Link href="/dashboard/orders" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">عرض الطلبات <NavIcon kind="orders" /></Link>
                      </div>
                    </div>
                    <div className="hidden h-36 w-36 items-center justify-center overflow-hidden rounded-[30px] border border-white/15 bg-white/[0.07] lg:flex">{store.logo_url ? <img src={store.logo_url} alt={`شعار ${store.name}`} className="h-full w-full object-contain p-3" /> : <div className="flex h-24 w-24 items-center justify-center rounded-[26px] bg-[#e5f2e8] text-[#173f32]"><StoreMark /></div>}</div>
                  </div>
                </section>

                <div className="mt-8 flex items-center justify-between gap-4">
                  <div><h2 className="text-lg font-black">إدارة المتجر</h2><p className="mt-1 text-sm text-[#7b8980]">اختصر طريقك إلى الأدوات التي تستخدمها يوميًا.</p></div>
                  <Link href={`/store/${store.slug}`} className="hidden items-center gap-2 text-sm font-bold text-[#267451] transition hover:text-[#173f32] sm:inline-flex">زيارة المتجر <NavIcon kind="external" /></Link>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { href: "/dashboard/orders", kind: "orders" as const, title: "الطلبات", description: "راجع طلبات العملاء وحدّث حالتها.", number: "01" },
                    { href: "/dashboard/products", kind: "box" as const, title: "المنتجات", description: "أضف المنتجات وعدّل الأسعار والصور.", number: "02" },
                    { href: "/dashboard/categories", kind: "tag" as const, title: "التصنيفات", description: "رتّب المنتجات لتسهيل تصفحها.", number: "03" },
                    { href: "/dashboard/settings", kind: "settings" as const, title: "إعدادات المتجر", description: "حدّث اسم متجرك ورابطه وبياناته.", number: "04" },
                    { href: "/dashboard/subscription", kind: "settings" as const, title: "الاشتراك والخطط", description: "تابع التجربة المجانية واطلب تفعيل خطة مدفوعة.", number: "05" },
                  ].map((item) => (
                    <Link key={item.href} href={item.href} className="group rounded-2xl border border-[#e5e9e1] bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#bfd8c7] hover:shadow-[0_12px_28px_rgba(31,70,49,0.06)] sm:p-6">
                      <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf3ed] text-[#27694b]"><NavIcon kind={item.kind} /></span><span className="text-xs font-bold text-[#b4beb5]">{item.number}</span></div>
                      <h3 className="mt-5 font-extrabold">{item.title}</h3>
                      <p className="mt-2 min-h-10 text-sm leading-6 text-[#78857d]">{item.description}</p>
                      <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#2b7955]">فتح القسم <span className="transition group-hover:-translate-x-1">←</span></span>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <section className="overflow-hidden rounded-[28px] border border-[#e4e9e0] bg-white">
                <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center lg:p-12">
                  <div>
                    <span className="inline-flex rounded-full bg-[#eaf3ed] px-3 py-1.5 text-xs font-bold text-[#28684b]">خطوة واحدة للبدء</span>
                    <h2 className="mt-5 text-2xl font-black sm:text-3xl">لننشئ متجرك الأول.</h2>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-[#718077]">اختر اسمًا لمتجرك وحدد رابطه، وبعدها يمكنك إضافة منتجاتك والبدء في استقبال الطلبات.</p>
                    <Link href="/dashboard/create-store" className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#173f32] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#205744]">إنشاء المتجر <span>←</span></Link>
                  </div>
                  <div className="hidden h-40 w-40 items-center justify-center rounded-full bg-[#eff5ed] text-[#27694b] lg:flex"><StoreMark /></div>
                </div>
                <div className="grid border-t border-[#edf0e9] bg-[#fbfcf9] sm:grid-cols-3">
                  {["اسم ورابط خاص بمتجرك", "إضافة المنتجات والأسعار", "إدارة الطلبات من مكان واحد"].map((text, index) => <div key={text} className="flex items-center gap-3 border-b border-[#edf0e9] px-6 py-4 text-sm font-semibold text-[#63736a] last:border-0 sm:border-b-0 sm:border-l sm:last:border-l-0"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e5f2e8] text-xs font-black text-[#28684b]">{index + 1}</span>{text}</div>)}
                </div>
              </section>
            )}

            <footer className="mt-10 flex flex-col gap-2 border-t border-[#e5e9e1] pt-5 text-xs text-[#929d95] sm:flex-row sm:items-center sm:justify-between">
              <span>متجري — أدوات بسيطة لتجارة أسهل.</span>
              <Link href="/" className="font-semibold text-[#6e7e73] transition hover:text-[#21664b]">العودة إلى الموقع الرئيسي</Link>
            </footer>
          </section>

          <nav aria-label="التنقل الرئيسي" className="grid grid-cols-6 border-t border-[#e5e9e1] bg-white px-1 py-2 lg:hidden">
            {navItems.map((item, index) => <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-[10px] font-semibold ${index === 0 ? "text-[#21664b]" : "text-[#7d8981]"}`}><NavIcon kind={item.kind} /><span>{item.label}</span></Link>)}
          </nav>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<main dir="rtl" className="min-h-screen bg-[#f7f8f5] p-8 text-[#718077]">جارٍ تحميل لوحة التحكم...</main>}>
      <DashboardContent />
    </Suspense>
  );
}
