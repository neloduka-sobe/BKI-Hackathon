import 'package:flutter/material.dart';

class AudioVisualizer extends StatelessWidget {
  final double height;
  final List<double> audioLevels;
  final Color color;
  final Color encryptedColor;
  final bool isEncrypted;

  const AudioVisualizer({
    Key? key,
    this.height = 50.0,
    this.audioLevels = const [],
    this.color = Colors.blue,
    this.encryptedColor = Colors.green,
    this.isEncrypted = true,
  }) : super(key: key);
V
  @override
  Widget build(BuildContext context) {
    // Use provided audio levels or generate random ones for demo
    final levels = audioLevels.isEmpty 
      ? List.generate(30, (_) => 0.5) 
      : audioLevels;
    
    return Container(
      height: height,
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: List.generate(levels.length, (index) {
          // Visual effect for encrypted audio - different pattern
          final level = levels[index];
          
          // Create an encrypted visual effect using alternating colors
          final barColor = isEncrypted && index % 3 == 0
              ? encryptedColor
              : color;
          
          return AnimatedContainer(
            duration: const Duration(milliseconds: 100),
            width: 4,
            height: level * height,
            decoration: BoxDecoration(
              color: barColor,
              borderRadius: BorderRadius.circular(2),
            ),
          );
        }),
      ),
    );
  }
}

