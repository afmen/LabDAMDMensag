// lib/screens/home_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/shopping_list.dart';
import '../providers/list_provider.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Minhas Listas de Compras'),
      ),
      body: Consumer<ListProvider>(
        builder: (context, provider, child) {
          return ListView.builder(
            itemCount: provider.lists.length,
            itemBuilder: (context, index) {
              final list = provider.lists[index];
              return ListTile(
                title: Text(list.name),
                subtitle: Text('Status: ${list.checkoutStatus.name}'),
                trailing: _buildActionButton(context, provider, list),
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildActionButton(BuildContext context, ListProvider provider, ShoppingList list) {
    if (list.checkoutStatus == CheckoutStatus.pendingCheckout) {
      // Indicador de que o evento foi disparado e o processamento assíncrono está rodando (RabbitMQ)
      return const SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }
    
    if (list.checkoutStatus == CheckoutStatus.inProgress) {
      return ElevatedButton.icon(
        icon: const Icon(Icons.send),
        label: const Text('Checkout'),
        onPressed: () => _showConfirmationDialog(context, provider, list),
      );
    }
    
    if (list.checkoutStatus == CheckoutStatus.completed) {
      return const Icon(Icons.done_all, color: Colors.green);
    }
    
    return const SizedBox.shrink();
  }

  void _showConfirmationDialog(BuildContext context, ListProvider provider, ShoppingList list) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Checkout'),
        content: Text('Deseja finalizar a lista "${list.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              provider.performCheckout(list.id).catchError((e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Erro no Checkout: ${e.toString()}')),
                );
              });
            },
            child: const Text('Finalizar'),
          ),
        ],
      ),
    );
  }
}