
"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { createProduct, uploadProductImage } from "./actions";

type Category = {
  id: string;
  name: string;
};

export default function ProductCreateForm({
  categories,
}: {
  categories: Category[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [imagePath, setImagePath] = useState("");
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    setFile(selected);
    setImagePath("");
    setMessage("");

    if (preview) URL.revokeObjectURL(preview);
    setPreview(selected ? URL.createObjectURL(selected) : "");
  }

  function handleUpload() {
    if (!file) {
      setMessage("اختر صورة أولًا.");
      return;
    }

    setMessage("");

    const formData = new FormData();
    formData.set("image", file);

    startTransition(async () => {
      const result = await uploadProductImage(formData);

      if (!result.ok) {
        setImagePath("");
        setMessage(result.error);
        return;
      }

      setImagePath(result.path);
      setMessage("تم رفع الصورة بنجاح.");
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (file && !imagePath) {
      setMessage("ارفع الصورة أولًا، أو أزلها إذا كنت لا تريد صورة للمنتج.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("imagePath", imagePath);

    startTransition(async () => {
      await createProduct(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="product-name"
          className="mb-2 block text-sm font-medium"
        >
          اسم المنتج *
        </label>
        <input
          id="product-name"
          name="name"
          required
          maxLength={120}
          placeholder="مثال: قميص قطني"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
        />
      </div>

      <div>
        <label
          htmlFor="product-price"
          className="mb-2 block text-sm font-medium"
        >
          السعر *
        </label>
        <input
          id="product-price"
          name="price"
          type="number"
          required
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
        />
        <p className="mt-2 text-xs text-slate-500">
          أدخل السعر بالعملة التي تعتمدها لمتجرك.
        </p>
      </div>

      <div>
        <label
          htmlFor="product-category"
          className="mb-2 block text-sm font-medium"
        >
          التصنيف (اختياري)
        </label>
        <select
          id="product-category"
          name="categoryId"
          defaultValue=""
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
        >
          <option value="">بدون تصنيف</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {categories.length === 0 && (
          <p className="mt-2 text-xs text-slate-500">
            لم تنشئ تصنيفات بعد. يمكنك إضافة المنتج دون تصنيف.
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="product-description"
          className="mb-2 block text-sm font-medium"
        >
          وصف المنتج (اختياري)
        </label>
        <textarea
          id="product-description"
          name="description"
          rows={4}
          maxLength={2000}
          placeholder="اكتب وصفًا مختصرًا للمنتج..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
        />
      </div>

      <div className="space-y-3">
        <label
          htmlFor="product-image"
          className="block text-sm font-medium"
        >
          صورة المنتج (اختياري)
        </label>

        <input
          id="product-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={isPending}
          className="block w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2"
        />

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="معاينة صورة المنتج"
            className="h-40 w-40 rounded-xl border border-slate-200 object-cover"
          />
        )}

        {file && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={isPending || !!imagePath}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {imagePath
              ? "تم رفع الصورة"
              : isPending
                ? "جارٍ تنفيذ العملية..."
                : "رفع الصورة"}
          </button>
        )}

        {file && imagePath && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (preview) URL.revokeObjectURL(preview);
              setFile(null);
              setPreview("");
              setImagePath("");
              setMessage("");
            }}
            className="ms-2 text-sm text-red-700 hover:underline"
          >
            إزالة الصورة
          </button>
        )}

        {message && (
          <p role="status" className="text-sm text-slate-600">
            {message}
          </p>
        )}
      </div>

      <input type="hidden" name="imagePath" value={imagePath} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "جارٍ الحفظ..." : "حفظ المنتج"}
        </button>

        <a
          href="/dashboard"
          className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-medium hover:bg-slate-50"
        >
          إلغاء
        </a>
      </div>
    </form>
  );
}