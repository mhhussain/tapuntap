import 'package:flutter/material.dart' hide Card;
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:tapuntap/core/domain/entities/card_entity.dart';
import 'package:tapuntap/feature/game/domain/game_card_entity.dart';
import 'package:tapuntap/core/ui/widgets/organisms/card.dart';

class GameCard extends HookWidget {
  final CardEntity card;

  const GameCard({
    super.key,
    required this.card,
  });

  @override
  Widget build(BuildContext context) {
    final gameCard = useState<GameCardEntity>(
      GameCardEntity(
        card: card,
        state: 'untapped',
        face: 'faceup',
        selected: false,
        xposition: 0,
        yposition: 0,
      ),
    );

    return Container(
      child: GestureDetector(
        onTap: () => {
          gameCard.value = GameCardEntity(
            card: gameCard.value.card,
            state: gameCard.value.state == 'tapped' ? 'untapped' : 'tapped',
            face: gameCard.value.face,
            selected: gameCard.value.selected,
            xposition: gameCard.value.xposition,
            yposition: gameCard.value.yposition,
          )
        },
        child: Transform.rotate(
          angle: gameCard.value.state == 'tapped' ? 90 * 3.141592653589793 / 180 : 0,
          child: Card(card: gameCard.value.card)
        ),
      ),
    );
  }
}