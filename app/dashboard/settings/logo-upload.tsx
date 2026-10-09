
"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveStoreLogo } from "./actions";

type LogoUploadProps = {
  userId: string;
  storeId: string;
  initialLogoUrl: string | null;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function LogoUpload({
  userId,
  storeId,
  initialLogoUrl,
}: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];

    if (!file) {
      setMessage("اختر صورة أولًا.");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage("الصيغ المسموحة: JPG وPNG وWebP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setMessage("يجب ألا يتجاوز حجم الصورة 2 MB.");
      return;
    }

    setMessage("");
    setIsUploading(true);

    try {
      const supabase = createClient();
     const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const extension = extensionByType[file.type];
const objectPath = `${userId}/${storeId}/logo-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("store-assets")
        .upload(objectPath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "0",
        });

      if (uploadError) {
        console.error("Logo upload failed:", uploadError);
        setMessage("تعذر رفع الصورة. تحقق من اتصالك ثم حاول مجددًا.");
        return;
      }

      startTransition(async () => {
        const result = await saveStoreLogo(objectPath);

        if (!result.ok) {
          setMessage(result.error);
          return;
        }

        setLogoUrl(result.logoUrl);
        setPreviewUrl(null);
        setMessage("تم تحديث شعار المتجر بنجاح.");

        if (inputRef.current) {
          inputRef.current.value = "";
        }
      });
    } catch (error) {
      console.error("Unexpected logo upload error:", error);
      setMessage("حدث خطأ غير متوقع أثناء رفع الصورة.");
    } finally {
      setIsUploading(false);
    }
  }

  const busy = isUploading || isPending;

  return (
    <section className="mt-8 border-t border-slate-200 pt-6">
      <h2 className="text-lg font-semibold">شعار المتجر</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        اختر صورة واضحة لشعار متجرك. الصيغ المسموحة JPG وPNG وWebP،
        وبحجم لا يتجاوز 2 MB.
      </p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {previewUrl || logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl || logoUrl || ""}
              alt="معاينة شعار المتجر"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="px-2 text-center text-xs text-slate-400">
              لا يوجد شعار
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];

              setMessage("");
              setPreviewUrl(null);

              if (!file) return;

              if (!ALLOWED_TYPES.includes(file.type)) {
                setMessage("الصيغ المسموحة: JPG وPNG وWebP.");
                event.target.value = "";
                return;
              }

              if (file.size > MAX_FILE_SIZE) {
                setMessage("يجب ألا يتجاوز حجم الصورة 2 MB.");
                event.target.value = "";
                return;
              }

              setPreviewUrl(URL.createObjectURL(file));
            }}
            className="block w-full text-sm text-slate-600 file:ml-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-medium file:text-slate-800"
          />

          <button
            type="button"
            onClick={handleUpload}
            disabled={busy}
            className="mt-3 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "جارٍ رفع الشعار..." : "رفع الشعار وحفظه"}
          </button>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className="mt-4 text-sm leading-6 text-slate-700"
        >
          {message}
        </p>
      )}
    </section>
  );
}