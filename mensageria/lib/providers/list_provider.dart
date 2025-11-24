// lib/providers/list_provider.dart
import 'package:flutter/material.dart';
import '../models/shopping_list.dart';
import '../services/list_api_service.dart';
// import '../services/database_service.dart'; // Para persistência local (sqflite)

class ListProvider extends ChangeNotifier {
  final ListApiService _apiService = ListApiService();
  // Simulação de lista local
  List<ShoppingList> _lists = [
    ShoppingList(id: 'L001', name: 'Supermercado Mensal'),
    ShoppingList(id: 'L002', name: 'Reforma da Cozinha'),
  ];

  List<ShoppingList> get lists => _lists;

  /// Método que inicia o processo de checkout assíncrono.
  Future<void> performCheckout(String listId) async {
    // 1. Atualiza o status LOCAL para PENDENTE (Offline-First/Resiliência)
    final listIndex = _lists.indexWhere((l) => l.id == listId);
    if (listIndex == -1) return;

    final listToCheckout = _lists[listIndex].copyWith(
      checkoutStatus: CheckoutStatus.pendingCheckout,
      localUpdatedAt: DateTime.now(),
    );
    _lists[listIndex] = listToCheckout;
    notifyListeners();
    
    // Simular salvamento no DB local (DatabaseService.instance.upsertList(listToCheckout))
    
    // 2. Dispara a requisição síncrona para o Producer (List Service)
    final statusCode = await _apiService.triggerCheckout(listId);

    if (statusCode == 202) {
      // 3. Sucesso Síncrono: O Backend aceitou o pedido e o RabbitMQ recebeu.
      // O Consumer A ou B fará o processamento real.
      print('Frontend: Checkout de $listId aceito (202). Esperando evento de confirmação...');
      // A lista permanece em CheckoutStatus.pendingCheckout até que um mecanismo de
      // Sincronização ou WebSockets receba a CONFIRMAÇÃO REAL do consumer de eventos.
    } else {
      // 4. Falha na Requisição: O backend não recebeu/rejeitou o pedido.
      _lists[listIndex] = listToCheckout.copyWith(
        checkoutStatus: CheckoutStatus.inProgress, // Volta ao estado anterior
      );
      // Simular registro de erro na fila de sincronização (Roteiro 3)
      notifyListeners();
      throw Exception('Falha ao acionar Checkout. Status: $statusCode');
    }
  }

  // Este método seria chamado por um WebSocket ou Long Polling para CONFIRMAR
  // a conclusão do processo assíncrono (RabbitMQ Consumers)
  void updateCheckoutStatus(String listId, CheckoutStatus newStatus) {
     final listIndex = _lists.indexWhere((l) => l.id == listId);
     if (listIndex != -1) {
       _lists[listIndex] = _lists[listIndex].copyWith(
         checkoutStatus: newStatus,
         localUpdatedAt: DateTime.now(),
       );
       notifyListeners();
     }
  }
}