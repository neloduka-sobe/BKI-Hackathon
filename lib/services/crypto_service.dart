import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart';

class CryptoService {
  static final CryptoService _instance = CryptoService._internal();
  factory CryptoService() => _instance;
  CryptoService._internal();
  
  // Encryption key pairs
  late Key _encryptionKey;
  late IV _iv;
  late Encrypter _encrypter;
  bool _isInitialized = false;

  // Initialize encryption
  Future<void> initialize() async {
    if (_isInitialized) return;
    
    // Generate a random key for AES encryption (in a real app, this would be securely exchanged)
    final random = Random.secure();
    final keyBytes = List<int>.generate(32, (_) => random.nextInt(256));
    _encryptionKey = Key(Uint8List.fromList(keyBytes));
    
    // Generate initialization vector
    final ivBytes = List<int>.generate(16, (_) => random.nextInt(256));
    _iv = IV(Uint8List.fromList(ivBytes));
    
    // Create encrypter with AES in CBC mode
    _encrypter = Encrypter(AES(_encryptionKey, mode: AESMode.cbc));
    
    _isInitialized = true;
    print('Crypto service initialized with secure keys');
  }

  // Get encryption parameters for sharing (in a real app, this would be done securely)
  Map<String, String> getEncryptionParams() {
    if (!_isInitialized) throw Exception('Crypto service not initialized');
    return {
      'key': base64.encode(_encryptionKey.bytes),
      'iv': base64.encode(_iv.bytes),
    };
  }
  
  // Set encryption parameters (when receiving from another party)
  void setEncryptionParams(String keyBase64, String ivBase64) {
    final keyBytes = base64.decode(keyBase64);
    final ivBytes = base64.decode(ivBase64);
    
    _encryptionKey = Key(Uint8List.fromList(keyBytes));
    _iv = IV(Uint8List.fromList(ivBytes));
    _encrypter = Encrypter(AES(_encryptionKey, mode: AESMode.cbc));
    _isInitialized = true;
  }

  // Encrypt audio data
  Uint8List encryptAudio(Uint8List audioData) {
    if (!_isInitialized) throw Exception('Crypto service not initialized');
    
    // Split data into chunks for encryption (AES block size is 16 bytes)
    final chunkSize = 16 * (audioData.length ~/ 16);
    if (chunkSize == 0) return audioData; // Too small to encrypt
    
    final dataToEncrypt = audioData.sublist(0, chunkSize);
    final encrypted = _encrypter.encryptBytes(dataToEncrypt, iv: _iv);
    
    // Combine encrypted data with any remaining bytes
    final result = Uint8List(encrypted.bytes.length + (audioData.length - chunkSize));
    result.setRange(0, encrypted.bytes.length, encrypted.bytes);
    if (chunkSize < audioData.length) {
      result.setRange(encrypted.bytes.length, result.length, 
          audioData.sublist(chunkSize));
    }
    
    return result;
  }
  
  // Decrypt audio data
  Uint8List decryptAudio(Uint8List encryptedData) {
    if (!_isInitialized) throw Exception('Crypto service not initialized');
    
    // Split data to handle partial blocks
    final blockSize = 16;
    final encryptedSize = (encryptedData.length ~/ blockSize) * blockSize;
    if (encryptedSize == 0) return encryptedData; // Too small to have been encrypted
    
    final dataToDecrypt = encryptedData.sublist(0, encryptedSize);
    final decrypted = _encrypter.decryptBytes(
      Encrypted(Uint8List.fromList(dataToDecrypt)),
      iv: _iv
    );
    
    // Combine decrypted data with any remaining bytes
    final result = Uint8List(decrypted.length + (encryptedData.length - encryptedSize));
    result.setRange(0, decrypted.length, decrypted);
    if (encryptedSize < encryptedData.length) {
      result.setRange(decrypted.length, result.length, 
          encryptedData.sublist(encryptedSize));
    }
    
    return result;
  }
  
  // Generate voice fingerprint (for authentication)
  String generateVoiceFingerprint(Uint8List audioSample) {
    // In a real app, this would implement voice biometric algorithms
    // For demo, we'll create a simple hash of the audio data
    final hash = sha256.convert(audioSample);
    return hash.toString();
  }
  
  // Verify voice fingerprint
  bool verifyVoiceFingerprint(Uint8List audioSample, String storedFingerprint) {
    final currentFingerprint = generateVoiceFingerprint(audioSample);
    // In a real app, this would use proper voice pattern matching with confidence levels
    // For demo, we'll just compare hashes with slight variation allowed
    final fingerprintSimilarity = _calculateSimilarity(currentFingerprint, storedFingerprint);
    return fingerprintSimilarity > 0.7; // 70% similarity threshold
  }
  
  // Helper method to calculate similarity between fingerprints
  double _calculateSimilarity(String s1, String s2) {
    // Simple similarity algorithm for demo purposes
    // In a real app, this would use proper voice biometric comparison
    if (s1 == s2) return 1.0;
    
    int matches = 0;
    final length = min(s1.length, s2.length);
    
    for (int i = 0; i < length; i++) {
      if (s1[i] == s2[i]) matches++;
    }
    
    return matches / length;
  }
}
