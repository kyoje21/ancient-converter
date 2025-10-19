import './style.css';
console.log('Ancient Converter running!');

const MODE_COLORS = {
  modernToHistorical: {
    border: '#A43C2B', // Doric Red
    accent: '#E5CFA3', // Cream
  },
  historicalToModern: {
    border: '#4B92A9', // Doric Sky Blue
    accent: '#E5CFA3', // Cream
  },
};

const overlay = document.getElementById("overlay");
const civGrid = document.getElementById("civGrid");
let mode = "modern-to-historical";
let latestData = [];

// ===== Mode Button =====
const modeBtn = document.getElementById("modeBtn");

// Initial button style
modeBtn.textContent = "Modern → Historical";
modeBtn.style.backgroundColor = MODE_COLORS.modernToHistorical.border;
modeBtn.style.color = MODE_COLORS.modernToHistorical.accent;
modeBtn.style.border = "none";
modeBtn.style.padding = "0.5rem 1rem";
modeBtn.style.borderRadius = "0.5rem";
modeBtn.style.cursor = "pointer";
modeBtn.style.transition = "all 0.3s ease";

// Toggle between modes
modeBtn.addEventListener("click", () => {
  mode = mode === "modern-to-historical" ? "historical-to-modern" : "modern-to-historical";

  if (mode === "modern-to-historical") {
    modeBtn.textContent = "Modern → Historical";
    modeBtn.style.backgroundColor = MODE_COLORS.modernToHistorical.border;
    modeBtn.style.color = MODE_COLORS.modernToHistorical.accent;
  } else {
    modeBtn.textContent = "Historical → Modern";
    modeBtn.style.backgroundColor = MODE_COLORS.historicalToModern.border;
    modeBtn.style.color = MODE_COLORS.historicalToModern.accent;
  }
});

// ===== Convert Function =====
async function convert() {
  const currency = document.getElementById("currency").value;
  const amount = Number(document.getElementById("amount").value);
  const status = document.getElementById("status");

  overlay.classList.remove("hidden");
  civGrid.innerHTML = "";

  try {
    // ✅ Load from local JSON if running locally, otherwise from API
    const apiUrl =
      window.location.hostname === "localhost"
        ? "/data/historical.json"
        : `/api/convert?currency=${currency}&amount=${amount}&mode=${mode}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    // ✅ Handle local or API format
    latestData = data.results || data.civilizations || [];

    const currentModeColor =
      mode === "modern-to-historical"
        ? MODE_COLORS.modernToHistorical.border
        : MODE_COLORS.historicalToModern.border;

    if (latestData.length === 0) {
      civGrid.innerHTML = "<p class='text-gray-600 col-span-full'>No results found.</p>";
      return;
    }

    // ===== Create Cards =====
    latestData.forEach((r) => {
      const card = document.createElement("div");
      card.className = "flip-card w-full h-48 cursor-pointer";
      const imageSrc = r.image || `images/default.webp`;

      card.innerHTML = `
        <div class="flip-inner relative w-full h-full transition-transform duration-500" style="transform-style: preserve-3d;">
          
          <!-- FRONT -->
          <div class="flip-front absolute inset-0 bg-[#fff8e5] rounded-lg shadow-lg flex flex-col items-center justify-center p-4 overflow-hidden" style="backface-visibility: hidden;">
            
            <!-- Vertical accent stripe -->
            <div class="absolute left-0 top-0 h-full w-2 z-0"
                 style="background-color: ${currentModeColor}; opacity: 0.85; border-top-left-radius: 0.5rem; border-bottom-left-radius: 0.5rem;"></div>

            <div class="w-16 h-16 rounded-full mb-2 flex items-center justify-center relative z-10">
              <img src="${imageSrc}" 
                   alt="${r.leader || r.name}" 
                   class="w-20 h-20 object-cover rounded-full">
            </div>

            <h3 class="font-semibold text-center text-sm relative z-10 text-[#3a2e1f]">${r.name}</h3>
            <p class="text-xs text-[#4a3b28] mt-3 relative z-10">${r.year_range || ""}</p>
          </div>

          <!-- BACK -->
          <div class="flip-back absolute inset-0 rounded-lg shadow flex flex-col items-center justify-between p-4 text-center text-white"
               style="background-color: ${currentModeColor}; backface-visibility: hidden; transform: rotateY(180deg);">
            <div>
              <p class="text-sm font-medium mb-2 text-[#fff8e5]">${r.name}</p>
              <h3 class="text-lg font-bold mb-1">${getResultText(r)}</h3>
              <p class="italic text-[#fff8e5]/80 text-sm">${r.note || ""}</p>
            </div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => card.classList.toggle("flipped"));
      civGrid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    status.textContent = "Error: " + err.message;
  } finally {
    overlay.classList.add("hidden");
  }
}

// ===== Result Text Formatting =====
function getResultText(r) {
  let value = null;

  if (r.units_equivalent !== null && r.units_equivalent !== undefined) {
    value = r.units_equivalent;
    if (value < 1) value = Number(value.toFixed(2));
    else if (value >= 100) value = Math.round(value);
    else value = Number(value.toFixed(2));
    return `${r.input_amount} ${r.input_currency} ≈ ${value} ${r.unit}`;
  } 
  else if (r.amount_in_target_currency !== null && r.amount_in_target_currency !== undefined) {
    value = r.amount_in_target_currency;
    if (value < 1) value = Number(value.toFixed(2));
    else if (value >= 100) value = Math.round(value);
    else value = Number(value.toFixed(2));
    return `${r.input_historical_amount} ${r.unit} ≈ ${value} ${r.target_currency}`;
  } 
  else if (r.modern_usd && r.unit) {
    // ✅ Handle local JSON
    return `≈ ${r.modern_usd.toLocaleString()} USD per ${r.unit}`;
  }
  else {
    return "No data available";
  }
}

// ===== Convert Button Styling =====
const convertBtn = document.getElementById("convertBtn");
convertBtn.style.backgroundColor = "#D5A73B"; // Doric Gold
convertBtn.style.color = "#1b1f2f";
convertBtn.style.fontWeight = "600";
convertBtn.style.padding = "0.5rem 1.25rem";
convertBtn.style.border = "none";
convertBtn.style.borderRadius = "0.5rem";
convertBtn.style.cursor = "pointer";
convertBtn.style.transition = "background-color 0.3s ease, transform 0.2s ease";

convertBtn.addEventListener("mouseenter", () => {
  convertBtn.style.backgroundColor = "#E8BE4E"; // lighter gold
  convertBtn.style.transform = "scale(1.05)";
});
convertBtn.addEventListener("mouseleave", () => {
  convertBtn.style.backgroundColor = "#D5A73B";
  convertBtn.style.transform = "scale(1)";
});
convertBtn.addEventListener("click", convert);
