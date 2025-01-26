import 'package:tapuntap/core/resources/datastate.dart';
import 'package:tapuntap/domain/entities/deck_entity.dart';

abstract class DeckApiService {
  Future<DataState<List<DeckEntity>>> getDecks();

  Future<DataState<void>> addDeck(DeckEntity deck);

  Future<DataState<void>> updateDeck(DeckEntity deck);
}