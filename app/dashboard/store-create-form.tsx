"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StoreCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanSlug = slug.trim().toLowerCase();

    if (!cleanName || cleanName.length > 100) {
      setError("اسم المتجر مطلوب ويجب ألا يتجاوز 100 حرف.");
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug) || cleanSlug.length > 60) {
      setError("اكتب رابطًا إنجليزيًا قصيرًا باستخدام الحروف والأرقام والشرطة فقط، مثل my-store.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error("انتهت جلسة تسجيل الدخول. سجّل الدخول مجددًا.");
      }

      const { error: insertError } = await supabase.from("stores").insert({
        owner_id: userData.user.id,
        name: cleanName,
        slug: cleanSlug,
        description: description.trim() || null,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error("رابط المتجر مستخدم بالفعل. اختر رابطًا آخر.");
        }
        if (insertError.code === "42501") {
          throw new Error("ليست لديك صلاحية إنشاء المتجر. أعد تسجيل الدخول وحاول مجددًا.");
        }
        throw new Error("تعذر إنشاء المتجر. تحقق من البيانات وحاول مجددًا.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء المتجر.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      <div>
        <label htmlFor="store-name" className="mb-1.5 block text-sm font-medium">اسم المتجر</label>
        <input
          id="store-name"
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          placeholder="مثال: متجر القنطري"
        />
      </div>

      <div>
        <label htmlFor="store-slug" className="mb-1.5 block text-sm font-medium">رابط المتجر</label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-slate-900">
          <span className="shrink-0 text-sm text-slate-400">/store/</span>
          <input
            id="store-slug"
            required
            maxLength={60}
            dir="ltr"
            value={slug}
            onChange={(event) => setSlug(event.target.value.replace(/\s+/g, "-"))}
            className="min-w-0 flex-1 py-3 outline-none"
            placeholder="my-store"
            aria-describedby="store-slug-help"
          />
        </div>
        <p id="store-slug-help" className="mt-1.5 text-xs leading-5 text-slate-500">
          استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطة فقط.
        </p>
      </div>

      <div>
        <label htmlFor="store-description" className="mb-1.5 block text-sm font-medium">وصف المتجر (اختياري)</label>
        <textarea
          id="store-description"
          maxLength={1000}
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          placeholder="نبذة قصيرة عن متجرك"
        />
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "جارٍ إنشاء المتجر..." : "إنشاء المتجر"}
      </button>
    </form>
  );
}
