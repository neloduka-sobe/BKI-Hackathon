import 'package:flutter/material.dart';
import '../widgets/app_button.dart';
import '../widgets/call_card.dart';
import 'call_screen.dart';
import 'verification_screen.dart';
import 'auth_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // Mock data for demo
  final List<Map<String, dynamic>> _recentCalls = [
    {
      'name': 'John Doe',
      'time': '2 mins ago',
      'verified': true,
      'duration': '3:24',
    },
    {
      'name': 'Alice Smith',
      'time': '1 hour ago',
      'verified': false,
      'duration': '1:05',
    },
  ];

  /// Handle initiating a new secure call
  void _initiateNewCall() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const CallScreen()),
    );
  }

  /// Handle verification process
  void _verifyIdentity() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const VerificationScreen()),
    );
  }

  /// View user profile
  void _viewUserProfile() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const AuthScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Secure Call'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: _viewUserProfile,
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Security status card
            _buildSecurityStatusCard(),
            
            const SizedBox(height: 24),
            
            // Recent calls section
            _buildRecentCallsSection(),
            
            const SizedBox(height: 24),
            
            // Quick actions
            _buildQuickActionsSection(),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _initiateNewCall,
        tooltip: 'New Call',
        child: const Icon(Icons.call),
      ),
    );
  }

  /// Build the security status card widget
  Widget _buildSecurityStatusCard() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Security Status',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: const [
                Icon(Icons.security, color: Colors.green),
                SizedBox(width: 8),
                Text('Your call security is active'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Build the recent calls section
  Widget _buildRecentCallsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Recent Calls',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _recentCalls.length,
          itemBuilder: (context, index) {
            return CallCard(
              name: _recentCalls[index]['name'],
              time: _recentCalls[index]['time'],
              verified: _recentCalls[index]['verified'],
              duration: _recentCalls[index]['duration'],
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (context) => const CallScreen()),
                );
              },
            );
          },
        ),
      ],
    );
  }

  /// Build the quick actions section
  Widget _buildQuickActionsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            // New Secure Call button
            AppButton(
              icon: Icons.call,
              label: 'New Call',
              onPressed: _initiateNewCall,
            ),
            // Verify Identity button
            AppButton(
              icon: Icons.verified_user,
              label: 'Verify Identity',
              onPressed: _verifyIdentity,
            ),
          ],
        ),
      ],
    );
  }
}
