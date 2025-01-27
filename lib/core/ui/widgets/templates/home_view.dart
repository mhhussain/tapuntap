import 'package:flutter/material.dart' hide Card;
import 'package:tapuntap/core/domain/entities/card_entity.dart';
import 'package:tapuntap/feature/game/widgets/organisms/game_card.dart';
import 'package:tapuntap/feature/library/domain/usecases/get_card_by_id_usecase.dart';
import 'package:tapuntap/injection_container.dart';
import 'package:tapuntap/core/ui/view_models/home_view_model.dart';
import 'package:tapuntap/core/ui/widgets/layouts/_layout.dart';

class HomeView extends StatefulWidget {
  const HomeView({super.key});

  @override
  State<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<HomeView> {
  bool isLoading = true;
  final TextEditingController _searchController = TextEditingController();
  double rotationAngle = 0;

  HomeViewModel model = HomeViewModel(currentCard: CardEntity.defaultCard());

  final GetCardByIdUsecase _getCardByIdUsecase = locator<GetCardByIdUsecase>();

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() async {
    setState(() {
      isLoading = false;
    });
  }

  void _searchCard() async {
    setState(() {
      isLoading = true;
    });
    final cardId = _searchController.text;
    final card = await _getCardByIdUsecase(params: cardId);
    setState(() {
      model.currentCard = card.data!;
      isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Layout(
      currentIndex: 0,
      body: Container(
        padding: const EdgeInsets.all(100),
        child: Column(
          children: [
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                labelText: 'Search Card by ID',
                suffixIcon: IconButton(
                  icon: Icon(Icons.search),
                  onPressed: _searchCard,
                ),
              ),
            ),
            Expanded(
              child: GameCard(card: model.currentCard!),
            ),
          ]
        )
      )
    );
  }
}