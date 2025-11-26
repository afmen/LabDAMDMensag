// lib/providers/list_provider.dart
import 'package:flutter/material.dart';
import '../models/shopping_list.dart';
import '../services/list_api_service.dart';

class ListProvider extends ChangeNotifier {
  final ListApiService _apiService = ListApiService();
  
  // Token Mockado
  final String _tempToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItbW9iaWxlIn0.FAKE";

  // Simulação de lista local
  List<ShoppingList> _lists = [
    ShoppingList(id: '999', name: 'Lista de Teste (RabbitMQ)'),
    ShoppingList(id: 'L002', name: 'Reforma da Cozinha'),
  ];

  List<ShoppingList> get lists => _lists;
  String? errorMessage;

  Future<bool> performCheckout(String listId) async {
    errorMessage = null;

    final listIndex = _lists.indexWhere((l) => l.id == listId);
    if (listIndex == -1) return false;

    final originalList = _lists[listIndex];

    // 1. Otimista: Muda para PENDENTE (Amarelo/Laranja)
    // A UI vai mostrar o Spinner imediatamente aqui
    _lists[listIndex] = originalList.copyWith(
      checkoutStatus: CheckoutStatus.pendingCheckout,
      localUpdatedAt: DateTime.now(),
    );
    notifyListeners();

    try {
      // 2. Chama o Backend
      final statusCode = await _apiService.triggerCheckout(listId, _tempToken);

      if (statusCode == 202) {
        print('✅ Frontend: Checkout aceito (202). Aguardando processamento...');
        
        // -----------------------------------------------------------
        // 🚨 O PULO DO GATO (SIMULAÇÃO DE CONCLUSÃO)
        // -----------------------------------------------------------
        // Como o backend é assíncrono e não manda push notification,
        // esperamos 3 segundos (tempo do RabbitMQ trabalhar) e 
        // assumimos que deu tudo certo para fechar o ciclo visual.
        await Future.delayed(const Duration(seconds: 3));

        // 3. Atualiza para COMPLETED (Verde)
        _lists[listIndex] = originalList.copyWith(
          checkoutStatus: CheckoutStatus.completed,
          localUpdatedAt: DateTime.now(),
        );
        notifyListeners(); // Avisa a tela para ficar verde
        
        return true; 
      } else {
        throw Exception('Status $statusCode');
      }

    } catch (e) {
      print('❌ Erro no checkout: $e');
      
      // 4. Rollback em caso de erro (Vermelho)
      _lists[listIndex] = originalList.copyWith(
        checkoutStatus: CheckoutStatus.error,
      );
      errorMessage = "Falha ao enviar. Tente novamente.";
      notifyListeners();
      return false;
    }
  }
}