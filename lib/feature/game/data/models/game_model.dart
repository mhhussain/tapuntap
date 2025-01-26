import 'dart:convert';

class GameModel {
  final String id;

  GameModel({
    required this.id,
  });

  factory GameModel.fromJson(Map<String, dynamic> json) {
    return GameModel(
      id: json['id'],
    );
  }

  factory GameModel.fromBase64String(String base64String) {
    return GameModel.fromJson(jsonDecode(utf8.decode(base64.decode(base64String))));
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
    };
  }

  String toBase64String() {
    return base64.encode(utf8.encode(jsonEncode(toJson())));
  }
}