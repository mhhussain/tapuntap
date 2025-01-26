// define card
// define card owner
// define card current owner - because cards can change ownership?
// define card current location (do we need this? will need to be synced with the game state)
// define state (tapped or untapped)
// define whether this is currently selected or not
// define card position?

import 'package:tapuntap/domain/entities/card_entity.dart';

class GameCardEntity {
  final CardEntity card;
  // final PlayerEntity owner;
  // final PlayerEntity currentOwner;
  final String state;
  final String face;
  final bool selected;
  final int xposition;
  final int yposition;

  GameCardEntity({
    required this.card,
    // required this.owner,
    // required this.currentOwner,
    required this.state,
    required this.face,
    required this.selected,
    required this.xposition,
    required this.yposition,
  });
}