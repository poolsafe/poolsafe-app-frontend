import { View, Text } from 'react-native';

/**
 * Rota inicial do PoolSafe.
 *
 * Esta tela confirma apenas que o bootstrap técnico foi concluído.
 * Nenhuma funcionalidade de produto está implementada aqui.
 *
 * A tela de entrada real (login / cadastro) será implementada
 * como parte da fatia de autenticação.
 */
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-4">
      <Text className="text-3xl font-bold text-primary">PoolSafe</Text>
      <Text className="mt-2 text-base text-[#A3C2CC]">
        Bootstrap técnico concluído
      </Text>
    </View>
  );
}
