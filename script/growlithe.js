const response = await fetch("https://api.tcgdex.net/v2/en/cards?name=growlithe");
const cards = await response.json();

console.log(cards)