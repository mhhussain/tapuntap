import 'package:cardgames/feature/library/data/models/deck_model.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DeckListApi {

  static const String key = 'DB.DECKS.local';

  Future<bool> clear() async {
    final instance = await SharedPreferences.getInstance();
    await instance.reload();
    
    return await instance.remove(key);
  }

  // get list
  Future<List<DeckModel>> get() async {
    final instance = await SharedPreferences.getInstance();
    await instance.reload();

    final list = instance.getStringList(key) ?? [];

    return [
      ...list.map((n) => DeckModel.fromBase64String(n)),
    ];
  }
  
  // add new to list
  Future<void> add(DeckModel n) async {
    final instance = await SharedPreferences.getInstance();
    await instance.reload();

    // check for duplicates
    final list = await get();
    if (!list.any((i) => i.id == n.id)) {
      await instance.setStringList(key, [...list, n].map((i) => i.toBase64String()).toList());
    }
  }

  // remove from list
  Future<void> removeNotification(DeckModel n) async {
    final instance = await SharedPreferences.getInstance();
    await instance.reload();

    await instance.setStringList(key, (await get()).where((i) => i.id != n.id).map((i) => i.toBase64String()).toList());
  }
}