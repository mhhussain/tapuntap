import 'package:tapuntap/core/resources/datastate.dart';
import 'package:tapuntap/core/domain/entities/deck_entity.dart';
import 'package:tapuntap/core/domain/usecases/usecase.dart';
import 'package:tapuntap/feature/library/domain/services/deck_api_service.dart';

class CreateDeckUsecase implements UseCase<DataState<void>, DeckEntity> {
  DeckApiService _deckApiService;

  CreateDeckUsecase(this._deckApiService);

  @override
  Future<DataState<void>> call({DeckEntity? params}) {
    return _deckApiService.addDeck(params!);
  }
}