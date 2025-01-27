import 'dart:convert';

import 'package:tapuntap/core/domain/entities/card_entity.dart';

class CardModel extends CardEntity {
  CardModel({
    required super.id,
    required super.name,
    required super.uri,
    required super.scryfallUri,
    required super.imageUris,
    required super.manaCost,
    required super.cmc,
    required super.typeLine,
    required super.oracleText,
    required super.power,
    required super.toughness,
    required super.keywords,
    required super.setId,
    required super.setName,
  });

  factory CardModel.fromEntity(CardEntity entity) {
    return CardModel(
      id: entity.id,
      name: entity.name,
      uri: entity.uri,
      scryfallUri: entity.scryfallUri,
      imageUris: entity.imageUris,
      manaCost: entity.manaCost,
      cmc: entity.cmc,
      typeLine: entity.typeLine,
      oracleText: entity.oracleText,
      power: entity.power,
      toughness: entity.toughness,
      keywords: entity.keywords,
      setId: entity.setId,
      setName: entity.setName,
    );
  }

  factory CardModel.fromJson(Map<String, dynamic> json) {
    return CardModel(
      id: json['id'],
      name: json['name'],
      uri: json['uri'],
      scryfallUri: json['scryfall_uri'],
      imageUris: Map<String, String>.from(json['image_uris']),
      manaCost: json['mana_cost'],
      cmc: json['cmc'],
      typeLine: json['type_line'],
      oracleText: json['oracle_text'],
      power: json['power'],
      toughness: json['toughness'],
      keywords: List<String>.from(json['keywords']),
      setId: json['set_id'],
      setName: json['set_name'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'uri': uri,
      'scryfall_uri': scryfallUri,
      'image_uris': imageUris,
      'mana_cost': manaCost,
      'cmc': cmc,
      'type_line': typeLine,
      'oracle_text': oracleText,
      'power': power,
      'toughness': toughness,
      'keywords': keywords,
      'set_id': setId,
      'set_name': setName,
    };
  }

  String encode() {
    return base64.encode(utf8.encode(json.encode(toJson())));
  }

  factory CardModel.fromBase64String(String s) {
    return CardModel.fromJson(json.decode(utf8.decode(base64.decode(s))));
  }
}