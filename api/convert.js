import fs from "fs/promises";

export default async function handler(req, res) {
  try {
    const { amount = "1", currency = "USD", mode = "modern-to-historical" } = req.query;
    const amt = Number(amount) || 0;
    const apiKey = process.env.FXRATES_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "FXRATES_API_KEY not set on server." });
    }

    // Load historical data
    const raw = await fs.readFile(new URL('../data/historical.json', import.meta.url), 'utf-8');
    const historical = JSON.parse(raw);

    // Normalize currency code (upper)
    const cur = String(currency).toUpperCase();

    // Helper: fetch rate from FXRatesAPI
    // We'll request base=USD&symbols=CUR and base=CUR&symbols=USD depending on mode for clarity
    async function getRate(base, symbols) {
      const url = `https://api.fxratesapi.com/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbols)}`;
      const r = await fetch(url, { headers: { apikey: apiKey } });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`FX API error: ${r.status} ${text}`);
      }
      return await r.json();
    }

    let results = [];

    if (mode === "modern-to-historical") {
      // Convert input amount in CUR to USD first by fetching base=CUR -> USD
      const rateData = await getRate(cur, "USD");
      const curToUsd = rateData.rates && rateData.rates.USD;
      if (!curToUsd) throw new Error("Failed to get rate for provided currency.");
      const amountUsd = amt * curToUsd;

      for (const civ of historical.civilizations) {
        const unitUsd = Number(civ.modern_usd) || 0;
        const unitsEquivalent = unitUsd === 0 ? null : amountUsd / unitUsd;
        results.push({
          name: civ.name,
          unit: civ.unit,
          year_range: civ.year_range,
          note: civ.note,
          image: civ.image, 
          modern_usd_per_unit: unitUsd,
          input_amount: amt,
          input_currency: cur,
          amount_in_usd: Number(amountUsd.toFixed(6)),
          units_equivalent: unitsEquivalent === null ? null : Number(unitsEquivalent.toFixed(6))
        });
      }
    } else if (mode === "historical-to-modern") {
      // Input amount interpreted as number of historical units. Convert to USD then to target currency.
      // We'll fetch base=USD -> CUR to get usd -> cur rate for final conversion
      const usdToCurData = await getRate("USD", cur);
      const usdToCur = usdToCurData.rates && usdToCurData.rates[cur];
      if (!usdToCur) throw new Error("Failed to get USD->target rate.");

      for (const civ of historical.civilizations) {
        const unitUsd = Number(civ.modern_usd) || 0;
        const amountUsd = amt * unitUsd;
        const amountInTarget = amountUsd * usdToCur;
        results.push({
          name: civ.name,
          unit: civ.unit,
          year_range: civ.year_range,
          note: civ.note,
          image: civ.image,
          modern_usd_per_unit: unitUsd,
          input_historical_amount: amt,
          amount_in_usd: Number(amountUsd.toFixed(6)),
          amount_in_target_currency: Number(amountInTarget.toFixed(6)),
          target_currency: cur
        });
      }
    } else {
      return res.status(400).json({ error: "Invalid mode. Use modern-to-historical or historical-to-modern." });
    }

    return res.status(200).json({ mode, currency: cur, amount: amt, results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}