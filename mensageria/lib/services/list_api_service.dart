import 'dart:io'; // Necessário para Platform.isAndroid
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter/foundation.dart'; // Para kIsWeb

class ListApiService {
  // 1. Configuração Dinâmica da URL do Gateway
  String get baseUrl {
    if (kIsWeb) return 'http://localhost:3000'; // Web aceita localhost
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000'; // IP especial do Emulador Android
    }
    // Para iOS Simulator ou Dispositivo Físico (ajuste se for físico!)
    return 'http://localhost:3000'; 
  }

  /// Dispara o Checkout.
  /// [token] é o JWT que você recebeu no login.
  Future<int> triggerCheckout(String listId, String token) async {
    final url = Uri.parse('$baseUrl/lists/$listId/checkout');
    
    print('📡 [FLUTTER] Chamando Gateway: $url');

    try {
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          // 2. 🚨 Adiciona o Token exigido pelo Gateway
          'Authorization': 'Bearer $token', 
        },
        // O Gateway extrai o userId do token, mas o backend aceita no body também
        body: jsonEncode({
          'userId': 'user-mobile-01', // O Gateway vai sobrescrever com o do Token se configurado
        }),
      );

      print('📥 [FLUTTER] Status Code: ${response.statusCode}');
      
      if (response.statusCode != 202) {
         print('❌ Erro no corpo: ${response.body}');
      }

      return response.statusCode;
    } catch (e) {
      print('❌ [FLUTTER] Erro de rede: $e');
      // Retorna 0 ou 500 para a UI tratar
      return 500;
    }
  }
}