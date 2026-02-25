async function load() {
  const response = await fetch(
    "https://api.tcgdex.net/v2/en/cards?name=arcanine"
  );

  const pikachu = await response.json();

  console.log(pikachu);
  console.log(pikachu.cards);
}

load();