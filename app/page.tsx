import Link from "next/link";

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      {diagonal ? (
        <path d="M7 17 17 7M7 7h10v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function StoreIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 10.5V20h16v-9.5M3 4h18l-1.5 6.5a2.5 2.5 0 0 1-4.5 1.1 3.1 3.1 0 0 1-5 0 2.5 2.5 0 0 1-4.5-1.1L3 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FeatureIcon({ kind }: { kind: "shop" | "box" | "chart" | "phone" }) {
  const paths = {
    shop: <><path d="M3 10h18l-1.5-6h-15L3 10Z" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 5-6" /></>,
    phone: <><rect x="6" y="2.5" width="12" height="19" rx="2" /><path d="M10 18.5h4" /></>,
  };
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f5ef] text-[#147d58]">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>
    </div>
  );
}

export default function Home() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#fbfaf7] text-[#172a25] selection:bg-[#c9f0de] selection:text-[#103d2d]">
      <header className="relative z-10 border-b border-[#e7e9e2] bg-[#fbfaf7]/90">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="متجري - الرئيسية">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#173f32] text-[#e8f7ee] shadow-sm">
              <StoreIcon className="h-5 w-5" />
            </span>
            <span className="text-xl font-black tracking-tight">متجري<span className="text-[#29936b]">.</span></span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#62716a] md:flex">
            <a href="#features" className="transition hover:text-[#147d58]">المميزات</a>
            <a href="#how-it-works" className="transition hover:text-[#147d58]">كيف يعمل؟</a>
            <a href="#for-whom" className="transition hover:text-[#147d58]">لمن متجري؟</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-[#34483f] transition hover:bg-[#edf1eb] sm:inline-flex">تسجيل الدخول</Link>
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-[#173f32] px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(23,63,50,0.14)] transition hover:-translate-y-0.5 hover:bg-[#205744]">
              ابدأ الآن <ArrowIcon />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute -left-36 top-10 h-80 w-80 rounded-full bg-[#d9f0e2] opacity-60 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute right-[38%] top-0 h-64 w-64 rounded-full bg-[#f5e8d0] opacity-50 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:pt-28">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#dce8dc] bg-white/80 px-3.5 py-2 text-xs font-bold text-[#38755b] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#2da574]" />
              تجارتك على الإنترنت، ببساطة
            </div>
            <h1 className="text-[2.65rem] leading-[1.22] font-black tracking-[-0.045em] text-[#17352b] sm:text-6xl sm:leading-[1.16] lg:text-[4.25rem]">
              متجرك الإلكتروني،
              <span className="relative mt-1 block text-[#23835d]">من غير وجع راس.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-[#66746d] sm:text-lg sm:leading-9">
              أنشئ واجهة متجر مرتبة، أضف منتجاتك وأسعارك، واستقبل طلبات زبائنك من مكان واحد. ركّز على تجارتك، وخلي متجري يهتم بالباقي.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/dashboard" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#173f32] px-7 text-base font-extrabold text-white shadow-[0_12px_28px_rgba(23,63,50,0.18)] transition hover:-translate-y-0.5 hover:bg-[#205744]">
                أنشئ متجرك <ArrowIcon />
              </Link>
              <a href="#how-it-works" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#dce3da] bg-white/70 px-6 text-sm font-bold text-[#42564c] transition hover:bg-white">
                اكتشف كيف يعمل <span className="text-lg">↓</span>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#6d7a72]">
              <span className="inline-flex items-center gap-2"><CheckIcon /> بدون تعقيد تقني</span>
              <span className="inline-flex items-center gap-2"><CheckIcon /> منتجات وطلبات في مكان واحد</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] lg:me-0">
            <div aria-hidden="true" className="absolute -inset-4 rounded-[34px] border border-[#e3e9df] sm:-inset-6" />
            <div className="relative overflow-hidden rounded-[28px] border border-[#e0e6dc] bg-white shadow-[0_28px_90px_rgba(35,65,49,0.13)]">
              <div className="flex items-center justify-between border-b border-[#edf0e9] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e5f4eb] text-[#247d57]"><StoreIcon className="h-4 w-4" /></span>
                  <div><p className="text-sm font-extrabold">لوحة متجري</p><p className="mt-0.5 text-[11px] text-[#839087]">نظرة عامة على تجارتك</p></div>
                </div>
                <span className="rounded-full bg-[#eaf6ee] px-3 py-1.5 text-[11px] font-bold text-[#248057]">متجرك جاهز</span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-6">
                <div className="rounded-2xl border border-[#edf0e9] bg-[#fcfcfa] p-4">
                  <div className="flex items-center justify-between text-xs text-[#7a877e]"><span>الطلبات</span><span className="text-base">↗</span></div>
                  <p className="mt-4 text-3xl font-black tracking-tight text-[#1a3f30]">24</p>
                  <p className="mt-1 text-[11px] text-[#7b887f]">تظهر هنا عند وصولها</p>
                </div>
                <div className="rounded-2xl border border-[#edf0e9] bg-[#fcfcfa] p-4">
                  <div className="flex items-center justify-between text-xs text-[#7a877e]"><span>المنتجات</span><span className="text-base">▦</span></div>
                  <p className="mt-4 text-3xl font-black tracking-tight text-[#1a3f30]">12</p>
                  <p className="mt-1 text-[11px] text-[#7b887f]">كل منتجاتك في مكان واحد</p>
                </div>
              </div>
              <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                <div className="overflow-hidden rounded-2xl border border-[#edf0e9]">
                  <div className="flex items-center justify-between bg-[#f8faf6] px-4 py-3"><p className="text-xs font-extrabold">آخر الطلبات</p><span className="text-[11px] font-semibold text-[#248057]">عرض الكل</span></div>
                  <div className="divide-y divide-[#f0f1eb]">
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f6ead8] text-sm">📦</span><div><p className="text-xs font-bold">طلب جديد</p><p className="mt-1 text-[11px] text-[#8a948c]">منتجات متعددة · قبل قليل</p></div></div>
                      <span className="shrink-0 rounded-full bg-[#fff1d8] px-2.5 py-1.5 text-[10px] font-bold text-[#93671f]">جديد</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e3f3e9] text-sm">✓</span><div><p className="text-xs font-bold">طلب قيد التجهيز</p><p className="mt-1 text-[11px] text-[#8a948c]">تحديث الحالة بسهولة</p></div></div>
                      <span className="shrink-0 rounded-full bg-[#e8f4ed] px-2.5 py-1.5 text-[10px] font-bold text-[#28734f]">قيد التجهيز</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -left-2 top-[48%] hidden -translate-x-1/4 rounded-2xl border border-[#e4e9df] bg-white p-3.5 shadow-[0_12px_30px_rgba(25,60,43,0.12)] sm:block">
                <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4f4e9] text-[#248057]"><CheckIcon /></span><div><p className="text-xs font-extrabold">إدارة أسهل</p><p className="mt-1 text-[10px] text-[#89938b]">من مكان واحد</p></div></div>
              </div>
            </div>
            <p className="mt-4 text-center text-[11px] text-[#929b93]">تصوّر توضيحي للوحة التحكم — الأرقام المعروضة تجريبية</p>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-[#e8ebe4] bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-extrabold text-[#25815b]">كل الأساسيات، بدون زحمة</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#193a2e] sm:text-4xl">كل ما تحتاجه لتبدأ البيع</h2>
            <p className="mt-4 text-base leading-8 text-[#718078]">أدوات واضحة تساعدك على ترتيب متجرك ومتابعة الطلبات، من غير أن تضيع وقتك في التفاصيل التقنية.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { kind: "shop" as const, title: "واجهة متجر خاصة بك", desc: "صفحة مرتبة تعرض منتجاتك وأسعارك بطريقة سهلة لزبائنك." },
              { kind: "box" as const, title: "إدارة المنتجات", desc: "أضف الصور والأسعار والتصنيفات، وحدّث منتجاتك وقت ما تحتاج." },
              { kind: "chart" as const, title: "متابعة الطلبات", desc: "شاهد طلبات الزبائن وحدّث حالتها من لوحة إدارة واحدة." },
              { kind: "phone" as const, title: "تجربة تناسب الهاتف", desc: "متجر واضح وسهل التصفح على الهاتف والكمبيوتر." },
            ].map((feature) => (
              <article key={feature.title} className="group rounded-3xl border border-[#e8ece5] bg-[#fdfdfa] p-6 transition duration-200 hover:-translate-y-1 hover:border-[#c8e2d0] hover:shadow-[0_16px_40px_rgba(26,63,43,0.06)]">
                <FeatureIcon kind={feature.kind} />
                <h3 className="mt-5 text-base font-extrabold text-[#244536]">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#78857d]">{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
          <div>
            <p className="text-sm font-extrabold text-[#25815b]">البداية أبسط مما تتوقع</p>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-[#193a2e] sm:text-4xl">من فكرة صغيرة إلى متجر جاهز للزبائن.</h2>
            <p className="mt-5 text-base leading-8 text-[#718078]">ما تحتاجش تكون مبرمج أو تعرف كيف تبني موقع. جهّز منتجاتك، رتّب واجهتك، وابدأ بمشاركة رابط متجرك.</p>
            <Link href="/dashboard" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-[#217a55] transition hover:gap-3">ابدأ من لوحة التحكم <ArrowIcon /></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { number: "01", title: "أنشئ متجرك", desc: "ابدأ بإعداد اسم متجرك ومعلوماته الأساسية." },
              { number: "02", title: "أضف منتجاتك", desc: "أدخل صور المنتجات وأسعارها وتفاصيلها." },
              { number: "03", title: "استقبل الطلبات", desc: "شارك رابط متجرك وتابع طلبات الزبائن." },
            ].map((step) => (
              <div key={step.number} className="relative rounded-3xl border border-[#e3e9df] bg-white p-6">
                <span className="text-xs font-black tracking-[0.18em] text-[#2a9167]">{step.number}</span>
                <div className="my-5 h-px w-full bg-[#e7ece4]" />
                <h3 className="text-base font-extrabold text-[#244536]">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#78857d]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="for-whom" className="px-5 pb-20 sm:px-8 sm:pb-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-[#173f32] px-6 py-12 text-white sm:px-12 sm:py-16 lg:px-16">
          <div aria-hidden="true" className="absolute -left-12 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -left-1 top-0 h-56 w-56 rounded-full border border-white/10" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-bold text-[#a6e3c3]">ابدأ بخطوة واحدة</p>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">تجارتك تستحق مكانًا خاصًا بها.</h2>
              <p className="mt-4 max-w-xl text-sm leading-8 text-[#d0e0d6] sm:text-base">سواء كنت تبيع منتجات منزلية، ملابس، إكسسوارات أو غيرها — رتّب منتجاتك وطلباتك في تجربة واحدة أوضح لك ولزبائنك.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/dashboard" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#e5f5eb] px-6 text-sm font-extrabold text-[#173f32] transition hover:-translate-y-0.5 hover:bg-white">أنشئ متجرك الآن <ArrowIcon /></Link>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/20 px-6 text-sm font-bold text-white transition hover:bg-white/10">عندي حساب بالفعل</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e4e9e1] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#173f32] text-white"><StoreIcon className="h-4 w-4" /></span>
            <span className="font-black text-[#173f32]">متجري.</span>
          </Link>
          <p className="text-xs leading-6 text-[#879189]">أدوات أبسط لتجارة إلكترونية أكثر ترتيبًا.</p>
          <div className="flex items-center gap-5 text-xs font-semibold text-[#65736a]">
            <Link href="/login" className="transition hover:text-[#147d58]">تسجيل الدخول</Link>
            <Link href="/dashboard" className="transition hover:text-[#147d58]">لوحة التحكم</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
