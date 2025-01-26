import 'package:flutter/material.dart';

class Layout extends StatelessWidget {
  final int currentIndex;
  final Widget body;
  final Function? onRefresh;

  const Layout({
    super.key,
    required this.currentIndex,
    required this.body,
    this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEAEAEE),
      body: body,
    );
  }
}