import 'dart:convert';

import 'package:tapuntap/core/domain/entities/deck_entity.dart';
import 'package:tapuntap/feature/library/data/models/card_model.dart';

class DeckModel extends DeckEntity {
  DeckModel({
    required super.id,
    required super.name,
    required super.description,
    required super.cards,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'cards': cards.map((c) => CardModel.fromEntity(c).toJson()).toList(),
    };
  }

  factory DeckModel.fromJson(Map<String, dynamic> json) {
    return DeckModel(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      cards: json['cards'].map<CardModel>((c) => CardModel.fromJson(c)).toList(),
    );
  }

  String toBase64String() {
    return base64.encode(utf8.encode(json.encode(toJson())));
  }

  factory DeckModel.fromBase64String(String base64String) {
    return DeckModel.fromJson(json.decode(utf8.decode(base64.decode(base64String))));
  }
}