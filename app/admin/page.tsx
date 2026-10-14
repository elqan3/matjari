import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  owner_id: string;
};

type OrderRow = {
  id: string;
  order_number: number;
  customer_name: string;
  status: string;
  total: number;
  created_at: string;
  store_id: string;
};

const numberFormat = new Intl.NumberFormat("ar-LY");
const moneyFormat = new Intl.NumberFormat("ar-LY", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Icon({ name }: { name: "grid" | "store" | "users" | "box" | "orders" | "external" }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    store: <><path d="M4 10.5V20h16v-9.5M3 4h18l-1.5 6.5a2.5 2.5 0 0 1-4.5 1.1 3.1 3.1 0 0 1-5 0 2.5 2.5 0 0 1-4.5-1.1L3 4Z" /><path d="M9 20v-5h6v5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></>,
    orders: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">{paths[name]}</svg>;
}

function MetricCard({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: "store" | "users" | "box" | "orders" }) {
  return (
    <article className="rounded-2xl border border-[#e8ece5] bg-white p-5 shadow-[0_3px_14px_rgba(27,53,39,0.025)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#6e7d73]">{label}</p>
          <p className="mt-4 text-3xl font-black tracking-tight text-[#183c2e] tabular-nums">{numberFormat.format(value)}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf4ed] text-[#26754e]"><Icon name={icon} /></span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#8a968e]">{detail}</p>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    preparing: "قيد التجهيز",
    ready: "جاهز",
    completed: "مكتمل",
    cancelled: "ملغي",
    rejected: "مرفوض",
  };
  const isDone = ["completed", "ready"].includes(status);
  const isCancelled = ["cancelled", "rejected"].includes(status);
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${isDone ? "bg-emerald-50 text-emerald-700" : isCancelled ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{labels[status] ?? status}</span>;
}

function SetupNotice({ missing }: { missing: string[] }) {
  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f5f7f3] px-5 py-12 text-[#18372a]">
      <section className="w-full max-w-xl rounded-[28px] border border-[#e1e8df] bg-white p-7 shadow-sm sm:p-10">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f4eb] text-[#246847]"><Icon name="grid" /></span>
        <p className="mt-6 text-sm font-bold text-[#29805a]">متجري · إعداد الإدارة</p>
        <h1 className="mt-2 text-2xl font-black">بقي إعداد أمان واحد قبل التفعيل</h1>
        <p className="mt-3 text-sm leading-7 text-[#68776d]">واجهة الإدارة موجودة، لكنها لن تعرض أي بيانات حتى تُضبط متغيرات الخادم المطلوبة في إعدادات بيئة Vercel.</p>
        <div className="mt-6 rounded-2xl bg-[#f7f9f5] p-4">
          <p className="text-xs font-bold text-[#53665a]">المتغيرات المطلوبة</p>
          <ul className="mt-3 space-y-2 font-mono text-sm text-[#244b37]" dir="ltr">
            {missing.map((item) => <li key={item} className="rounded-lg border border-[#e4eae1] bg-white px-3 py-2">{item}</li>)}
          </ul>
        </div>
        <p className="mt-5 text-xs leading-6 text-[#7c8980]">ضعها في إعدادات المشروع على Vercel ضمن Environment Variables، واجعل مفتاح الخدمة متاحًا للخادم فقط، ثم أعد نشر المشروع.</p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-[#173f32] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#205744]">العودة إلى لوحة المتجر</Link>
      </section>
    </main>
  );
}

export default async function AdminPage() {
  await connection();

  const sessionClient = await createClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) redirect("/login");

  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && user.email?.trim().toLowerCase() !== adminEmail) redirect("/dashboard");

  const missing: string[] = [];
  if (!adminEmail) missing.push("SUPER_ADMIN_EMAIL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (missing.length) return <SetupNotice missing={missing} />;

  const adminDb = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [
    storesCount,
    usersCount,
    productsCount,
    ordersCount,
    recentStoresResult,
    recentOrdersResult,
  ] = await Promise.all([
    adminDb.from("stores").select("id", { count: "exact", head: true }),
    adminDb.from("profiles").select("id", { count: "exact", head: true }),
    adminDb.from("products").select("id", { count: "exact", head: true }),
    adminDb.from("orders").select("id", { count: "exact", head: true }),
    adminDb.from("stores").select("id,name,slug,owner_id,created_at").order("created_at", { ascending: false }).limit(7),
    adminDb.from("orders").select("id,order_number,customer_name,status,total,created_at,store_id").order("created_at", { ascending: false }).limit(7),
  ]);

  const firstError = [storesCount, usersCount, productsCount, ordersCount, recentStoresResult, recentOrdersResult].find((result) => result.error)?.error;
  if (firstError) {
    console.error("Super admin overview query failed:", firstError.message);
    throw new Error("تعذر تحميل لوحة الإدارة العامة. راجع صلاحيات قاعدة البيانات ومتغيرات البيئة.");
  }

  const recentStores = (recentStoresResult.data ?? []) as StoreRow[];
  const recentOrders = (recentOrdersResult.data ?? []) as OrderRow[];
  const ownerIds = [...new Set(recentStores.map((store) => store.owner_id))];
  const storeIds = [...new Set(recentOrders.map((order) => order.store_id))];

  const [profilesResult, orderStoresResult] = await Promise.all([
    ownerIds.length ? adminDb.from("profiles").select("id,email").in("id", ownerIds) : Promise.resolve({ data: [], error: null }),
    storeIds.length ? adminDb.from("stores").select("id,name,slug").in("id", storeIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const owners = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.email ?? "—"]));
  const storeNames = new Map((orderStoresResult.data ?? []).map((store) => [store.id, store.name]));

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f7f3] text-[#18372a]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[250px] shrink-0 border-l border-[#e4e9e1] bg-white px-5 py-7 lg:flex lg:flex-col">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#173f32] text-white"><Icon name="store" /></span>
            <span className="text-xl font-black tracking-tight">متجري<span className="text-[#29936b]">.</span><span className="mt-1 block text-[11px] font-semibold text-[#8a978d]">إدارة المنصة</span></span>
          </Link>
          <div className="mt-10">
            <p className="mb-3 px-3 text-[10px] font-extrabold tracking-widest text-[#9aa59d]">المنصة</p>
            <a href="#overview" className="flex items-center gap-3 rounded-xl bg-[#eaf4ed] px-3 py-3 text-sm font-bold text-[#1e6846]"><Icon name="grid" /> نظرة عامة</a>
            <Link href="/admin/subscriptions" className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#65756a] transition hover:bg-[#f5f7f3] hover:text-[#1e6846]"><Icon name="store" /> المتاجر والاشتراكات</Link>
            <a href="#stores" className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#65756a] transition hover:bg-[#f5f7f3] hover:text-[#1e6846]"><Icon name="store" /> المتاجر</a>
            <a href="#orders" className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#65756a] transition hover:bg-[#f5f7f3] hover:text-[#1e6846]"><Icon name="orders" /> الطلبات</a>
          </div>
          <div className="mt-auto rounded-2xl border border-[#e6ece4] bg-[#f8faf6] p-4">
            <span className="inline-flex rounded-full bg-[#e2f3e8] px-2.5 py-1 text-[10px] font-extrabold text-[#247349]">صلاحية مالك المنصة</span>
            <p className="mt-3 break-all text-xs font-semibold text-[#455b4c]">{user.email}</p>
            <p className="mt-1 text-[11px] leading-5 text-[#87948a]">وصول إداري منفصل عن حسابات أصحاب المتاجر.</p>
            <form action="/auth/signout" method="post" className="mt-4 border-t border-[#e4e9e1] pt-3"><button className="text-xs font-bold text-[#65756a] hover:text-red-700">تسجيل الخروج</button></form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e4e9e1] bg-[#ffffffed] px-4 py-4 backdrop-blur sm:px-7 lg:px-10">
            <div className="flex items-center gap-3 lg:hidden"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#173f32] text-white"><Icon name="store" /></span><span className="font-black">متجري<span className="text-[#29936b]">.</span></span></div>
            <div className="hidden lg:block"><p className="text-xs font-medium text-[#87948a]">مساحة الإدارة</p><p className="mt-1 text-sm font-extrabold">نظرة عامة على المنصة</p></div>
            <div className="flex items-center gap-3"><Link href="/admin/subscriptions" className="inline-flex items-center rounded-xl border border-[#dfe7dc] bg-white px-3 py-2.5 text-xs font-bold text-[#45604e]">الاشتراكات</Link><span className="hidden max-w-56 truncate rounded-full border border-[#e1e8df] bg-white px-3 py-2 text-xs font-semibold text-[#5c6e61] sm:inline-flex">{user.email}</span><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-[#dfe7dc] bg-white px-3 py-2.5 text-xs font-bold text-[#45604e] transition hover:bg-[#f4f7f2]">لوحة المتجر <Icon name="external" /></Link></div>
          </header>

          <div className="mx-auto max-w-[1380px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10 lg:py-10">
            <section id="overview" className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><p className="text-sm font-bold text-[#2c8a5b]">مركز التحكم</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">أهلًا بك في إدارة متجري.</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#758278]">نظرة موحدة على حجم المنصة ونشاط المتاجر والطلبات، من دون الدخول إلى حسابات أصحاب المتاجر.</p></div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#dfe9df] bg-white px-3 py-2 text-xs font-bold text-[#617266]"><span className="h-2 w-2 rounded-full bg-[#38a66c]" /> البيانات مباشرة من قاعدة البيانات</span>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="إجمالي المتاجر" value={storesCount.count ?? 0} detail="كل المتاجر المسجلة على المنصة" icon="store" />
              <MetricCard label="الحسابات المسجلة" value={usersCount.count ?? 0} detail="الحسابات التي لها ملف مستخدم" icon="users" />
              <MetricCard label="المنتجات" value={productsCount.count ?? 0} detail="إجمالي المنتجات في جميع المتاجر" icon="box" />
              <MetricCard label="الطلبات" value={ordersCount.count ?? 0} detail="كل الطلبات المسجلة عبر المتاجر" icon="orders" />
            </section>

            <section id="stores" className="mt-8 overflow-hidden rounded-2xl border border-[#e5ebe2] bg-white">
              <div className="flex flex-col gap-2 border-b border-[#edf0eb] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div><h2 className="font-black">أحدث المتاجر</h2><p className="mt-1 text-xs text-[#849087]">آخر المتاجر التي أُنشئت على المنصة</p></div>
                <span className="text-xs font-semibold text-[#7b897f]">{numberFormat.format(storesCount.count ?? 0)} متجر إجمالًا</span>
              </div>
              {recentStores.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-right text-sm"><thead className="bg-[#fafbf8] text-xs text-[#7b897f]"><tr><th className="px-6 py-3 font-semibold">المتجر</th><th className="px-6 py-3 font-semibold">البريد المرتبط بالمالك</th><th className="px-6 py-3 font-semibold">تاريخ الإنشاء</th><th className="px-6 py-3 font-semibold">الرابط</th></tr></thead><tbody className="divide-y divide-[#f0f2ed]">{recentStores.map((store) => <tr key={store.id} className="transition hover:bg-[#fcfdfb]"><td className="px-6 py-4"><p className="font-bold text-[#2a4535]">{store.name}</p><p className="mt-1 font-mono text-[11px] text-[#8a968d]">{store.slug}</p></td><td className="px-6 py-4 text-xs text-[#6f7c72]">{owners.get(store.owner_id) ?? "—"}</td><td className="whitespace-nowrap px-6 py-4 text-xs text-[#77847a]">{formatDate(store.created_at)}</td><td className="px-6 py-4"><Link href={`/store/${store.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#27754d] hover:underline">فتح المتجر <Icon name="external" /></Link></td></tr>)}</tbody></table></div> : <div className="px-6 py-12 text-center text-sm text-[#849087]">لا توجد متاجر مسجلة حتى الآن.</div>}
            </section>

            <section id="orders" className="mt-8 overflow-hidden rounded-2xl border border-[#e5ebe2] bg-white">
              <div className="flex flex-col gap-2 border-b border-[#edf0eb] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="font-black">أحدث الطلبات</h2><p className="mt-1 text-xs text-[#849087]">متابعة النشاط على مستوى المنصة</p></div><span className="text-xs font-semibold text-[#7b897f]">{numberFormat.format(ordersCount.count ?? 0)} طلب إجمالًا</span></div>
              {recentOrders.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-right text-sm"><thead className="bg-[#fafbf8] text-xs text-[#7b897f]"><tr><th className="px-6 py-3 font-semibold">رقم الطلب</th><th className="px-6 py-3 font-semibold">المتجر</th><th className="px-6 py-3 font-semibold">العميل</th><th className="px-6 py-3 font-semibold">القيمة</th><th className="px-6 py-3 font-semibold">الحالة</th><th className="px-6 py-3 font-semibold">التاريخ</th></tr></thead><tbody className="divide-y divide-[#f0f2ed]">{recentOrders.map((order) => <tr key={order.id} className="transition hover:bg-[#fcfdfb]"><td className="whitespace-nowrap px-6 py-4 font-bold text-[#344c3b]">#{numberFormat.format(order.order_number)}</td><td className="px-6 py-4 text-xs font-semibold text-[#53675a]">{storeNames.get(order.store_id) ?? "متجر غير معروف"}</td><td className="px-6 py-4 text-xs text-[#6f7c72]">{order.customer_name}</td><td className="whitespace-nowrap px-6 py-4 text-xs font-bold text-[#344c3b]">{moneyFormat.format(Number(order.total))} د.ل</td><td className="px-6 py-4"><StatusPill status={order.status} /></td><td className="whitespace-nowrap px-6 py-4 text-xs text-[#77847a]">{formatDate(order.created_at)}</td></tr>)}</tbody></table></div> : <div className="px-6 py-12 text-center text-sm text-[#849087]">لا توجد طلبات مسجلة حتى الآن.</div>}
            </section>

            <footer className="flex flex-col gap-2 px-1 pb-4 pt-8 text-[11px] leading-5 text-[#879389] sm:flex-row sm:items-center sm:justify-between"><span>متجري · لوحة الإدارة العامة</span><span>إحصاءات الطلبات تمثل نشاط المتاجر، وليست إيرادات المنصة.</span></footer>
          </div>
        </div>
      </div>
    </main>
  );
}
