import 'package:flutter/material.dart' hide Router;
import 'package:google_fonts/google_fonts.dart';
import 'package:tapuntap/injection_container.dart';
import 'package:tapuntap/ui/router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  initializeDependencies();

  runApp(const Tapuntap());
}

class Tapuntap extends StatelessWidget {
  final primaryColor = const Color.fromARGB(255, 86, 35, 180);

  const Tapuntap({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tapuntap',
      initialRoute: '/',
      onGenerateRoute: Router.generateRoute,
      theme: ThemeData(
        primaryColor: primaryColor,
        colorScheme: ColorScheme(
          brightness: Brightness.dark,
          error: Colors.red,
          onError: Colors.white,
          surface: primaryColor,
          onSurface: Colors.white,
          primary: primaryColor,
          onPrimary: Colors.white,
          secondary: const Color(0xFF666666),
          onSecondary: Colors.white,
        ),
        useMaterial3: true,
        textTheme: TextTheme(
          titleLarge: GoogleFonts.roboto(
            color: Colors.black,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
          bodyLarge: GoogleFonts.roboto(
            color: primaryColor,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
          bodyMedium: GoogleFonts.roboto(
            color: primaryColor,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
          bodySmall: GoogleFonts.roboto(
            color: Colors.black,
            fontWeight: FontWeight.w500,
            fontSize: 16,
          ),
          // button
          labelLarge: GoogleFonts.roboto(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
      ),
    );
  }
}