import 'package:tapuntap/domain/entities/card_entity.dart';

class DeckEntity {
  final String id;
  final String name;
  final String description;
  final List<CardEntity> cards;

  DeckEntity({
    required this.id,
    required this.name,
    required this.description,
    required this.cards,
  });
}