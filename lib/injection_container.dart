import 'package:get_it/get_it.dart';
import 'package:tapuntap/feature/game/data/api/local/game_list_api.dart';
import 'package:tapuntap/feature/library/data/api/local/deck_list_api.dart';
import 'package:tapuntap/feature/library/data/api/remote/scryfall_api.dart';
import 'package:tapuntap/feature/library/data/repositories/card_api_repository.dart';
import 'package:tapuntap/feature/library/data/repositories/deck_api_repository.dart';
import 'package:tapuntap/feature/library/domain/services/card_api_service.dart';
import 'package:tapuntap/feature/library/domain/services/deck_api_service.dart';
import 'package:tapuntap/feature/library/domain/usecases/create_deck_usecase.dart';
import 'package:tapuntap/feature/library/domain/usecases/get_card_by_id_usecase.dart';
import 'package:tapuntap/feature/library/domain/usecases/get_decks_usecase.dart';
import 'package:tapuntap/feature/library/domain/usecases/save_deck_usecase.dart';

final locator = GetIt.instance;

Future<void> initializeDependencies() async {
  // data
  locator.registerSingleton<ScryfallApi>(ScryfallApi());
  locator.registerSingleton<DeckListApi>(DeckListApi());
  locator.registerSingleton<GameListApi>(GameListApi());

  // domain - services
  locator.registerSingleton<CardApiService>(CardApiRepository(locator()));
  locator.registerSingleton<DeckApiService>(DeckApiRepository(locator()));

  // domain - usecases
  locator.registerSingleton<GetCardByIdUsecase>(GetCardByIdUsecase(locator()));
  locator.registerSingleton<GetDecksUsecase>(GetDecksUsecase(locator()));
  locator.registerSingleton<CreateDeckUsecase>(CreateDeckUsecase(locator()));
  locator.registerSingleton<SaveDeckUsecase>(SaveDeckUsecase(locator()));
}