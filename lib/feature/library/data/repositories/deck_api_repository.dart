import 'package:tapuntap/core/resources/datastate.dart';
import 'package:tapuntap/domain/entities/deck_entity.dart';
import 'package:tapuntap/feature/library/data/api/local/deck_list_api.dart';
import 'package:tapuntap/feature/library/data/models/deck_model.dart';
import 'package:tapuntap/feature/library/domain/services/deck_api_service.dart';

class DeckApiRepository implements DeckApiService {
  final DeckListApi _deckListApi;

  DeckApiRepository(this._deckListApi);

  @override
  Future<DataState<List<DeckEntity>>> getDecks() async {
    final data = await _deckListApi.get();

    return DataSuccess(data);
  }

  @override
  Future<DataState<void>> addDeck(DeckEntity deck) async {
    await _deckListApi.add(DeckModel(id: deck.id, name: deck.name, description: deck.description, cards: deck.cards));

    return const DataSuccess(null);
  }

  @override
  Future<DataState<void>> updateDeck(DeckEntity deck) async {
    await _deckListApi.update(DeckModel(id: deck.id, name: deck.name, description: deck.description, cards: deck.cards));

    return const DataSuccess(null);
  }
}