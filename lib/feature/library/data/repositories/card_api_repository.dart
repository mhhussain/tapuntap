import 'package:tapuntap/core/resources/datastate.dart';
import 'package:tapuntap/core/domain/entities/card_entity.dart';
import 'package:tapuntap/feature/library/data/api/remote/scryfall_api.dart';
import 'package:tapuntap/feature/library/domain/services/card_api_service.dart';

class CardApiRepository implements CardApiService {
  final ScryfallApi _scryfallApi;

  CardApiRepository(this._scryfallApi);

  @override
  Future<DataState<CardEntity>> getCardById(String id) async {
    final data = await _scryfallApi.byId(id);

    return DataSuccess(data);
  }
}