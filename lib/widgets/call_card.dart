// lib/widgets/call_card.dart
import 'package:flutter/material.dart';

class CallCard extends StatelessWidget {
  final String name;
  final String time;
  final bool verified;
  final String duration;
  final VoidCallback onTap;
  
  const CallCard({
    Key? key,
    required this.name,
    required this.time,
    required this.verified,
    required this.duration,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ListTile(
        leading: CircleAvatar(
          child: Text(name[0]),
        ),
        title: Text(name),
        subtitle: Text(time),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              verified ? Icons.verified_user : Icons.warning,
              color: verified ? Colors.green : Colors.orange,
              size: 16,
            ),
            const SizedBox(width: 8),
            Text(duration),
          ],
        ),
        onTap: onTap,
      ),
    );
  }
}
