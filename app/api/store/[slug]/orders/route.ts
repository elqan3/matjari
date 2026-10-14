
import "server-only";

import { createClient } from "@supabase/supabase-js";

type OrderItemInput = {
  productId: string;
  quantity: number;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  let body: Record<string, unknown>;

  try {
    const parsed: unknown = await request.json();

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return Response.json(
        { error: "بيانات الطلب غير صالحة." },
        { status: 400 },
      );
    }

    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: "تعذر قراءة بيانات الطلب." },
      { status: 400 },
    );
  }

  const customerName =
    typeof body.customerName === "string"
      ? body.customerName.trim()
      : "";

  const customerPhone =
    typeof body.customerPhone === "string"
      ? body.customerPhone.trim()
      : "";

  const customerAddress =
    typeof body.customerAddress === "string"
      ? body.customerAddress.trim()
      : "";

  const customerNotes =
    typeof body.customerNotes === "string"
      ? body.customerNotes.trim()
      : "";

  if (
    customerName.length < 2 ||
    customerName.length > 100 ||
    customerPhone.length < 3 ||
    customerPhone.length > 30 ||
    customerAddress.length < 5 ||
    customerAddress.length > 300 ||
    customerNotes.length > 500
  ) {
    return Response.json(
      { error: "يرجى مراجعة بيانات العميل." },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(body.items) ||
    body.items.length < 1 ||
    body.items.length > 50
  ) {
    return Response.json(
      { error: "السلة فارغة أو تحتوي على عدد غير صالح من المنتجات." },
      { status: 400 },
    );
  }

  const items: OrderItemInput[] = [];

  for (const value of body.items) {
    if (
      typeof value !== "object" ||
      value === null ||
      !("productId" in value) ||
      !("quantity" in value)
    ) {
      return Response.json(
        { error: "أحد عناصر السلة غير صالح." },
        { status: 400 },
      );
    }

    const item = value as Record<string, unknown>;

    if (
      typeof item.productId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.productId,
      ) ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    ) {
      return Response.json(
        { error: "كمية أو معرّف أحد المنتجات غير صالح." },
        { status: 400 },
      );
    }

    items.push({
      productId: item.productId,
      quantity: item.quantity,
    });
  }

  if (
    new Set(items.map((item) => item.productId)).size !== items.length
  ) {
    return Response.json(
      { error: "تحتوي السلة على منتجات مكررة." },
      { status: 400 },
    );
  }

  const { slug } = await context.params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Order endpoint is missing server Supabase configuration.");

    return Response.json(
      { error: "خدمة الطلبات غير مهيأة حاليًا." },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.rpc("create_store_order", {
    p_store_slug: slug,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_customer_address: customerAddress,
    p_note: customerNotes || null,
    p_items: items,
  });

  if (error) {
    console.error("Order creation failed:", error.code, error.message);

    return Response.json(
      {
        error:
          error.code === "22023"
            ? "تعذر تأكيد الطلب. تحقق من المنتجات والبيانات ثم حاول مجددًا."
            : "تعذر إنشاء الطلب حاليًا. حاول مرة أخرى.",
      },
      { status: error.code === "22023" ? 400 : 500 },
    );
  }

  return Response.json({ order: data }, { status: 201 });
}
