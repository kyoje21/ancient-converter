import path from "path";
import { promises as fs } from "fs";

export default async function handler(req, res) {
  try {
    const { amount = "1", currency = "USD", mode = "modern-to-historical" } = req.query;
    const amt = Number(amount) || 0;
    const apiKey = process.env.FXRATES_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "FXRATES_API_KEY not set." });
    }

    // ✅ Load JSON directly from the filesystem
    const filePath = path.join(process.cwd(), "public", "data", "historical.json");
    const jsonData = await fs.readFile(filePath, "utf-8");
    const historical = JSON.parse(jsonData);

    const cur = String(currency).toUpperCase();

    async function getRate(base, symbols) {
      const url = `https://api.fxratesapi.com/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbols)}`;
      const r = await fetch(url, { headers: { apikey: apiKey } });
      if (!r.ok) throw new Error(`FX API error: ${r.status}`);
      return await r.json();
    }

    let results = [];

    if (mode === "modern-to-historical") {
      const rateData = await getRate(cur, "USD");
      const curToUsd = rateData?.rates?.USD;
      if (!curToUsd) throw new Error("Failed to get rate for provided currency.");
      const amountUsd = amt * curToUsd;

      results = historical.civilizations.map((civ) => {
        const unitUsd = Number(civ.modern_usd) || 0;
        const unitsEquivalent = unitUsd === 0 ? null : amountUsd / unitUsd;
        return {
          name: civ.name,
          unit: civ.unit,
          year_range: civ.year_range,
          note: civ.note,
          image: civ.image,
          input_currency: cur,
          input_amount: amt,
          amount_in_usd: amountUsd,
          units_equivalent: unitsEquivalent,
        };
      });
    } else if (mode === "historical-to-modern") {
      const rateData = await getRate("USD", cur);
      const usdToCur = rateData?.rates?.[cur];
      if (!usdToCur) throw new Error("Failed to get USD->target rate.");

      results = historical.civilizations.map((civ) => {
        const unitUsd = Number(civ.modern_usd) || 0;
        const amountUsd = amt * unitUsd;
        const amountInTarget = amountUsd * usdToCur;
        return {
          name: civ.name,
          unit: civ.unit,
          year_range: civ.year_range,
          note: civ.note,
          image: civ.image,
          input_historical_amount: amt,
          amount_in_target_currency: amountInTarget,
          target_currency: cur,
        };
      });
    }

    return res.status(200).json({ mode, currency: cur, amount: amt, results });
  } catch (err) {
    console.error("❌ API Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
