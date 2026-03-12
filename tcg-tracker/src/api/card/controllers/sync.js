export default {
  async sync(ctx) {
    const pokemonNames = ["growlithe", "arcanine"];

    for (const name of pokemonNames) {
      const response = await fetch(
        `https://api.tcgdex.net/v2/en/cards?name=${name}`
      );

      const cards = await response.json();

      for (const card of cards) {
        const existing = await strapi.db.query("api::card.card").findOne({
          where: { tcgdex_id: card.id },
        });

        if (!existing) {
          const fullResponse = await fetch(
            `https://api.tcgdex.net/v2/en/cards/${card.id}`
          );

          const fullCard = await fullResponse.json();

          const imageUrl = fullCard.image ? `${fullCard.image}/high.webp` : "";

          await strapi.entityService.create("api::card.card", {
            data: {
              tcgdex_id: fullCard.id,
              name: fullCard.name,
              setName: fullCard.set?.name || "Unknown",
              cardNumber: fullCard.localId || "",
              imageUrl,
              collected: false,
            },
          });
        }
      }
    }

    ctx.send({ message: "Sync complete" });
  },
};