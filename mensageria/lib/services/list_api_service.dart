// lib/services/list_api_service.dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class ListApiService {
  final String baseUrl = 'http://localhost:3000/lists'; 

  /// Dispara a ação de Checkout no backend de forma ASSÍNCRONA.
  /// Espera o retorno 202 Accepted.
  Future<int> triggerCheckout(String listId) async {
    final url = Uri.parse('$baseUrl/$listId/checkout');
    
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        // Dados mínimos para identificação da lista e usuário
        body: jsonEncode({'listId': listId, 'userId': 'user123'}), 
      );

      // 🎯 Requisito 1 (Backend): Endpoint HTTP deve retornar "202 Accepted" imediatamente.
      return response.statusCode;
    } catch (e) {
      print('Erro de rede/timeout no checkout: $e');
      return 500;
    }
  }
}