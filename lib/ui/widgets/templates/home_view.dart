import 'package:flutter/material.dart';
import 'package:tapuntap/feature/library/domain/usecases/get_card_by_id_usecase.dart';
import 'package:tapuntap/injection_container.dart';
import 'package:tapuntap/ui/view_models/home_view_model.dart';

class HomeView extends StatefulWidget {
  const HomeView({super.key});

  @override
  State<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<HomeView> {
  bool isLoading = true;

  HomeViewModel model = HomeViewModel(currentCard: null);

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

  @override
  Widget build(BuildContext context) {
    return Text('Home View');
  }
}