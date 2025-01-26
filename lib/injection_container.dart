import 'package:get_it/get_it.dart';
import 'package:tapuntap/feature/library/data/api/local/deck_list_api.dart';
import 'package:tapuntap/feature/library/data/api/remote/scryfall_api.dart';
import 'package:tapuntap/feature/library/data/repositories/card_api_repository.dart';
import 'package:tapuntap/feature/library/domain/services/card_api_service.dart';
import 'package:tapuntap/feature/library/domain/usecases/get_card_by_id_usecase.dart';

final locator = GetIt.instance;

Future<void> initializeDependencies() async {
  // data
  locator.registerSingleton<ScryfallApi>(ScryfallApi());
  locator.registerSingleton<DeckListApi>(DeckListApi());

  // domain - services
  locator.registerSingleton<CardApiService>(CardApiRepository(locator()));

  // domain - usecases
  locator.registerSingleton<GetCardByIdUsecase>(GetCardByIdUsecase(locator()));
}