import 'package:flutter/material.dart';
import 'dart:math';

class VerificationScreen extends StatefulWidget {
  const VerificationScreen({Key? key}) : super(key: key);

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> with SingleTickerProviderStateMixin {
  bool _isVerifying = true;
  bool _verificationComplete = false;
  late AnimationController _animationController;
  double _verificationProgress = 0.0;
  
  @override
  void initState() {
    super.initState();
    
    // Animation controller for verification progress
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..addListener(() {
      setState(() {
        _verificationProgress = _animationController.value;
      });
      if (_animationController.isCompleted) {
        _completeVerification();
      }
    });
    
    // Start verification process
    _startVerification();
  }
  
  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }
  
  void _startVerification() {
    // In a real app, this would trigger the voice verification process
    _animationController.forward();
  }
  
  void _completeVerification() {
    // Simulate verification completion after animation
    setState(() {
      _isVerifying = false;
      _verificationComplete = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Identity Verification'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Verification status icon
            Icon(
              _isVerifying ? Icons.security_update 
                : (_verificationComplete ? Icons.verified_user : Icons.error),
              size: 80,
              color: _isVerifying ? Colors.blue 
                : (_verificationComplete ? Colors.green : Colors.red),
            ),
            const SizedBox(height: 30),
            
            // Status text
            Text(
              _isVerifying ? 'Verifying Voice Identity...' 
                : (_verificationComplete ? 'Identity Verified' : 'Verification Failed'),
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            
            // Progress indicator or results
            if (_isVerifying) ...[
              CircularProgressIndicator(value: _verificationProgress),
              const SizedBox(height: 30),
              Text('Processing voice patterns...'),
              const SizedBox(height: 10),
              _buildSimulatedWaveform(),
            ] else if (_verificationComplete) ...[
              _buildVerificationResults(),
            ],
            
            const SizedBox(height: 40),
            
            // Button to go back or retry
            ElevatedButton(
              onPressed: () {
                if (!_isVerifying) {
                  Navigator.of(context).pop();
                }
              },
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15),
              ),
              child: Text(_isVerifying ? 'Please wait...' : 'Done'),
            ),
          ],
        ),
      ),
    );
  }
  
  // Simulate a voice waveform pattern for demo
  Widget _buildSimulatedWaveform() {
    return SizedBox(
      height: 60,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(20, (index) {
          // Generate random heights for demo effect
          final random = Random();
          final height = 10 + (random.nextDouble() * 40 * _verificationProgress);
          
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 5,
              height: height,
              decoration: BoxDecoration(
                color: Colors.blue,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          );
        }),
      ),
    ),
  }

  // Show verification results when complete
  Widget _buildVerificationResults() {
    return Column(
      children: [
        const Text(
          'Voice pattern match: 92%',
          style: TextStyle(fontSize: 18),
        ),
        const SizedBox(height: 10),
        const Text(
          'Device signature: Verified',
          style: TextStyle(fontSize: 18),
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.security, color: Colors.green),
            SizedBox(width: 8),
            Text(
              'This call is secure',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
