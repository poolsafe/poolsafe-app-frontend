# 📱 Guia de Build e Geração de APK — PoolSafe

Este documento consolida a arquitetura de build do PoolSafe Android, separando os fluxos de **Desenvolvimento** e **Release**, documentando as armadilhas solucionadas (limite de caminho no Windows, arquiteturas de CPU e registro de Push FCM) e o procedimento para gerar atualizações.

---

## 🧭 Visão Geral: Desenvolvimento vs. Release

| Característica | Desenvolvimento (`Debug`) | Produção (`Release`) |
|---|---|---|
| **Comando principal** | `npx expo run:android` | `.\gradlew.bat assembleRelease` |
| **Execução** | Depende do Metro Bundler ativo no PC | 100% autônomo no smartphone |
| **Código JS/Assets** | Servido via HTTP/WebSocket pelo Metro | Embutido no APK (Hermes Bytecode compilado) |
| **URL da API** | `.env` local (`http://10.0.2.2:3000` ou IP Wi-Fi) | Canonical HTTPS fixa (`https://api.poolsafe.app/api/v1`) |
| **Assinatura** | `debug.keystore` padrão do Android SDK | `poolsafe-release.keystore` dedicada |
| **Push Token (FCM)** | Registrado com SHA-1 de debug | Registrado com SHA-1 de release no Firebase |

---

## 🧩 Descobertas e Soluções Críticas de Engenharia

### 1. Limite de 260 Caracteres no Windows (`MAX_PATH`)
* **Problema:** A Nova Arquitetura do React Native compila código nativo C++ com CMake e Ninja. No Windows, caminhos longos de pastas geram o erro fatal: `ninja: error: Stat(...): Filename longer than 260 characters`.
* **Solução:** Mapeamos a raiz do repositório para uma unidade virtual curta `P:` via comando `subst`.

### 2. Incompatibilidade de Arquitetura de CPU (ABI)
* **Problema:** Emuladores de PC rodam sob `x86_64`, enquanto smartphones reais rodam sob processadores ARM (`arm64-v8a` ou `armeabi-v7a`). Compilar sem especificar ABI gera o erro *"O app não é compatível com o seu dispositivo"*.
* **Solução:** Passamos explicitamente `-PreactNativeArchitectures=arm64-v8a,armeabi-v7a` durante o build do Gradle.

### 3. Falha no Token Push FCM (`SERVICE_NOT_AVAILABLE`)
* **Problema:** Ao abrir o APK release no celular, a chamada nativa `Notifications.getDevicePushTokenAsync()` falhava com:  
  `java.util.concurrent.ExecutionException: java.io.IOException: SERVICE_NOT_AVAILABLE`.
* **Causa:** O Google Play Services e a Google Cloud API verificam a integridade e autenticidade da assinatura do aplicativo. Como o APK de release utiliza uma nova chave criptográfica (`poolsafe-release.keystore`), a sua impressão digital não existia no Firebase Console, bloqueando a autorização de emissão do token.
* **Solução:** Cadastramos o SHA-1 e SHA-256 da keystore de release no Firebase Console.
* **Frequência:** **Apenas 1 vez por keystore.** Você **não** precisa refazer esse processo a cada atualização; o Firebase continuará reconhecendo todos os APKs futuros assinados com essa chave.
  > [!NOTE]
  > **Atenção a redes e Wi-Fi:** O FCM mantém um socket TCP nas portas `5228`, `5229`, `5230` e `443` (`mtalk.google.com`). Se o aparelho estiver conectado em Wi-Fi corporativo restritivo, com bloqueadores de DNS (Pi-hole, AdGuard) ou VPN, pode haver recusa de conexão pelo sistema operacional. Testar no 4G/5G isola o problema.

---

## 🔐 Identidade Criptográfica de Release

Os parâmetros de assinatura estão configurados no arquivo `android/key.properties` (ignorado no Git):
* **Keystore:** `android/app/poolsafe-release.keystore`
* **Alias:** `poolsafe-release-key`
* **Impressões Digitais cadastradas no Firebase (`poolsafe-1f0db`):**
  * **SHA-1:** `A4:58:E3:4D:34:81:C7:F7:58:AE:75:1E:07:9C:57:42:7F:A8:7F:24`
  * **SHA-256:** `DC:62:B7:CF:62:CA:16:E7:D1:E1:AB:FC:C0:B9:0A:57:95:3A:CE:08:9A:39:9E:C5:9D:38:DF:5F:69:03:62:24`

> [!CAUTION]
> **Backup Obrigatório:** Guarde uma cópia de segurança fora do repositório dos arquivos `poolsafe-release.keystore` e `key.properties`. Se eles forem perdidos, você não conseguirá lançar atualizações para aparelhos já instalados sem antes forçar uma desinstalação completa.

---

## 💻 Configuração em um Novo Computador ou Outro Desenvolvedor

Se você trocar de máquina ou outro membro da equipe for compilar o projeto:

### Cenário A: Apenas Desenvolver e Testar Localmente (`Debug`)
* **Nenhuma chave de release é necessária!**
* Basta clonar o repositório, rodar `npm install` e executar `npx expo run:android`.
* O Android SDK gerará automaticamente uma chave `debug.keystore` local no novo ambiente.

### Cenário B: Compilar o APK Release (`Produção`)
Para gerar o APK oficial com a mesma assinatura e funcionamento do FCM, copie os dois arquivos protegidos (guardados no seu backup/cofre) para os seguintes destinos dentro de `poolsafe-app-frontend`:

1. **Copiar o arquivo da Keystore:**
   * **Origem:** Seu backup de `poolsafe-release.keystore`
   * **Destino no projeto:** `android/app/poolsafe-release.keystore`

2. **Criar o arquivo de Propriedades:**
   * **Destino no projeto:** `android/key.properties`
   * *(Copie o modelo [`android/key.properties.example`](./android/key.properties.example) e renomeie para `key.properties`)*
   * **Conteúdo:**
     ```properties
     storePassword=<SENHA_DA_KEYSTORE>
     keyPassword=<SENHA_DA_CHAVE>
     keyAlias=poolsafe-release-key
     storeFile=poolsafe-release.keystore
     ```

> [!IMPORTANT]
> **Por que esses arquivos não estão no GitHub?**  
> Chaves criptográficas de produção e suas respectivas senhas **nunca** devem ser comitadas em repositórios de código (mesmo privados). Guarde-os sempre em um cofre de senhas seguro (ex: Bitwarden, 1Password, KeePass) ou cofre corporativo.

---

## 🚀 Passo a Passo: Compilando o APK Release

Execute os passos abaixo no **PowerShell** na máquina de desenvolvimento:

### 1. Mapear o Drive Virtual `P:`
Mapeie a pasta mãe do repositório (a que contém `poolsafe-app-frontend` e `poolsafe-app-backend`):
```powershell
subst P: <CAMINHO_RAIZ_REPOSITORIO>

# Exemplo prático:
# subst P: C:\Projetos\Github-Poolsafe-TCC
# subst P: C:\Users\<SeuUsuario>\Documents\Github-Poolsafe-TCC
```

### 2. Acessar o Diretório Nativo
```powershell
cd P:\poolsafe-app-frontend\android
```

### 3. Executar o Build com Suporte ARM
```powershell
.\gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"
```
> **Nota:** As aspas duplas em `"-PreactNativeArchitectures=..."` são obrigatórias no PowerShell para evitar que a vírgula seja interpretada como separador de argumentos.

### 4. Localizar o APK Gerado
Após o término com `BUILD SUCCESSFUL`, o artefato final estará em:
```text
P:\poolsafe-app-frontend\android\app\build\outputs\apk\release\app-release.apk
# ou <CAMINHO_RAIZ>\poolsafe-app-frontend\android\app\build\outputs\apk\release\app-release.apk
```

### 5. Desmontar a Unidade Virtual (Ao finalizar)
```powershell
subst P: /d
```

---

## 📲 Como Instalar e Atualizar no Aparelho

1. **Envio do Arquivo:** Envie o `app-release.apk` para o smartphone (cabo USB, Google Drive, WhatsApp Web, Telegram, etc.).
2. **Primeira Instalação:** Toque no arquivo e confirme a permissão de instalação de fontes desconhecidas no Android.
3. **Atualizações Futuras:** Ao gerar uma nova versão compilada:
   * Basta instalar o novo APK por cima da versão existente.
   * O Android reconhecerá a mesma assinatura e atualizará o app mantendo login, sessão e banco local intactos.
   * O token FCM e as notificações continuarão funcionando sem nenhuma intervenção.

---

## ⚡ Fluxo Alternativo: Desenvolvimento via Cabo USB (Depuração USB)

Para testar alterações com recarregamento rápido (Hot Reload) sem gerar um APK release:

1. No smartphone Android: ative **Opções do desenvolvedor** e marque **Depuração USB**.
2. Conecte ao PC via cabo e confirme a autorização na tela do celular.
3. Valide o dispositivo conectado:
   ```powershell
   adb devices
   ```
4. Na pasta do frontend, inicie o app de desenvolvimento direto no aparelho:
   ```powershell
   cd P:\poolsafe-app-frontend
   # ou: cd <CAMINHO_RAIZ>\poolsafe-app-frontend
   npx expo run:android --device
   ```
