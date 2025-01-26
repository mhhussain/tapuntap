import 'package:flutter/material.dart';
import 'package:tapuntap/feature/library/domain/usecases/create_deck_usecase.dart';
import 'package:tapuntap/feature/library/domain/usecases/get_decks_usecase.dart';
import 'package:tapuntap/feature/library/domain/usecases/save_deck_usecase.dart';
import 'package:tapuntap/feature/library/ui/view_models/deck_list_view_model.dart';
import 'package:tapuntap/injection_container.dart';

class DeckListView extends StatefulWidget {
  const DeckListView({super.key});

  @override
  State<DeckListView> createState() => _DeckListViewState();
}

class _DeckListViewState extends State<DeckListView> {
  bool isLoading = true;

  DeckListViewModel model = DeckListViewModel(decks: []);
  final GetDecksUsecase _getDecksUsecase = locator<GetDecksUsecase>();
  final CreateDeckUsecase _createDeckUsecase = locator<CreateDeckUsecase>();
  final SaveDeckUsecase _saveDeckUsecase = locator<SaveDeckUsecase>();

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() async {
    final decks = await _getDecksUsecase();

    setState(() {
      model = DeckListViewModel(decks: decks.data!);
      isLoading = false;
    });
  }

  Future<void> showAddView() {
    return showModalBottomSheet(
      context: context,
      builder: (context) => Placeholder(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      child: Column(
        children: [
          ...model.decks.map((deck) => Text(deck.name)),
          FloatingActionButton(
            tooltip: 'add',
            shape: const CircleBorder(),
            onPressed: showAddView,
            child: const Icon(
              Icons.add,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}