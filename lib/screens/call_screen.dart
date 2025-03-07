import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:math';
import 'dart:typed_data';
import '../widgets/audio_visualizer.dart';
import '../services/audio_service.dart';
import 'verification_screen.dart';

class CallScreen extends StatefulWidget {
  const CallScreen({Key? key}) : super(key: key);

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> with TickerProviderStateMixin {
  final AudioService _audioService = AudioService();
  
  bool _callConnected = false;
  bool _muted = false;
  bool _speaker = false;
  bool _encrypted = true;
  
  // Simulated audio data for visualization
  List<double> _audioLevels = [];
  late Timer _audioSimulationTimer;
  
  // Animation controllers for encryption visualization
  late AnimationController _encryptionAnimationController;
  late Animation<double> _encryptAnimation;
  
  @override
  void initState() {
    super.initState();
    
    // Initialize audio service
    _audioService.initialize().then((_) {
      // Start call connection simulation
      _simulateCallConnection();
    });
    
    // Set up encryption animation
    _encryptionAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    
    _encryptAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _encryptionAnimationController,
        curve: Curves.easeInOut,
      )
    );
    
    // Start encryption animation
    _encryptionAnimationController.repeat(reverse: true);
    
    // Simulate audio levels for visualization
    _startAudioSimulation();
  }
  
  @override
  void dispose() {
    _audioSimulationTimer.cancel();
    _encryptionAnimationController.dispose();
    _audioService.dispose();
    super.dispose();
  }
  
  // Simulate call connection
  void _simulateCallConnection() async {
    // Generate and exchange encryption keys (simulated)
    await Future.delayed(const Duration(seconds: 1));
    print('Establishing secure connection...');
    
    // Simulate key exchange
    final encryptionParams = _audioService.getEncryptionParams();
    print('Encryption parameters shared with recipient: ${encryptionParams.length} bytes');
    
    // Simulate receiving confirmation
    await Future.delayed(const Duration(seconds: 1));
    
    if (mounted) {
      setState(() {
        _callConnected = true;
      });
      print('Secure call connection established');
    }
  }
  
  // Simulate audio data for visualization
  void _startAudioSimulation() {
    _audioLevels = List.generate(30, (_) => 0.0);
    
    _audioSimulationTimer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      if (!mounted) return;
      
      // Generate new random audio levels
      final random = Random();
      
      setState(() {
        for (int i = 0; i < _audioLevels.length; i++) {
          // When talking, audio levels are higher
          final maxLevel = _muted ? 0.2 : 0.8;
          _audioLevels[i] = random.nextDouble() * maxLevel;
        }
      });
      
      // Simulate audio processing with encryption
      if (_callConnected && !_muted) {
        final simulatedAudioPacket = Uint8List.fromList(
          List.generate(320, (_) => random.nextInt(256))
        );
        
        // Process outgoing audio
        final processedAudio = _audioService.processOutgoingAudio(simulatedAudioPacket);
        
        // Simulate receiving and processing incoming audio
        _audioService.processIncomingAudio(processedAudio);
      }
    });
  }

  void _endCall() {
    // End call and navigate back
    Navigator.of(context).pop();
  }

  void _toggleMute() {
    setState(() {
      _muted = !_muted;
    });
  }

  void _toggleSpeaker() {
    setState(() {
      _speaker = !_speaker;
    });
  }
  
  void _toggleEncryption() {
    setState(() {
      _encrypted = !_encrypted;
      _audioService.setEncryption(_encrypted);
    });
    
    // Show a message about encryption state
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _encrypted 
            ? 'Call encryption enabled' 
            : 'Call encryption disabled - NOT SECURE!',
        ),
        backgroundColor: _encrypted ? Colors.green : Colors.red,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _verifyIdentity() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const VerificationScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.blueGrey[900],
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Secure Call'),
        actions: [
          // Encryption toggle button
          IconButton(
            icon: AnimatedBuilder(
              animation: _encryptAnimation,
              builder: (context, child) {
                return Icon(
                  _encrypted ? Icons.enhanced_encryption : Icons.no_encryption,
                  color: _encrypted 
                    ? (_encryptAnimation.value > 0.5 ? Colors.green : Colors.lightGreen)
                    : Colors.red,
                );
              },
            ),
            onPressed: _toggleEncryption,
            tooltip: 'Toggle Encryption',
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircleAvatar(
              radius: 50,
              child: Icon(Icons.person, size: 60),
            ),
            const SizedBox(height: 20),
            const Text(
              'John Doe',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              _callConnected ? 'Connected' : 'Establishing secure connection...',
              style: TextStyle(
                fontSize: 16,
                color: _callConnected ? Colors.green : Colors.amber,
              ),
            ),
            const SizedBox(height: 30),
            
            // Audio visualizer with actual audio levels
            if (_callConnected) ...[
              AudioVisualizer(
                height: 100,
                audioLevels: _audioLevels,
              ),
              const SizedBox(height: 20),
              
              // Encryption info and animation
              AnimatedBuilder(
                animation: _encryptAnimation,
                builder: (context, child) {
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _encrypted ? Icons.lock : Icons.lock_open,
                        color: _encrypted ? Colors.green : Colors.red,
                        size: 18 + (_encryptAnimation.value * 4), // Pulsing effect
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _encrypted 
                          ? 'End-to-end encrypted call' 
                          : 'Unencrypted call',
                        style: TextStyle(
                          color: _encrypted ? Colors.green : Colors.red,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 10),
            ],
            
            // Security verification indicator
            if (_callConnected) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.security,
                    color: Colors.blue,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Verify caller identity',
                    style: TextStyle(
                      color: Colors.white70,
                    ),
                  ),
                  TextButton(
                    onPressed: _verifyIdentity,
                    child: const Text(
                      'Verify',
                      style: TextStyle(color: Colors.blue),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],
            
            // Call controls
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                FloatingActionButton(
                  onPressed: _toggleMute,
                  backgroundColor: _muted ? Colors.red : Colors.grey[800],
                  child: Icon(_muted ? Icons.mic_off : Icons.mic),
                ),
                FloatingActionButton(
                  onPressed: _endCall,
                  backgroundColor: Colors.red,
                  child: const Icon(Icons.call_end),
                ),
                FloatingActionButton(
                  onPressed: _toggleSpeaker,
                  backgroundColor: _speaker ? Colors.blue : Colors.grey[800],
                  child: Icon(_speaker ? Icons.volume_up : Icons.volume_down),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
