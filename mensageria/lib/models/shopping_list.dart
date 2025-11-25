// lib/models/shopping_list.dart
import 'package:uuid/uuid.dart';

enum CheckoutStatus {
  open,
  pendingCheckout, // Enviado ao backend, aguardando confirmação assíncrona
  completed,       // Processado com sucesso (via evento RabbitMQ no backend)
  inProgress,      // Lista ativa, ainda não enviada para checkout
  error,           // Falha no processamento assíncrono
}

class ShoppingList {
  final String id;
  final String name;
  final CheckoutStatus checkoutStatus;
  final DateTime localUpdatedAt;

  ShoppingList({
    String? id,
    required this.name,
    this.checkoutStatus = CheckoutStatus.inProgress,
    DateTime? localUpdatedAt,
  }) : id = id ?? const Uuid().v4(),
       localUpdatedAt = localUpdatedAt ?? DateTime.now();

  ShoppingList copyWith({
    String? name,
    CheckoutStatus? checkoutStatus,
    DateTime? localUpdatedAt,
  }) {
    return ShoppingList(
      id: id,
      name: name ?? this.name,
      checkoutStatus: checkoutStatus ?? this.checkoutStatus,
      localUpdatedAt: localUpdatedAt ?? DateTime.now(),
    );
  }

  // Métodos toMap/fromMap para SQLite seriam implementados aqui.
}