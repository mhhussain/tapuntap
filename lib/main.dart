import 'package:flutter/material.dart' hide Router;
import 'package:tapuntap/injection_container.dart';
import 'package:tapuntap/ui/router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  initializeDependencies();

  runApp(const Tapuntap());
}

class Tapuntap extends StatelessWidget {
  const Tapuntap({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tapuntap',
      initialRoute: '/',
      onGenerateRoute: Router.generateRoute,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
    );
  }
}