import 'package:tapuntap/core/resources/datastate.dart';
import 'package:tapuntap/core/domain/entities/card_entity.dart';

abstract class CardApiService {
  Future<DataState<CardEntity>> getCardById(String id);
}