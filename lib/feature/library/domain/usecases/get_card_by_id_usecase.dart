import 'package:tapuntap/core/resources/datastate.dart';
import 'package:tapuntap/domain/entities/card_entity.dart';
import 'package:tapuntap/domain/usecases/usecase.dart';
import 'package:tapuntap/feature/library/domain/services/card_api_service.dart';

class GetCardByIdUsecase implements UseCase<DataState<CardEntity>, String> {
  final CardApiService _cardApiService;

  GetCardByIdUsecase(this._cardApiService);

  @override
  Future<DataState<CardEntity>> call({String? params}) {
    return _cardApiService.getCardById(params!);
  }
}