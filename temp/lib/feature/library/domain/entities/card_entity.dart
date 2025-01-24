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
}