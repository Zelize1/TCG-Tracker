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

  document.getElementById("count-collected").textContent =
    `(${collectedTotal})`;
  document.getElementById("count-not-collected").textContent =
    `(${notCollectedTotal})`;
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

function applyFilter(selectedSet) {
  allCards.forEach(({ card, cardEl }) => {
    const matches = !selectedSet || card.setName === selectedSet;
    cardEl.style.display = matches ? "" : "none";
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

async function fetchPrice(tcgdexId, priceEl) {
  const res = await fetch(`https://api.tcgdex.net/v2/en/cards/${tcgdexId}`);
  const data = await res.json();
  const trendPrice = data.pricing?.cardmarket?.trend;
  priceEl.textContent = trendPrice ? `€${trendPrice.toFixed(2)}` : "No price";
}

async function fetchCards(pokemonName) {
  const res = await fetch(
    `http://localhost:1337/api/cards?filters[name][$eqi]=${pokemonName}&pagination[pageSize]=100`,
  );
  const json = await res.json();
  const cardList = json.data;

  const collectedContainer = document.getElementById(`collected-${pokemonName}`);
  const notCollectedContainer = document.getElementById(`not-collected-${pokemonName}`);

  const priceFetches = [];

  for (const card of cardList) {
    const imageUrl = card.imageUrl || "./assets/cardback.png";

    const cardEl = document.createElement("div");
    cardEl.classList.add("card");
    cardEl.innerHTML = `
      <img src="${imageUrl}" alt="${card.name}" onerror="this.src='./assets/cardback.png'">
      <p class="card-set">${card.setName ?? "Unknown Set"}</p>
      <p class="card-id">${card.tcgdex_id}</p>
      <p class="card-price">...</p>
      <button class="collect-btn">${card.collected ? "Mark as Not Collected" : "Mark as Collected"}</button>
    `;

    const btn = cardEl.querySelector(".collect-btn");

    btn.addEventListener("click", async () => {
      const isNowOwned = cardEl.parentElement.id === `not-collected-${pokemonName}`;

      const res = await fetch(
        `http://localhost:1337/api/cards/${card.documentId}`,
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
    priceFetches.push(fetchPrice(card.tcgdex_id, priceEl));
  }

  Promise.all(priceFetches);
}

for (const name of POKEMON) {
  await fetchCards(name);
}

updateCounts();
populateSetFilter();

document.getElementById("set-filter").addEventListener("change", (e) => {
  applyFilter(e.target.value);
});

document.getElementById("set-filter-not-collected").addEventListener("change", (e) => {
  applyFilter(e.target.value);
});

document.getElementById("export-collected").addEventListener("click", () => {
  exportToCSV(true, "collected.csv");
});

document.getElementById("export-not-collected").addEventListener("click", () => {
  exportToCSV(false, "not-collected.csv");
});