class CardEntity {
  final String id;
  final String name;
  final String uri;
  final String scryfallUri;
  final Map<String, String> imageUris;
  final String manaCost;
  final String cmc;
  final String typeLine;
  final String oracleText;
  final String power;
  final String toughness;
  final List<String> keywords;
  final String setId;
  final String setName;

  CardEntity({
    required this.id,
    required this.name,
    required this.uri,
    required this.scryfallUri,
    required this.imageUris,
    required this.manaCost,
    required this.cmc,
    required this.typeLine,
    required this.oracleText,
    required this.power,
    required this.toughness,
    required this.keywords,
    required this.setId,
    required this.setName,
  });

  static CardEntity defaultCard() {
    return CardEntity(
      id: "10d42b35-844f-4a64-9981-c6118d45e826",
      name: "The Ur-Dragon",
      uri: "https://api.scryfall.com/cards/10d42b35-844f-4a64-9981-c6118d45e826",
      scryfallUri: "https://scryfall.com/card/cmm/361/the-ur-dragon?utm_source=api",
      imageUris: {
        "small": "https://cards.scryfall.io/small/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.jpg?1689999317",
        "normal": "https://cards.scryfall.io/normal/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.jpg?1689999317",
        "large": "https://cards.scryfall.io/large/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.jpg?1689999317",
        "png": "https://cards.scryfall.io/png/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.png?1689999317",
        "art_crop": "https://cards.scryfall.io/art_crop/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.jpg?1689999317",
        "border_crop": "https://cards.scryfall.io/border_crop/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.jpg?1689999317"
      },
      manaCost: "{4}{W}{U}{B}{R}{G}",
      cmc: "9.0",
      typeLine: "Legendary Creature — Dragon Avatar",
      oracleText: "Eminence — As long as The Ur-Dragon is in the command zone or on the battlefield, other Dragon spells you cast cost {1} less to cast.\nFlying\nWhenever one or more Dragons you control attack, draw that many cards, then you may put a permanent card from your hand onto the battlefield.",
      power: "10",
      toughness: "10",
      keywords: ["Flying", "Eminence"],
      setId: "cd05036f-2698-43e6-a48e-5c8d82f0a551",
      setName: "Commander Masters",
    );
  }
}