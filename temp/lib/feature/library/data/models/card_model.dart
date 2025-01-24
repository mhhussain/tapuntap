import 'dart:convert';

import 'package:cardgames/feature/library/domain/entities/card_entity.dart';

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
      scryfallUri: json['scryfallUri'],
      imageUris: json['imageUris'],
      manaCost: json['manaCost'],
      cmc: json['cmc'],
      typeLine: json['typeLine'],
      oracleText: json['oracleText'],
      power: json['power'],
      toughness: json['toughness'],
      keywords: json['keywords'],
      setId: json['setId'],
      setName: json['setName'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'uri': uri,
      'scryfallUri': scryfallUri,
      'imageUris': imageUris,
      'manaCost': manaCost,
      'cmc': cmc,
      'typeLine': typeLine,
      'oracleText': oracleText,
      'power': power,
      'toughness': toughness,
      'keywords': keywords,
      'setId': setId,
      'setName': setName,
    };
  }

  String encode() {
    return base64.encode(utf8.encode(json.encode(toJson())));
  }

  factory CardModel.fromBase64String(String s) {
    return CardModel.fromJson(json.decode(utf8.decode(base64.decode(s))));
  }
}