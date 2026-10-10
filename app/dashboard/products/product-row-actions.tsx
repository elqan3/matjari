
"use client";

import { useState } from "react";
import ProductEditForm from "./product-edit-form";
import { deleteProduct, setProductAvailability } from "./actions";

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
  isAvailable: boolean;
};

export default function ProductRowActions({
  product,
  categories,
  isAvailable,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setEditing((value) => !value);
            setConfirmDelete(false);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
        >
          {editing ? "إغلاق التعديل" : "تعديل"}
        </button>

        <form action={setProductAvailability}>
          <input type="hidden" name="productId" value={product.id} />
          <input
            type="hidden"
            name="available"
            value={String(!isAvailable)}
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            {isAvailable ? "إيقاف التوفر" : "إعادة التوفر"}
          </button>
        </form>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(true);
              setEditing(false);
            }}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            حذف
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-red-700">
              هل تريد حذف هذا المنتج؟
            </span>

            <form action={deleteProduct}>
              <input
                type="hidden"
                name="productId"
                value={product.id}
              />
              <button
                type="submit"
                className="rounded-lg bg-red-700 px-3 py-2 text-sm text-white hover:bg-red-800"
              >
                نعم، احذف
              </button>
            </form>

            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <ProductEditForm
            product={product}
            categories={categories}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
    </div>
  );
}