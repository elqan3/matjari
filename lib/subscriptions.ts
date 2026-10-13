export const SUBSCRIPTION_PLANS = {
  basic: {
    name: "أساسي",
    price: 30,
    productLimit: 10,
    themes: ["simple", "terracotta"],
    description: "للبداية وإطلاق متجر صغير",
    features: ["حتى 10 منتجات", "تصميمان للمتجر", "إدارة المنتجات والطلبات"],
  },
  pro: {
    name: "متقدم",
    price: 50,
    productLimit: 30,
    themes: ["simple", "terracotta", "botanical", "midnight", "blush"],
    description: "للمتاجر التي بدأت بالنمو",
    features: ["حتى 30 منتجًا", "جميع التصاميم الحالية", "أولوية في الدعم"],
  },
  professional: {
    name: "احترافي",
    price: 100,
    productLimit: null,
    themes: ["simple", "terracotta", "botanical", "midnight", "blush"],
    description: "للمتاجر ذات الكتالوج الكبير",
    features: ["منتجات غير محدودة", "جميع التصاميم الحالية", "دعم ذو أولوية"],
  },
} as const;

export type PlanCode = keyof typeof SUBSCRIPTION_PLANS;
export type SubscriptionStatus = "trial" | "active" | "suspended";

export function isPlanCode(value: string): value is PlanCode {
  return value in SUBSCRIPTION_PLANS;
}

export function getEffectiveSubscriptionStatus(
  subscription: {
    status: SubscriptionStatus;
    plan_code: string | null;
    trial_ends_at: string;
    ends_at: string | null;
  } | null,
  now = Date.now(),
): "trial" | "active" | "suspended" | "expired" | "missing" {
  if (!subscription) return "missing";
  if (subscription.status === "suspended") return "suspended";
  if (subscription.status === "trial") {
    return new Date(subscription.trial_ends_at).getTime() > now ? "trial" : "expired";
  }
  if (subscription.status === "active" && subscription.plan_code &&
      subscription.ends_at && new Date(subscription.ends_at).getTime() > now) {
    return "active";
  }
  return "expired";
}

export function getProductLimit(subscription: {
  status: SubscriptionStatus;
  plan_code: string | null;
}): number | null {
  if (subscription.status === "trial") return 30;
  if (subscription.status === "active" && subscription.plan_code && isPlanCode(subscription.plan_code)) {
    return SUBSCRIPTION_PLANS[subscription.plan_code].productLimit;
  }
  return 0;
}

export function canUseTheme(
  subscription: { status: SubscriptionStatus; plan_code: string | null },
  theme: string,
): boolean {
  if (subscription.status === "trial") return true;
  if (subscription.status !== "active" || !subscription.plan_code || !isPlanCode(subscription.plan_code)) return false;
  return (SUBSCRIPTION_PLANS[subscription.plan_code].themes as readonly string[]).includes(theme);
}