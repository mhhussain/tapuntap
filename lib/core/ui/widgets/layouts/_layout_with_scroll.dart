import 'package:flutter/material.dart';
import 'package:tapuntap/core/ui/widgets/layouts/_layout.dart';

class LayoutWithScroll extends StatelessWidget {
  final int currentIndex;
  final List<Widget>? slivers;
  final Widget? body;
  final Function? onRefresh;

  const LayoutWithScroll({
    super.key,
    required this.currentIndex,
    this.slivers,
    this.body,
    this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return Layout(
      currentIndex: currentIndex,
      onRefresh: onRefresh,
      body: CustomScrollView(
        slivers: slivers ?? [ SliverToBoxAdapter(child: body) ],
      )
    );
  }
}