package expo.modules.criticalalarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * Receptor Firebase Cloud Messaging customizado do PoolSafe (Task 9B.4).
 *
 * Herda de [ExpoFirebaseMessagingService] para:
 * 1. Interceptar a mensagem remota diretamente em Kotlin sem depender do runtime JS;
 * 2. Inspecionar a prioridade efetivamente recebida (HIGH vs degradada) e condições de início;
 * 3. Validar rigorosamente o contrato do payload antes de qualquer ação;
 * 4. Deduplicar entregas e alertas através de [AlarmStateManager];
 * 5. Reconciliar o estado ativo mesmo em processos encerrados abruptamente;
 * 6. Validar a idade do evento com base no detectedAt original (janela de 5 minutos);
 * 7. Para mensagens fora da janela, apresentar notificação convencional sem som/vibração
 *    em canal dedicado, sem encaminhar ao Expo para garantir silêncio absoluto;
 * 8. Para mensagens elegíveis, acionar o Foreground Service de alarme crítico (mediaPlayback);
 * 9. Encaminhar SEMPRE tokens novos (super.onNewToken) para preservar o registro no Expo.
 */
class PoolSafeFirebaseMessagingService : ExpoFirebaseMessagingService() {

  companion object {
    private const val TAG = "PoolSafeFCM"

    // Janela limite de 5 minutos (300 segundos) para autorizar disparo da sirene
    const val MAX_ALARM_AGE_MS = 5 * 60 * 1000L

    // Tolerância para dessincronização de relógio no futuro (1 minuto)
    const val MAX_FUTURE_SKEW_MS = 60 * 1000L

    // Canal isolado para alertas atrasados (sem som e sem vibração)
    const val CHANNEL_DELAYED_ID = "poolsafe_delayed_alerts_v1"
    const val CHANNEL_DELAYED_NAME = "Alertas Informativos PoolSafe"
    const val CHANNEL_DELAYED_DESC = "Notificações informativas de alertas recebidos com atraso (sem som e sem vibração)"

    // Canal dedicado para alertas de nível ATENCAO (banner flutuante no topo, sem sirene sonora)
    const val CHANNEL_ATTENTION_ID = "poolsafe_alertas_atencao_v1"
    const val CHANNEL_ATTENTION_NAME = "Alertas de Atenção PoolSafe"
    const val CHANNEL_ATTENTION_DESC = "Notificações em destaque para alertas de nível atenção (sem sirene)"
  }

  override fun onNewToken(token: String) {
    super.onNewToken(token)
  }

  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    var shouldForwardToExpo = true
    try {
      shouldForwardToExpo = processCriticalAlarmPayload(remoteMessage)
    } catch (e: Exception) {
      Log.e(TAG, "Erro inesperado ao processar mensagem nativa: ${e.message}", e)
      shouldForwardToExpo = true
    } finally {
      if (shouldForwardToExpo) {
        try {
          super.onMessageReceived(remoteMessage)
        } catch (e: Exception) {
          Log.e(TAG, "Falha ao encaminhar mensagem para ExpoFirebaseMessagingService: ${e.message}", e)
        }
      }
    }
  }

  /**
   * Processa o payload de alarme crítico nativo.
   * Retorna true se a mensagem deve ser repassada ao Expo, ou false se foi
   * consumida/silenciada nativamente (duplicação, descarte ou recebimento atrasado).
   */
  private fun processCriticalAlarmPayload(remoteMessage: RemoteMessage): Boolean {
    val data = remoteMessage.data

    // 1. Verificação da prioridade efetivamente recebida
    val priority = remoteMessage.priority
    val originalPriority = remoteMessage.originalPriority
    val isHighPriority = priority == RemoteMessage.PRIORITY_HIGH

    Log.i(TAG, "FCM recebido. prioridade=$priority (original=$originalPriority, high=$isHighPriority)")

    // 2. Validação rigorosa do contrato do payload (Task 9B.3 / 9B.4)
    val schemaVersion = data["schemaVersion"]
    val type = data["type"]
    val severity = data["severity"]
    val alertId = data["alertId"]
    val deliveryId = data["deliveryId"]
    val title = data["title"]
    val message = data["message"]
    val detectedAtStr = data["detectedAt"]

    val isValidContract = schemaVersion == "1" &&
        type == "ALERT" &&
        (severity == "CRITICA" || severity == "ATENCAO") &&
        !alertId.isNullOrBlank() &&
        !deliveryId.isNullOrBlank()

    if (!isValidContract) {
      // Mensagem não é um alerta crítico PoolSafe. Permite encaminhamento normal ao Expo.
      return true
    }

    val stateManager = AlarmStateManager.getInstance(this)

    // 3. Reconciliação imediata do estado ativo antes de qualquer verificação
    stateManager.reconcileActiveState()

    // 4. Deduplicação de entrega (deliveryId já processado anteriormente nas últimas 24h)
    if (stateManager.isDeliveryProcessed(deliveryId)) {
      Log.i(TAG, "Entrega duplicada ignorada: deliveryId=$deliveryId, alertId=$alertId")
      return false
    }

    // 4.1. Alerta de nível ATENCAO: registra entrega e apresenta apenas notificação silenciosa (sem sirene)
    if (severity == "ATENCAO") {
      Log.i(TAG, "Alerta ATENCAO recebido: alertId=$alertId, deliveryId=$deliveryId. Apresentando notificação silenciosa.")
      stateManager.recordDeliveryProcessed(deliveryId)
      showConventionalDelayedNotification(alertId, title, message, isDelayed = false)
      return false
    }

    // 5. Se o alerta já está ativo em reprodução no momento, ignora repetição
    val activeAlertId = stateManager.getActiveAlertId()
    if (activeAlertId == alertId) {
      Log.i(TAG, "Alerta já está ativo em reprodução: alertId=$alertId. Ignorando repetição.")
      stateManager.recordDeliveryProcessed(deliveryId)
      return false
    }

    // 6. Verificação de alerta já finalizado, silenciado ou substituído (retenção de 2h)
    if (stateManager.isAlertDismissed(alertId)) {
      Log.i(TAG, "Alerta já processado/finalizado/substituído anteriormente: alertId=$alertId. Ignorando reativação.")
      stateManager.recordDeliveryProcessed(deliveryId)
      return false
    }

    // 7. Validação da idade do evento (janela de 5 minutos baseada no detectedAt original)
    val now = System.currentTimeMillis()
    val detectedEpochMs = parseIsoTimestamp(detectedAtStr)

    val isAgeEligible = when {
      detectedEpochMs == null -> {
        Log.w(TAG, "detectedAt ausente ou inválido ('$detectedAtStr'). Alerta desqualificado para sirene crítica.")
        false
      }
      detectedEpochMs > (now + MAX_FUTURE_SKEW_MS) -> {
        Log.w(TAG, "detectedAt excessivamente no futuro ('$detectedAtStr', skew=${detectedEpochMs - now}ms). Alerta desqualificado para sirene crítica.")
        false
      }
      (now - detectedEpochMs) > MAX_ALARM_AGE_MS -> {
        Log.i(TAG, "Alerta expirado para sirene sonora (idade=${now - detectedEpochMs}ms > ${MAX_ALARM_AGE_MS}ms). Apresentação convencional silenciosa.")
        false
      }
      else -> true
    }

    // 8. Tratamento para mensagens recebidas fora da janela
    if (!isAgeEligible) {
      // Registra entrega como processada
      stateManager.recordDeliveryProcessed(deliveryId)

      // Exibe notificação convencional sem som e sem vibração em canal dedicado
      showConventionalDelayedNotification(alertId, title, message)

      // Retorna false para NÃO encaminhar ao Expo, garantindo silêncio absoluto
      return false
    }

    // 9. Mensagem elegível dentro da janela de 5 minutos: aciona o Foreground Service
    val serviceIntent = Intent(this, CriticalAlarmForegroundService::class.java).apply {
      action = CriticalAlarmForegroundService.ACTION_START
      putExtra(CriticalAlarmForegroundService.EXTRA_ALERT_ID, alertId)
      putExtra(CriticalAlarmForegroundService.EXTRA_DELIVERY_ID, deliveryId)
      putExtra(CriticalAlarmForegroundService.EXTRA_TITLE, title)
      putExtra(CriticalAlarmForegroundService.EXTRA_MESSAGE, message)
    }

    try {
      ContextCompat.startForegroundService(this, serviceIntent)
      Log.i(TAG, "ForegroundService solicitado com sucesso para alertId=$alertId, deliveryId=$deliveryId (idade=${now - (detectedEpochMs ?: now)}ms)")
    } catch (e: Exception) {
      // Trata recusas do sistema (ex.: restrições de bateria severas ou Android 12+)
      Log.w(TAG, "Recusa do SO ao iniciar ForegroundService: ${e.javaClass.simpleName} - ${e.message}")
    }

    return true
  }

  /**
   * Apresenta uma notificação convencional estritamente silenciosa (sem som e sem vibração)
   * para alertas recebidos com atraso (> 5 minutos).
   */
  private fun showConventionalDelayedNotification(
    alertId: String,
    title: String?,
    message: String?,
    isDelayed: Boolean = true
  ) {
    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      ?: return

    val targetChannelId = if (isDelayed) CHANNEL_DELAYED_ID else CHANNEL_ATTENTION_ID

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      if (isDelayed) {
        val existingChannel = notificationManager.getNotificationChannel(CHANNEL_DELAYED_ID)
        if (existingChannel == null) {
          val channel = NotificationChannel(
            CHANNEL_DELAYED_ID,
            CHANNEL_DELAYED_NAME,
            NotificationManager.IMPORTANCE_DEFAULT
          ).apply {
            description = CHANNEL_DELAYED_DESC
            setSound(null, null)
            enableVibration(false)
            vibrationPattern = longArrayOf(0)
            setShowBadge(true)
          }
          notificationManager.createNotificationChannel(channel)
        }
      } else {
        val existingChannel = notificationManager.getNotificationChannel(CHANNEL_ATTENTION_ID)
        if (existingChannel == null) {
          val channel = NotificationChannel(
            CHANNEL_ATTENTION_ID,
            CHANNEL_ATTENTION_NAME,
            NotificationManager.IMPORTANCE_HIGH
          ).apply {
            description = CHANNEL_ATTENTION_DESC
            setSound(null, null)
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 250, 150, 250)
            setShowBadge(true)
          }
          notificationManager.createNotificationChannel(channel)
        }
      }
    }

    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      action = Intent.ACTION_VIEW
      data = android.net.Uri.parse("poolsafe://alerts/$alertId?source=delayed_notification")
      putExtra("alertId", alertId)
      putExtra("source", "delayed_notification")
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val contentPendingIntent = if (launchIntent != null) {
      PendingIntent.getActivity(
        this,
        alertId.hashCode(),
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    } else null

    val iconRes = getNotificationSmallIcon()
    val displayTitle = if (!title.isNullOrBlank()) title else "Alerta PoolSafe"
    val displayBody = if (!message.isNullOrBlank()) {
      if (isDelayed) "$message (Recebido com atraso)" else message
    } else {
      "Possível situação de risco detectada anteriormente na piscina."
    }

    val notification = NotificationCompat.Builder(this, targetChannelId)
      .setContentTitle(displayTitle)
      .setContentText(displayBody)
      .setSmallIcon(iconRes)
      .setColor(0xFF00E5FF.toInt())
      .setAutoCancel(true)
      .setPriority(if (isDelayed) NotificationCompat.PRIORITY_DEFAULT else NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_EVENT)
      .apply {
        if (isDelayed) {
          setSilent(true)
        } else {
          setVibrate(longArrayOf(0, 250, 150, 250))
        }
        contentPendingIntent?.let { setContentIntent(it) }
      }
      .build()

    notificationManager.notify(alertId.hashCode(), notification)
  }

  private fun getNotificationSmallIcon(): Int {
    val resId = resources.getIdentifier("notification_icon", "drawable", packageName)
    if (resId != 0) {
      return resId
    }
    return android.R.drawable.ic_dialog_alert
  }

  private fun parseIsoTimestamp(isoString: String?): Long? {
    if (isoString.isNullOrBlank()) return null
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        java.time.Instant.parse(isoString).toEpochMilli()
      } else {
        val clean = if (isoString.length >= 19) isoString.substring(0, 19) else isoString
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
          timeZone = TimeZone.getTimeZone("UTC")
        }
        sdf.parse(clean)?.time
      }
    } catch (_: Exception) {
      null
    }
  }
}
