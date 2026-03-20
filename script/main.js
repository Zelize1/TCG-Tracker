const POKEMON = ["growlithe", "arcanine"];
const allCards = [];

// Tracks selected sets per filter instance
const selectedSets = {
  "set-filter": new Set(),
  "set-filter-not-collected": new Set(),
  "set-filter-mobile": new Set(),
  "set-filter-not-collected-mobile": new Set(),
};

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

  updateToggleLabel();

  POKEMON.forEach((name) => {
    const collectedCount = document.getElementById(`collected-${name}`).children.length;
    const notCollectedCount = document.getElementById(`not-collected-${name}`).children.length;
    const total = collectedCount + notCollectedCount;

    document.getElementById(`count-collected-${name}`).textContent = `${collectedCount}/${total}`;
    document.getElementById(`count-not-collected-${name}`).textContent = `${notCollectedCount}/${total}`;
  });
}

function updateTotalValue() {
  const total = allCards
    .filter(({ card }) => card.collected)
    .reduce((sum, { card }) => sum + (card.trendPrice || 0), 0);
  document.getElementById("total-value").textContent = `€${total.toFixed(2)}`;
}

function updateSelectBtnLabel(filterId, btnId) {
  const selected = selectedSets[filterId];
  const btn = document.getElementById(btnId);
  if (selected.size === 0) {
    btn.textContent = "All Sets";
  } else if (selected.size === 1) {
    btn.textContent = [...selected][0];
  } else {
    btn.textContent = `${selected.size} sets selected`;
  }
}

function populateSetFilter() {
  const setNames = [...new Set(allCards.map(({ card }) => card.setName).filter(Boolean))].sort();

  const configs = [
    { filterId: "set-filter", dropdownId: "set-filter-dropdown", btnId: "set-filter-btn" },
    { filterId: "set-filter-not-collected", dropdownId: "set-filter-dropdown-not-collected", btnId: "set-filter-btn-not-collected" },
    { filterId: "set-filter-mobile", dropdownId: "set-filter-dropdown-mobile", btnId: "set-filter-btn-mobile" },
    { filterId: "set-filter-not-collected-mobile", dropdownId: "set-filter-dropdown-not-collected-mobile", btnId: "set-filter-btn-not-collected-mobile" },
  ];

  configs.forEach(({ filterId, dropdownId, btnId }) => {
    const dropdown = document.getElementById(dropdownId);

    setNames.forEach((name) => {
      const label = document.createElement("label");
      label.classList.add("custom-select-option");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = name;

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selectedSets[filterId].add(name);
        } else {
          selectedSets[filterId].delete(name);
        }
        updateSelectBtnLabel(filterId, btnId);
        syncMirrorFilter(filterId);
        applyFilters();
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(name));
      dropdown.appendChild(label);
    });

    // Toggle dropdown open/close
    document.getElementById(btnId).addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".custom-select-dropdown").forEach((d) => {
        if (d.id !== dropdownId) d.classList.remove("open");
      });
      dropdown.classList.toggle("open");
    });

    // Prevent dropdown clicks from closing
    dropdown.addEventListener("click", (e) => e.stopPropagation());
  });
}

function syncMirrorFilter(filterId) {
  const mirrorMap = {
    "set-filter": "set-filter-mobile",
    "set-filter-mobile": "set-filter",
    "set-filter-not-collected": "set-filter-not-collected-mobile",
    "set-filter-not-collected-mobile": "set-filter-not-collected",
  };

  const mirrorId = mirrorMap[filterId];
  if (!mirrorId) return;

  const mirrorDropdown = document.getElementById(
    filterId.includes("mobile")
      ? filterId.replace("-mobile", "-dropdown")
      : filterId + "-dropdown-mobile"
  );

  // Sync checkbox states
  selectedSets[mirrorId] = new Set(selectedSets[filterId]);

  const mirrorBtnId = mirrorId.replace("set-filter", "set-filter-btn");
  const correctMirrorBtnId = mirrorId === "set-filter" ? "set-filter-btn"
    : mirrorId === "set-filter-not-collected" ? "set-filter-btn-not-collected"
    : mirrorId === "set-filter-mobile" ? "set-filter-btn-mobile"
    : "set-filter-btn-not-collected-mobile";

  const mirrorDropdownEl = document.getElementById(
    mirrorId === "set-filter" ? "set-filter-dropdown"
    : mirrorId === "set-filter-not-collected" ? "set-filter-dropdown-not-collected"
    : mirrorId === "set-filter-mobile" ? "set-filter-dropdown-mobile"
    : "set-filter-dropdown-not-collected-mobile"
  );

  if (mirrorDropdownEl) {
    mirrorDropdownEl.querySelectorAll("input[type='checkbox']").forEach((cb) => {
      cb.checked = selectedSets[mirrorId].has(cb.value);
    });
  }

  updateSelectBtnLabel(mirrorId, correctMirrorBtnId);
}

function clearFilter(filterId, btnId, mirrorFilterId, mirrorBtnId) {
  selectedSets[filterId].clear();
  selectedSets[mirrorFilterId].clear();

  const dropdownMap = {
    "set-filter": "set-filter-dropdown",
    "set-filter-not-collected": "set-filter-dropdown-not-collected",
    "set-filter-mobile": "set-filter-dropdown-mobile",
    "set-filter-not-collected-mobile": "set-filter-dropdown-not-collected-mobile",
  };

  [filterId, mirrorFilterId].forEach((id) => {
    const dropdown = document.getElementById(dropdownMap[id]);
    if (dropdown) {
      dropdown.querySelectorAll("input[type='checkbox']").forEach((cb) => cb.checked = false);
    }
  });

  updateSelectBtnLabel(filterId, btnId);
  updateSelectBtnLabel(mirrorFilterId, mirrorBtnId);
  applyFilters();
}

function applyFilters() {
  // Use the currently active tab's filter state
  const tabToggle = document.getElementById("tab-toggle");
  const current = tabToggle.dataset.current;
  const isCollected = current === "collected";

  const searchInputId = isCollected ? "search-input" : "search-input-not-collected";
  const toggleId = isCollected ? "search-toggle" : "search-toggle-not-collected";
  const filterId = isCollected ? "set-filter" : "set-filter-not-collected";

  const searchValue = document.getElementById(searchInputId).value.trim();
  const searchMode = document.getElementById(toggleId).dataset.mode;
  const selectedSetNames = selectedSets[filterId];

  allCards.forEach(({ card, cardEl }) => {
    let matches = true;

    if (searchValue) {
      const query = searchValue.toLowerCase();
      if (searchMode === "set") {
        matches = (card.setName ?? "").toLowerCase().includes(query);
      } else {
        matches = (card.tcgdex_id ?? "").toLowerCase().includes(query);
      }
    } else if (selectedSetNames.size > 0) {
      matches = selectedSetNames.has(card.setName);
    }

    cardEl.style.display = matches ? "" : "none";
  });
}

function setupToolbar(searchInputId, toggleId, clearSearchId, clearFilterId, filterBtnId, filterId, mirrorFilterId, mirrorFilterBtnId, mirrorSearchId) {
  const searchInput = document.getElementById(searchInputId);
  const toggle = document.getElementById(toggleId);
  const clearSearch = document.getElementById(clearSearchId);
  const clearFilterBtn = document.getElementById(clearFilterId);

  toggle.addEventListener("click", () => {
    const newMode = toggle.dataset.mode === "set" ? "id" : "set";
    const isMobile = toggleId.includes("mobile");
    toggle.dataset.mode = newMode;
    toggle.textContent = newMode === "set" ? (isMobile ? "Set" : "Set Name") : (isMobile ? "ID" : "Card ID");

    const mirrorToggle = document.getElementById(
      isMobile ? toggleId.replace("-mobile", "") : toggleId + "-mobile"
    );
    if (mirrorToggle) {
      mirrorToggle.dataset.mode = newMode;
      mirrorToggle.textContent = newMode === "set" ? (!isMobile ? "Set" : "Set Name") : (!isMobile ? "ID" : "Card ID");
    }

    applyFilters();
  });

  searchInput.addEventListener("input", () => {
    if (searchInput.value.trim()) {
      selectedSets[filterId].clear();
      selectedSets[mirrorFilterId].clear();
      syncMirrorFilter(filterId);
    }
    if (mirrorSearchId) document.getElementById(mirrorSearchId).value = searchInput.value;
    applyFilters();
  });

  clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    if (mirrorSearchId) document.getElementById(mirrorSearchId).value = "";
    applyFilters();
  });

  clearFilterBtn.addEventListener("click", () => {
    clearFilter(filterId, filterBtnId, mirrorFilterId, mirrorFilterBtnId);
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

// Desktop toolbars
setupToolbar("search-input", "search-toggle", "clear-search", "clear-filter", "set-filter-btn", "set-filter", "set-filter-mobile", "set-filter-btn-mobile", "search-input-mobile");
setupToolbar("search-input-not-collected", "search-toggle-not-collected", "clear-search-not-collected", "clear-filter-not-collected", "set-filter-btn-not-collected", "set-filter-not-collected", "set-filter-not-collected-mobile", "set-filter-btn-not-collected-mobile", "search-input-not-collected-mobile");

// Mobile toolbars
setupToolbar("search-input-mobile", "search-toggle-mobile", "clear-search-mobile", "clear-filter-mobile", "set-filter-btn-mobile", "set-filter-mobile", "set-filter", "set-filter-btn", "search-input");
setupToolbar("search-input-not-collected-mobile", "search-toggle-not-collected-mobile", "clear-search-not-collected-mobile", "clear-filter-not-collected-mobile", "set-filter-btn-not-collected-mobile", "set-filter-not-collected-mobile", "set-filter-not-collected", "set-filter-btn-not-collected", "search-input-not-collected");

document.getElementById("export-collected").addEventListener("click", () => exportToCSV(true, "collected.csv"));
document.getElementById("export-not-collected").addEventListener("click", () => exportToCSV(false, "not-collected.csv"));
document.getElementById("export-collected-mobile").addEventListener("click", () => exportToCSV(true, "collected.csv"));
document.getElementById("export-not-collected-mobile").addEventListener("click", () => exportToCSV(false, "not-collected.csv"));