import 'package:tapuntap/core/resources/datastate.dart';
import 'package:tapuntap/core/domain/entities/deck_entity.dart';
import 'package:tapuntap/core/domain/usecases/usecase.dart';
import 'package:tapuntap/feature/library/domain/services/deck_api_service.dart';

class GetDecksUsecase implements UseCase<DataState<List<DeckEntity>>, void> {
  DeckApiService _deckApiService;

  GetDecksUsecase(this._deckApiService);

  @override
  Future<DataState<List<DeckEntity>>> call({void params}) {
    return _deckApiService.getDecks();
  }
}