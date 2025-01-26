import 'dart:convert';

import 'package:tapuntap/feature/library/data/models/card_model.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';

class ScryfallApi {

  ScryfallApi();

  Future<String> get endpoint async {
    return 'https://api.scryfall.com';
  }

  Future<Map<String, String>> get defaultHeaders async {
    final PackageInfo packageInfo = await PackageInfo.fromPlatform();

    return {
      'User-Agent': 'mhhussain-tapuntap/${packageInfo.version}',
      'Accept': 'application/json;q=0.9,*/*;q=0.8',
    };
  }

  var client = http.Client();

  /// Auto-complete >= 2 characters
  /// /cards/autocomplete?q=name
  Future<List<String>> autocomplete(String q) async {
    final response = await client.get(Uri.parse('${await endpoint}/cards/autocomplete?q=$q'), headers: await defaultHeaders);
    final jsondata = json.decode(response.body);

    return jsondata['data'] ?? [];
  }

  /// Find by exact name
  /// /cards/named?exact=name
  Future<CardModel> exactName(String name) async {
    final response = await client.get(Uri.parse('${await endpoint}/cards/named?exact=$name'), headers: await defaultHeaders);
    final jsondata = json.decode(response.body);

    return CardModel.fromJson(jsondata);
  }

  /// Find by ID
  /// /cards/:id
  Future<CardModel> byId(String id) async {
    final response = await client.get(Uri.parse('${await endpoint}/cards/$id'), headers: await defaultHeaders);
    final jsondata = json.decode(response.body);

    return CardModel.fromJson(jsondata);
  }
}