import 'package:flutter/material.dart';
import 'package:tapuntap/core/domain/entities/card_entity.dart';

class Card extends StatelessWidget {
  final CardEntity card;
  
  const Card({
    super.key,
    required this.card,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      child: Image.network(card.imageUris['small'] ?? ''),
    );
  }
}