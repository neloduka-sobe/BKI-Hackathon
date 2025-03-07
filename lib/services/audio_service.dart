import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import '../services/crypto_service.dart';

class AudioService {
  static final AudioService _instance = AudioService._internal();
  factory AudioService() => _instance;
  AudioService._internal();
  
  final CryptoService _cryptoService = CryptoService();
  
  // Stream controllers for audio processing
  final StreamController<Uint8List> _audioInputController = StreamController<Uint8List>.broadcast();
  final StreamController<Uint8List> _audioOutputController = StreamController<Uint8List>.broadcast();
  
  // Audio processing flags
  bool _isEncryptionEnabled = true;
  bool _isProcessing = false;
  
  // Getters for streams
  Stream<Uint8List> get audioOutputStream => _audioOutputController.stream;
  Stream<Uint8List> get audioInputStream => _audioInputController.stream;
  
  // Initialize service
  Future<void> initialize() async {
    await _cryptoService.initialize();
    _startAudioProcessing();
  }
  
  // Set encryption state
  void setEncryption(bool enabled) {
    _isEncryptionEnabled = enabled;
  }
  
  // Process incoming audio
  void processIncomingAudio(Uint8List audioData) {
    if (_isEncryptionEnabled) {
      final decryptedAudio = _cryptoService.decryptAudio(audioData);
      _audioOutputController.add(decryptedAudio);
    } else {
      _audioOutputController.add(audioData);
    }
  }
  
  // Process outgoing audio
  Uint8List processOutgoingAudio(Uint8List audioData) {
    _audioInputController.add(audioData); // Add to stream for visualization
    
    if (_isEncryptionEnabled) {
      return _cryptoService.encryptAudio(audioData);
    } else {
      return audioData;
    }
  }
  
  // Start audio processing
  void _startAudioProcessing() {
    if (_isProcessing) return;
    _isProcessing = true;
    
    print('Audio encryption service started');
  }
  
  // Stop audio processing
  void stopAudioProcessing() {
    _isProcessing = false;
  }
  
  // Get encryption parameters to share with call recipient
  Map<String, String> getEncryptionParams() {
    return _cryptoService.getEncryptionParams();
  }
  
  // Set encryption parameters received from call initiator
  void setEncryptionParams(String keyBase64, String ivBase64) {
    _cryptoService.setEncryptionParams(keyBase64, ivBase64);
  }
  
  // Cleanup resources
  void dispose() {
    stopAudioProcessing();
    _audioInputController.close();
    _audioOutputController.close();
  }
}
