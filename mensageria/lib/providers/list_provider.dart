import 'package:flutter/material.dart';
import '../models/shopping_list.dart';
import '../services/list_api_service.dart';

class ListProvider extends ChangeNotifier {
  final ListApiService _apiService = ListApiService();
  
  // Token Mockado
  final String _tempToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItbW9iaWxlIn0.FAKE";

  // Simulação de lista local
  List<ShoppingList> _lists = [
    // 🚨 AJUSTE: Usando o construtor do seu Model (que padroniza como inProgress)
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

    // 1. Otimista: Muda para PENDENTE (Amarelo)
    _lists[listIndex] = originalList.copyWith(
      checkoutStatus: CheckoutStatus.pendingCheckout,
      localUpdatedAt: DateTime.now(),
    );
    notifyListeners();

    try {
      final statusCode = await _apiService.triggerCheckout(listId, _tempToken);

      if (statusCode == 202) {
        print('✅ Frontend: Checkout aceito (202).');
        return true; 
      } else {
        throw Exception('Status $statusCode');
      }

    } catch (e) {
      print('❌ Erro no checkout: $e');
      
      // 2. Rollback em caso de erro
      // 🚨 CORREÇÃO: Usamos .error (conforme seu Model) ou voltamos para .inProgress
      _lists[listIndex] = originalList.copyWith(
        checkoutStatus: CheckoutStatus.error, // Marca visualmente que deu erro
      );
      errorMessage = "Falha ao enviar. Tente novamente.";
      notifyListeners();
      return false;
    }
  }
}