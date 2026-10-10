
"use client";

import {
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { updateProduct, uploadProductImage } from "./actions";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  category_id: string | null;
};

type Props = {
  product: Product;
  categories: Category[];
  onCancel: () => void;
};

export default function ProductEditForm({
  product,
  categories,
  onCancel,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [imagePath, setImagePath] = useState("");
  const [preview, setPreview] = useState("");
  const [price, setPrice] = useState(String(product.price));
  const [compareAtPrice, setCompareAtPrice] = useState(
    product.compare_at_price == null
      ? ""
      : String(product.compare_at_price)
  );
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const currentPrice = Number(price);
  const oldPrice = Number(compareAtPrice);

  const discount =
    compareAtPrice.trim() !== "" &&
    Number.isFinite(currentPrice) &&
    Number.isFinite(oldPrice) &&
    oldPrice > currentPrice &&
    oldPrice > 0
      ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100)
      : null;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    if (preview) URL.revokeObjectURL(preview);

    setFile(selected);
    setImagePath("");
    setMessage("");
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
      setMessage("ارفع الصورة الجديدة أولًا.");
      return;
    }

    if (
      compareAtPrice.trim() !== "" &&
      (!Number.isFinite(oldPrice) || oldPrice <= currentPrice)
    ) {
      setMessage("يجب أن يكون السعر قبل الخصم أكبر من السعر الحالي.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("productId", product.id);
    formData.set("imagePath", imagePath);

    startTransition(async () => {
      await updateProduct(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor={`edit-name-${product.id}`}
          className="mb-2 block text-sm font-medium"
        >
          اسم المنتج *
        </label>
        <input
          id={`edit-name-${product.id}`}
          name="name"
          required
          maxLength={120}
          defaultValue={product.name}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
        />
      </div>

      <div>
        <label
          htmlFor={`edit-price-${product.id}`}
          className="mb-2 block text-sm font-medium"
        >
          السعر الحالي *
        </label>
        <input
          id={`edit-price-${product.id}`}
          name="price"
          type="number"
          required
          min="0"
          step="0.01"
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
        />
      </div>

      <div>
        <label
          htmlFor={`edit-compare-price-${product.id}`}
          className="mb-2 block text-sm font-medium"
        >
          السعر قبل الخصم (اختياري)
        </label>
        <input
          id={`edit-compare-price-${product.id}`}
          name="compareAtPrice"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="اتركه فارغًا إذا لم يوجد خصم"
          value={compareAtPrice}
          onChange={(event) => setCompareAtPrice(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
        />

        {discount !== null && (
          <p className="mt-2 text-sm font-medium text-green-700">
            خصم {discount}% — توفير{" "}
            {(oldPrice - currentPrice).toFixed(2)}
          </p>
        )}

        {compareAtPrice.trim() !== "" &&
          Number.isFinite(currentPrice) &&
          Number.isFinite(oldPrice) &&
          oldPrice <= currentPrice && (
            <p className="mt-2 text-sm text-red-700">
              يجب أن يكون السعر قبل الخصم أكبر من السعر الحالي.
            </p>
          )}
      </div>

      <div>
        <label
          htmlFor={`edit-category-${product.id}`}
          className="mb-2 block text-sm font-medium"
        >
          التصنيف
        </label>
        <select
          id={`edit-category-${product.id}`}
          name="categoryId"
          defaultValue={product.category_id ?? ""}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
        >
          <option value="">بدون تصنيف</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`edit-description-${product.id}`}
          className="mb-2 block text-sm font-medium"
        >
          وصف المنتج
        </label>
        <textarea
          id={`edit-description-${product.id}`}
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={product.description ?? ""}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
        />
      </div>

      <div className="space-y-3">
        <label
          htmlFor={`edit-image-${product.id}`}
          className="block text-sm font-medium"
        >
          تغيير صورة المنتج (اختياري)
        </label>

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="معاينة الصورة الجديدة"
            className="h-32 w-32 rounded-xl border border-slate-200 object-cover"
          />
        ) : product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={`صورة ${product.name}`}
            className="h-32 w-32 rounded-xl border border-slate-200 object-cover"
          />
        ) : (
          <p className="text-sm text-slate-500">لا توجد صورة حالية.</p>
        )}

        <input
          id={`edit-image-${product.id}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={isPending}
          className="block w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2"
        />

        {file && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={isPending || !!imagePath}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          >
            {imagePath
              ? "تم رفع الصورة"
              : isPending
                ? "جارٍ التنفيذ..."
                : "رفع الصورة الجديدة"}
          </button>
        )}
      </div>

      <input type="hidden" name="imagePath" value={imagePath} />

      {message && (
        <p role="status" className="text-sm text-slate-700">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm hover:bg-white"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}