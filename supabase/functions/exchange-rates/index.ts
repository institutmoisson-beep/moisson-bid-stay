import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SUPPORTED_CURRENCIES = ["XAF", "XOF", "USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR", "MAD", "TND", "EGP", "CNY", "JPY", "CAD", "CHF", "BRL", "INR", "AED"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if we have recent rates (less than 1 hour old)
    const { data: existingRates } = await supabase
      .from("exchange_rates")
      .select("*")
      .limit(1);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const needsRefresh = !existingRates?.length || existingRates[0].updated_at < oneHourAgo;

    if (needsRefresh) {
      // Fetch rates from Frankfurter API (free, open source)
      // XAF/XOF are pegged to EUR at fixed rates
      const EUR_XAF = 655.957;
      const EUR_XOF = 655.957;

      const response = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR");
      if (!response.ok) throw new Error("Failed to fetch exchange rates");
      const data = await response.json();
      const eurRates: Record<string, number> = data.rates;
      eurRates["EUR"] = 1;
      eurRates["XAF"] = EUR_XAF;
      eurRates["XOF"] = EUR_XOF;

      // Build all currency pairs for supported currencies
      const upserts: { base_currency: string; target_currency: string; rate: number; updated_at: string }[] = [];
      const now = new Date().toISOString();

      for (const base of SUPPORTED_CURRENCIES) {
        for (const target of SUPPORTED_CURRENCIES) {
          if (base === target) continue;
          if (eurRates[base] && eurRates[target]) {
            const rate = eurRates[target] / eurRates[base];
            upserts.push({ base_currency: base, target_currency: target, rate: Math.round(rate * 1000000) / 1000000, updated_at: now });
          }
        }
      }

      // Upsert in batches
      for (let i = 0; i < upserts.length; i += 50) {
        await supabase.from("exchange_rates").upsert(upserts.slice(i, i + 50), { onConflict: "base_currency,target_currency" });
      }
    }

    // Return all rates
    const { data: rates } = await supabase.from("exchange_rates").select("*");

    return new Response(JSON.stringify({ rates, currencies: SUPPORTED_CURRENCIES }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
