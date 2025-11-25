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
        title: const Text('🛒 Minhas Listas'),
        backgroundColor: Colors.deepPurple,
        foregroundColor: Colors.white,
      ),
      body: Consumer<ListProvider>(
        builder: (context, provider, child) {
          return ListView.builder(
            padding: const EdgeInsets.all(8),
            itemCount: provider.lists.length,
            itemBuilder: (context, index) {
              final list = provider.lists[index];
              return Card(
                elevation: 2,
                margin: const EdgeInsets.symmetric(vertical: 6),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _getStatusColor(list.checkoutStatus),
                    child: const Icon(Icons.shopping_bag, color: Colors.white),
                  ),
                  title: Text(list.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(
                    'Status: ${_formatStatus(list.checkoutStatus)}',
                    style: TextStyle(color: _getStatusColor(list.checkoutStatus)),
                  ),
                  trailing: _buildActionButton(context, provider, list),
                ),
              );
            },
          );
        },
      ),
    );
  }

  // 🎨 Cores baseadas no SEU Enum atualizado
  Color _getStatusColor(CheckoutStatus status) {
    switch (status) {
      case CheckoutStatus.open:
      case CheckoutStatus.inProgress: // Ambos significam "Editável" no seu fluxo
        return Colors.blue;
      case CheckoutStatus.pendingCheckout:
        return Colors.orange;
      case CheckoutStatus.completed:
        return Colors.green;
      case CheckoutStatus.error: // 🚨 Antes era .failed
        return Colors.red;
    }
  }

  // 📝 Textos baseados no SEU Enum atualizado
  String _formatStatus(CheckoutStatus status) {
    switch (status) {
      case CheckoutStatus.open:       return 'Aberta';
      case CheckoutStatus.inProgress: return 'Em Andamento';
      case CheckoutStatus.pendingCheckout: return 'Processando...';
      case CheckoutStatus.completed:  return 'Finalizada';
      case CheckoutStatus.error:      return 'Erro no Envio'; // 🚨 Antes era .failed
    }
  }

  Widget _buildActionButton(BuildContext context, ListProvider provider, ShoppingList list) {
    // 1. Spinner (Aguardando 202)
    if (list.checkoutStatus == CheckoutStatus.pendingCheckout) {
      return const SizedBox(
        width: 24, height: 24,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }
    
    // 2. Botão de Ação (Para estados editáveis ou de erro)
    // Aceita tanto open, inProgress quanto error para permitir re-tentativa
    if (list.checkoutStatus == CheckoutStatus.open || 
        list.checkoutStatus == CheckoutStatus.inProgress || 
        list.checkoutStatus == CheckoutStatus.error) {
      return IconButton(
        icon: Icon(Icons.payment, color: Colors.deepPurple),
        tooltip: 'Finalizar Compra',
        onPressed: () => _showConfirmationDialog(context, provider, list),
      );
    }
    
    // 3. Sucesso
    if (list.checkoutStatus == CheckoutStatus.completed) {
      return const Icon(Icons.check_circle, color: Colors.green);
    }
    
    return const SizedBox.shrink();
  }

  void _showConfirmationDialog(BuildContext context, ListProvider provider, ShoppingList list) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Checkout'),
        content: Text('Deseja enviar a lista "${list.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(context).pop(); 
              bool success = await provider.performCheckout(list.id);
              if (context.mounted) {
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Pedido enviado!'), backgroundColor: Colors.green),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(provider.errorMessage ?? 'Erro'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            child: const Text('Enviar'),
          ),
        ],
      ),
    );
  }
}