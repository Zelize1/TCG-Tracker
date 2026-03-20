const POKEMON = ["growlithe", "arcanine"];
const allCards = [];

function updateCounts() {
  const collectedTotal = POKEMON.reduce((sum, name) => {
    return sum + document.getElementById(`collected-${name}`).children.length;
  }, 0);

  const notCollectedTotal = POKEMON.reduce((sum, name) => {
    return (
      sum + document.getElementById(`not-collected-${name}`).children.length
    );
  }, 0);

  document.getElementById("count-collected").textContent = `(${collectedTotal})`;
  document.getElementById("count-not-collected").textContent = `(${notCollectedTotal})`;

  // Update per-pokemon section counts
  POKEMON.forEach((name) => {
    const collectedCount = document.getElementById(`collected-${name}`).children.length;
    const notCollectedCount = document.getElementById(`not-collected-${name}`).children.length;
    const total = collectedCount + notCollectedCount;

    document.getElementById(`count-collected-${name}`).textContent =
      `${collectedCount}/${total}`;
    document.getElementById(`count-not-collected-${name}`).textContent =
      `${notCollectedCount}/${total}`;
  });
}

function updateTotalValue() {
  const total = allCards
    .filter(({ card }) => card.collected)
    .reduce((sum, { card }) => sum + (card.trendPrice || 0), 0);
  document.getElementById("total-value").textContent = `€${total.toFixed(2)}`;
}

function populateSetFilter() {
  const setNames = [...new Set(allCards.map(({ card }) => card.setName).filter(Boolean))].sort();

  ["set-filter", "set-filter-not-collected"].forEach((id) => {
    const select = document.getElementById(id);
    setNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
  });
}

function applyFilters(searchValue, searchMode, selectedSet) {
  allCards.forEach(({ card, cardEl }) => {
    let matches = true;

    if (searchValue) {
      const query = searchValue.toLowerCase();
      if (searchMode === "set") {
        matches = (card.setName ?? "").toLowerCase().includes(query);
      } else {
        matches = (card.tcgdex_id ?? "").toLowerCase().includes(query);
      }
    } else if (selectedSet) {
      matches = card.setName === selectedSet;
    }

    cardEl.style.display = matches ? "" : "none";
  });
}

function getFilterState(suffix) {
  const searchInput = document.getElementById(`search-input${suffix}`);
  const toggle = document.getElementById(`search-toggle${suffix}`);
  const select = document.getElementById(`set-filter${suffix}`);
  return {
    searchValue: searchInput.value.trim(),
    searchMode: toggle.dataset.mode,
    selectedSet: select.value,
  };
}

function setupToolbar(suffix) {
  const searchInput = document.getElementById(`search-input${suffix}`);
  const toggle = document.getElementById(`search-toggle${suffix}`);
  const select = document.getElementById(`set-filter${suffix}`);
  const clearBtn = document.getElementById(`clear-filter${suffix}`);

  toggle.addEventListener("click", () => {
    if (toggle.dataset.mode === "set") {
      toggle.dataset.mode = "id";
      toggle.textContent = "Card ID";
    } else {
      toggle.dataset.mode = "set";
      toggle.textContent = "Set Name";
    }
    const state = getFilterState(suffix);
    applyFilters(state.searchValue, state.searchMode, state.selectedSet);
  });

  searchInput.addEventListener("input", () => {
    if (searchInput.value.trim()) {
      select.value = "";
    }
    const state = getFilterState(suffix);
    applyFilters(state.searchValue, state.searchMode, state.selectedSet);
  });

  select.addEventListener("change", () => {
    if (select.value) {
      searchInput.value = "";
    }
    const state = getFilterState(suffix);
    applyFilters(state.searchValue, state.searchMode, state.selectedSet);
  });

  clearBtn.addEventListener("click", () => {
    select.value = "";
    searchInput.value = "";
    applyFilters("", toggle.dataset.mode, "");
  });
}

function exportToCSV(collectedStatus, filename) {
  const cards = allCards.filter(({ card }) => card.collected === collectedStatus);
  const rows = [["Name", "Set", "Card ID"]];

  cards.forEach(({ card }) => {
    rows.push([card.name, card.setName ?? "Unknown Set", card.tcgdex_id]);
  });

  const csvContent = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function fetchPrice(tcgdexId, priceEl, card) {
  const res = await fetch(`https://api.tcgdex.net/v2/en/cards/${tcgdexId}`);
  const data = await res.json();
  const trendPrice = data.pricing?.cardmarket?.trend;
  priceEl.textContent = trendPrice ? `€${trendPrice.toFixed(2)}` : "No price";
  card.trendPrice = trendPrice || 0;
  updateTotalValue();
}

async function fetchAllCards() {
  let page = 1;
  let allFetched = [];

  while (true) {
    const res = await fetch(
      `https://proper-beef-d29be7b03c.strapiapp.com/api/cards?pagination[page]=${page}&pagination[pageSize]=100`,
    );
    const json = await res.json();
    allFetched = allFetched.concat(json.data);
    if (page >= json.meta.pagination.pageCount) break;
    page++;
  }

  const priceFetches = [];

  for (const card of allFetched) {
    const belongsTo = POKEMON.find((name) =>
      card.name.toLowerCase().includes(name.toLowerCase()),
    );

    if (!belongsTo) continue;

    const collectedContainer = document.getElementById(`collected-${belongsTo}`);
    const notCollectedContainer = document.getElementById(`not-collected-${belongsTo}`);

    const imageUrl = card.imageUrl || "./assets/cardback.png";

    const cardEl = document.createElement("div");
    cardEl.classList.add("card");
    cardEl.innerHTML = `
      <img src="${imageUrl}" alt="${card.name}" onerror="this.src='./assets/cardback.png'">
      <p class="card-name">${card.name}</p>
      <p class="card-set">${card.setName ?? "Unknown Set"}</p>
      <p class="card-id">${card.tcgdex_id}</p>
      <p class="card-price">...</p>
      <button class="collect-btn">${card.collected ? "Mark as Not Collected" : "Mark as Collected"}</button>
    `;

    const btn = cardEl.querySelector(".collect-btn");

    btn.addEventListener("click", async () => {
      const isNowOwned = cardEl.parentElement.id === `not-collected-${belongsTo}`;

      const res = await fetch(
        `https://proper-beef-d29be7b03c.strapiapp.com/api/cards/${card.documentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { collected: isNowOwned } }),
        },
      );

      if (res.ok) {
        if (isNowOwned) {
          collectedContainer.appendChild(cardEl);
          btn.textContent = "Mark as Not Collected";
          card.collected = true;
        } else {
          notCollectedContainer.appendChild(cardEl);
          btn.textContent = "Mark as Collected";
          card.collected = false;
        }
        updateCounts();
        updateTotalValue();
      } else {
        console.error("Failed to update card:", await res.json());
      }
    });

    if (card.collected) {
      collectedContainer.appendChild(cardEl);
    } else {
      notCollectedContainer.appendChild(cardEl);
    }

    allCards.push({ card, cardEl });

    const priceEl = cardEl.querySelector(".card-price");
    priceFetches.push(fetchPrice(card.tcgdex_id, priceEl, card));
  }

  Promise.all(priceFetches);
}

await fetchAllCards();

document.getElementById("loading-collected").style.display = "none";
document.getElementById("loading-not-collected").style.display = "none";

updateCounts();
populateSetFilter();
setupToolbar("");
setupToolbar("-not-collected");

document.getElementById("export-collected").addEventListener("click", () => {
  exportToCSV(true, "collected.csv");
});

document.getElementById("export-not-collected").addEventListener("click", () => {
  exportToCSV(false, "not-collected.csv");
});