const POKEMON = ["growlithe", "arcanine"];

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

async function fetchCards(pokemonName) {
  const res = await fetch(
    `http://localhost:1337/api/cards?filters[name][$eqi]=${pokemonName}&pagination[pageSize]=100`,
  );
  const json = await res.json();
  const cardList = json.data;

  const collectedContainer = document.getElementById(
    `collected-${pokemonName}`,
  );
  const notCollectedContainer = document.getElementById(
    `not-collected-${pokemonName}`,
  );

  for (const card of cardList) {
    const imageUrl = card.imageUrl || "./assets/cardback.png";

    const cardEl = document.createElement("div");
    cardEl.classList.add("card");
    cardEl.innerHTML = `
      <img src="${imageUrl}" alt="${card.name}" onerror="this.src='./assets/cardback.png'">
      <p class="card-set">${card.setName ?? "Unknown Set"}</p>
      <p class="card-id">${card.tcgdex_id}</p>
      <button class="collect-btn">${card.collected ? "Mark as Not Collected" : "Mark as Collected"}</button>
    `;

    const btn = cardEl.querySelector(".collect-btn");

    btn.addEventListener("click", async () => {
      const isNowOwned =
        cardEl.parentElement.id === `not-collected-${pokemonName}`;

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
        } else {
          notCollectedContainer.appendChild(cardEl);
          btn.textContent = "Mark as Collected";
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
  }
}

for (const name of POKEMON) {
  await fetchCards(name);
}

updateCounts();
