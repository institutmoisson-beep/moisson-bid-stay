import { supabase } from "@/integrations/supabase/client";

export const SUPPORTED_CURRENCIES = [
  { code: "XAF", label: "FCFA (XAF)", symbol: "FCFA" },
  { code: "XOF", label: "FCFA (XOF)", symbol: "CFA" },
  { code: "USD", label: "Dollar US", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "Livre Sterling", symbol: "£" },
  { code: "NGN", label: "Naira", symbol: "₦" },
  { code: "GHS", label: "Cedi", symbol: "₵" },
  { code: "KES", label: "Shilling Kenyan", symbol: "KSh" },
  { code: "ZAR", label: "Rand", symbol: "R" },
  { code: "MAD", label: "Dirham", symbol: "MAD" },
  { code: "CNY", label: "Yuan", symbol: "¥" },
  { code: "CAD", label: "Dollar CA", symbol: "CA$" },
  { code: "CHF", label: "Franc Suisse", symbol: "CHF" },
];

export const getCurrencySymbol = (code: string): string => {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)?.symbol || code;
};

export const formatAmount = (amount: number, currency: string): string => {
  const sym = getCurrencySymbol(currency);
  return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${sym}`;
};

export const convertAmount = async (amount: number, from: string, to: string): Promise<number> => {
  if (from === to) return amount;
  const { data } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("base_currency", from)
    .eq("target_currency", to)
    .single();
  if (data) return Math.round(amount * data.rate * 100) / 100;
  return amount;
};

export const fetchAndRefreshRates = async () => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  try {
    await supabase.functions.invoke("exchange-rates");
  } catch (e) {
    console.error("Failed to refresh rates:", e);
  }
};
