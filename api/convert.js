export default async function handler(req, res) {
  try {
    const { amount = "1", currency = "USD", mode = "modern-to-historical" } = req.query;
    const amt = Number(amount) || 0;
    const apiKey = process.env.FXRATES_API_KEY;

    // ✅ Load the JSON file from the deployed public directory
    const baseUrl =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const jsonUrl = `${baseUrl}/data/historical.json`;
    const response = await fetch(jsonUrl);

    if (!response.ok) {
      throw new Error("Failed to fetch historical.json from public directory.");
    }

    const historical = await response.json();

    // === currency conversion ===
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
