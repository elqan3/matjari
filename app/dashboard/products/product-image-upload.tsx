
"use client";

import { useRef, useState, useTransition } from "react";
import { uploadProductImage } from "./actions";

type Props = {
  onUploaded: (path: string) => void;
};

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProductImageUpload({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function handleUpload() {
    const file = inputRef.current?.files?.[0];

    if (!file) {
      setMessage("اختر صورة أولًا.");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage("الصيغ المسموحة: JPG وPNG وWebP.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage("يجب ألا يتجاوز حجم الصورة 2 MB.");
      return;
    }

    const formData = new FormData();
    formData.set("image", file);
    setMessage("");

    startTransition(async () => {
      const result = await uploadProductImage(formData);

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      onUploaded(result.path);
      setMessage("تم رفع الصورة. يمكنك الآن حفظ المنتج.");
    });
  }

  return (
    <div>
      <label
        htmlFor="product-image"
        className="mb-2 block text-sm font-medium"
      >
        صورة المنتج (اختيارية)
      </label>

      <input
        ref={inputRef}
        id="product-image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={pending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          setMessage("");
          setPreview(null);
          onUploaded("");

          if (!file) return;

          if (!ALLOWED_TYPES.includes(file.type)) {
            setMessage("الصيغ المسموحة: JPG وPNG وWebP.");
            event.target.value = "";
            return;
          }

          if (file.size > MAX_IMAGE_SIZE) {
            setMessage("يجب ألا يتجاوز حجم الصورة 2 MB.");
            event.target.value = "";
            return;
          }

          setPreview(URL.createObjectURL(file));
        }}
        className="block w-full text-sm text-slate-600 file:ml-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-medium file:text-slate-800"
      />

      {preview && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="معاينة صورة المنتج"
            className="h-36 w-36 rounded-xl border border-slate-200 object-cover"
          />

          <button
            type="button"
            onClick={handleUpload}
            disabled={pending}
            className="mt-3 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {pending ? "جارٍ رفع الصورة..." : "رفع الصورة"}
          </button>
        </div>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm text-slate-600">
          {message}
        </p>
      )}
    </div>
  );
}