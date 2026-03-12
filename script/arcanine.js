fetch("https://api.tcgdex.net/v2/en/cards?name=arcanine")
  .then(res => res.json())
  .then(cards => {
    console.log(cards);
    console.log(cards[0]);
    console.log(cards[0].image);
  });