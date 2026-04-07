import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from "@/lib/currencies";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface CurrencySelectorProps {
  userId: string;
  currentCurrency: string;
  onCurrencyChange: (currency: string) => void;
  compact?: boolean;
}

const CurrencySelector = ({ userId, currentCurrency, onCurrencyChange, compact }: CurrencySelectorProps) => {
  const { toast } = useToast();

  const handleChange = async (newCurrency: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ currency: newCurrency })
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      onCurrencyChange(newCurrency);
      toast({ title: `Devise changée en ${getCurrencySymbol(newCurrency)}` });
    }
  };

  if (compact) {
    return (
      <select
        value={currentCurrency}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground font-body"
      >
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div>
      <Label className="font-body text-xs text-muted-foreground">Devise du portefeuille</Label>
      <select
        value={currentCurrency}
        onChange={(e) => handleChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-body"
      >
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label} ({c.symbol})
          </option>
        ))}
      </select>
    </div>
  );
};

export default CurrencySelector;
