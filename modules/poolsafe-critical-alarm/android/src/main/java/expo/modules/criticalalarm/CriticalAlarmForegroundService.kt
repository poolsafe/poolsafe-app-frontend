package expo.modules.criticalalarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/**
 * Foreground Service para Alarme Crítico Nativo do PoolSafe (Fatias 8A.1 e 9B.4).
 *
 * Características:
 * - Tipo mediaPlayback (START_NOT_STICKY);
 * - Reprodução em loop no fluxo USAGE_ALARM (sonificação);
 * - Foco de áudio solicitado APÓS promoção a foreground;
 * - Vibração nativa repetida classificada como USAGE_ALARM;
 * - Canal próprio do serviço, isolado, silencioso e sem vibração;
 * - Notificação persistente dinâmica com ação "Interromper alerta";
 * - Encerramento automático em 30 segundos ou por interrupção manual;
 * - Integração com AlarmStateManager para deduplicação e controle de estado;
 * - Suporte a segundo alerta distinto sem duplicar serviço, player ou vibração;
 * - Idempotente e com liberação completa de recursos.
 */
class CriticalAlarmForegroundService : Service() {

  companion object {
    const val ACTION_START = "expo.modules.criticalalarm.ACTION_START"
    const val ACTION_STOP = "expo.modules.criticalalarm.ACTION_STOP"

    const val EXTRA_ALERT_ID = "expo.modules.criticalalarm.EXTRA_ALERT_ID"
    const val EXTRA_DELIVERY_ID = "expo.modules.criticalalarm.EXTRA_DELIVERY_ID"
    const val EXTRA_TITLE = "expo.modules.criticalalarm.EXTRA_TITLE"
    const val EXTRA_MESSAGE = "expo.modules.criticalalarm.EXTRA_MESSAGE"

    const val CHANNEL_ID = "poolsafe_critical_alarm_service_v2"
    const val CHANNEL_NAME = "Controle de Alarme Crítico"
    const val CHANNEL_DESC = "Canal de notificação do Foreground Service de alarme crítico do PoolSafe"

    const val NOTIFICATION_ID = 2001
    const val REQUEST_CODE_STOP = 2002
    const val REQUEST_CODE_CONTENT = 2003

    const val AUTO_TIMEOUT_MS = 30_000L

    val VIBRATION_TIMINGS = longArrayOf(0, 500, 250, 500, 250, 500)

    @Volatile
    var isRunning: Boolean = false
      private set

    @Volatile
    var currentAlertId: String? = null
      private set

    @Volatile
    var currentDeliveryId: String? = null
      private set

    @Volatile
    var currentTitle: String? = null
      private set

    @Volatile
    var currentMessage: String? = null
      private set

    var onStateChangeListener: ((isActive: Boolean, reason: String?) -> Unit)? = null
  }

  private var mediaPlayer: MediaPlayer? = null
  private var secondaryMediaPlayer: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var audioFocusRequest: AudioFocusRequest? = null
  private var legacyFocusListener: AudioManager.OnAudioFocusChangeListener? = null
  private var timeoutHandler: Handler? = null
  private var timeoutRunnable: Runnable? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val action = intent?.action

    if (action == ACTION_STOP) {
      cleanupAndStop("manual_or_notification_stop")
      return START_NOT_STICKY
    }

    if (action == ACTION_START) {
      val alertId = intent.getStringExtra(EXTRA_ALERT_ID) ?: ""
      val deliveryId = intent.getStringExtra(EXTRA_DELIVERY_ID) ?: ""
      val title = intent.getStringExtra(EXTRA_TITLE)
      val message = intent.getStringExtra(EXTRA_MESSAGE)

      if (isRunning) {
        if (alertId.isNotBlank() && alertId != currentAlertId) {
          // Segundo alerta distinto recebido durante execução ativa:
          // Se o alerta já tiver sido processado/finalizado anteriormente, não reativa nem renova
          val stateManager = AlarmStateManager.getInstance(this)
          if (!stateManager.isAlertDismissed(alertId)) {
            updateCurrentAlert(alertId, deliveryId, title, message)
          }
        }
        // Se for o mesmo alerta ou alerta já processado, não duplica nem renova o prazo
        return START_NOT_STICKY
      }

      startCriticalAlarm(alertId, deliveryId, title, message)
    }

    return START_NOT_STICKY
  }

  private fun startCriticalAlarm(
    alertId: String,
    deliveryId: String,
    title: String?,
    message: String?
  ) {
    isRunning = true
    currentAlertId = alertId.ifBlank { null }
    currentDeliveryId = deliveryId.ifBlank { null }
    currentTitle = title
    currentMessage = message

    if (alertId.isNotBlank() && deliveryId.isNotBlank()) {
      AlarmStateManager.getInstance(this).markAlertActive(alertId, deliveryId)
    }

    notifyStateChanged(true, null)

    // 1. Cria canal específico do Foreground Service (silencioso e sem vibração)
    createServiceNotificationChannel()

    // 2. Constrói notificação persistente com ação "Interromper alerta"
    val notification = buildPersistentNotification(title, message)

    // 3. Promove imediatamente o serviço a Foreground antes do áudio
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        ServiceCompat.startForeground(
          this,
          NOTIFICATION_ID,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
        )
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } catch (_: Exception) {
      cleanupAndStop("start_foreground_failed")
      return
    }

    // 4. Configura AudioAttributes com USAGE_ALARM e CONTENT_TYPE_SONIFICATION
    // O fluxo nativo USAGE_ALARM (STREAM_ALARM) é imune ao modo silencioso/vibração por especificação do SO
    val audioAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    // 5. Configura e verifica o gerenciador de áudio
    val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    if (audioManager == null) {
      cleanupAndStop("audio_manager_unavailable")
      return
    }

    // 5.1 Solicita foco de áudio transitório com fluxo de alarme
    requestAlarmAudioFocus(audioManager, audioAttributes)

    // 6. Inicializa MediaPlayer com som local provisório e fluxo de alarme
    val playerStarted = startMediaPlayer(audioAttributes)
    if (!playerStarted) {
      cleanupAndStop("media_player_failed")
      return
    }

    // 7. Inicia vibração nativa em loop com USAGE_ALARM
    startAlarmVibration()

    // 8. Agenda encerramento automático em 30 segundos
    scheduleAutoTimeout()
  }

  private fun updateCurrentAlert(
    newAlertId: String,
    newDeliveryId: String,
    newTitle: String?,
    newMessage: String?
  ) {
    val previousAlertId = currentAlertId
    if (!previousAlertId.isNullOrBlank()) {
      // Alerta anterior foi substituído por novo alerta distinto:
      // Registra como processado/descartado para que repetições futuras não o reativem
      AlarmStateManager.getInstance(this).markAlertDismissed(previousAlertId, "superseded_by_${newAlertId}")
    }

    currentAlertId = newAlertId
    currentDeliveryId = newDeliveryId
    currentTitle = newTitle
    currentMessage = newMessage

    AlarmStateManager.getInstance(this).markAlertActive(newAlertId, newDeliveryId)

    // Atualiza a notificação persistente existente com os dados do novo alerta
    val updatedNotification = buildPersistentNotification(newTitle, newMessage)
    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    notificationManager?.notify(NOTIFICATION_ID, updatedNotification)

    // Reinicia o prazo de timeout para conceder 30 segundos completos ao novo alerta distinto
    scheduleAutoTimeout()

    notifyStateChanged(true, "new_alert_${newAlertId}")
  }

  private fun getNotificationSmallIcon(): Int {
    val resId = resources.getIdentifier("notification_icon", "drawable", packageName)
    if (resId != 0) {
      return resId
    }
    return android.R.drawable.ic_dialog_alert
  }

  private fun createServiceNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        ?: return

      val existingChannel = notificationManager.getNotificationChannel(CHANNEL_ID)
      if (existingChannel == null) {
        val channel = NotificationChannel(
          CHANNEL_ID,
          CHANNEL_NAME,
          NotificationManager.IMPORTANCE_HIGH
        ).apply {
          description = CHANNEL_DESC
          setSound(null, null)
          enableVibration(false)
          vibrationPattern = longArrayOf(0)
          setShowBadge(true)
        }
        notificationManager.createNotificationChannel(channel)
      }
    }
  }

  private fun buildPersistentNotification(title: String?, message: String?): android.app.Notification {
    val stopIntent = Intent(this, CriticalAlarmForegroundService::class.java).apply {
      action = ACTION_STOP
    }
    val stopPendingIntent = PendingIntent.getService(
      this,
      REQUEST_CODE_STOP,
      stopIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentPendingIntent = if (launchIntent != null) {
      PendingIntent.getActivity(
        this,
        REQUEST_CODE_CONTENT,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    } else null

    val iconRes = getNotificationSmallIcon()
    val displayTitle = if (!title.isNullOrBlank()) "Alarme Ativo: $title" else "Alarme Crítico PoolSafe"
    val displayBody = if (!message.isNullOrBlank()) {
      "$message. Toque em Interromper para silenciar."
    } else {
      "Alarme contínuo em execução. Toque para silenciar o áudio e a vibração."
    }

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(displayTitle)
      .setContentText(displayBody)
      .setSmallIcon(iconRes)
      .setColor(0xFF00E5FF.toInt())
      .setOngoing(true)
      .setSilent(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .addAction(
        android.R.drawable.ic_menu_close_clear_cancel,
        "Interromper alerta",
        stopPendingIntent
      )

    if (contentPendingIntent != null) {
      builder.setContentIntent(contentPendingIntent)
    }

    return builder.build()
  }

  private fun requestAlarmAudioFocus(
    audioManager: AudioManager,
    audioAttributes: AudioAttributes
  ): Boolean {
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
          .setAudioAttributes(audioAttributes)
          .setOnAudioFocusChangeListener { focusChange ->
            // Alarme crítico contínuo: alterações transitórias externas não silenciam o alarme de segurança
          }
          .build()
        this.audioFocusRequest = request
        audioManager.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
      } else {
        val listener = AudioManager.OnAudioFocusChangeListener { focusChange ->
          // Não aborta
        }
        this.legacyFocusListener = listener
        @Suppress("DEPRECATION")
        val result = audioManager.requestAudioFocus(
          listener,
          AudioManager.STREAM_ALARM,
          AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
        )
        result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
      }
    } catch (_: Exception) {
      false
    }
  }

  private fun resolveSoundResourceId(): Int {
    var soundResId = resources.getIdentifier("poolsafe_alert_provisional", "raw", packageName)
    if (soundResId == 0) {
      soundResId = resources.getIdentifier("poolsafe_alert_provisional", "raw", "expo.modules.criticalalarm")
    }
    if (soundResId == 0) {
      soundResId = R.raw.poolsafe_alert_provisional
    }
    return soundResId
  }

  private fun startSinglePlayer(
    soundResId: Int,
    audioAttributes: AudioAttributes,
    preferredDevice: AudioDeviceInfo?,
    isPrimary: Boolean
  ): MediaPlayer? {
    var afd: android.content.res.AssetFileDescriptor? = null
    return try {
      val player = MediaPlayer()
      player.setAudioAttributes(audioAttributes)
      player.setVolume(1.0f, 1.0f)

      if (preferredDevice != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        player.preferredDevice = preferredDevice
      }

      afd = resources.openRawResourceFd(soundResId)
      player.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)

      player.isLooping = true
      player.setOnErrorListener { _, what, extra ->
        if (isPrimary) {
          cleanupAndStop("player_error_${what}_${extra}")
        }
        true
      }

      player.prepare()
      try {
        afd.close()
        afd = null
      } catch (_: Exception) {}

      player.start()
      player
    } catch (_: Exception) {
      try {
        afd?.close()
      } catch (_: Exception) {}
      null
    }
  }

  private fun startMediaPlayer(audioAttributes: AudioAttributes): Boolean {
    val soundResId = resolveSoundResourceId()
    if (soundResId == 0) return false

    val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    val outputDevices = audioManager?.getDevices(AudioManager.GET_DEVICES_OUTPUTS) ?: emptyArray()

    // 1. Identifica o alto-falante físico embutido do celular
    val speakerDevice = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      outputDevices.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER_SAFE }
        ?: outputDevices.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
    } else {
      outputDevices.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
    }

    // 2. Identifica periféricos externos conectados (Bluetooth A2DP/SCO/BLE ou fone com fio)
    val externalDevice = outputDevices.firstOrNull {
      it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
      it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
      it.type == AudioDeviceInfo.TYPE_BLE_HEADSET ||
      it.type == AudioDeviceInfo.TYPE_BLE_SPEAKER ||
      it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
      it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
      it.type == AudioDeviceInfo.TYPE_USB_HEADSET
    }

    // 3. Inicia o reprodutor principal FORÇADO para o alto-falante físico do celular.
    // Isso garante que o alarme NUNCA seja silenciado pelo SO quando fones Bluetooth
    // estiverem conectados em Modo Silencioso ou fora do ouvido do usuário.
    val primary = startSinglePlayer(soundResId, audioAttributes, speakerDevice, isPrimary = true)
    if (primary == null) {
      return false
    }
    this.mediaPlayer = primary

    // 4. Se houver periférico externo conectado, tenta simultaneamente tocar no fone
    if (externalDevice != null) {
      this.secondaryMediaPlayer = startSinglePlayer(soundResId, audioAttributes, externalDevice, isPrimary = false)
    }

    return true
  }

  private fun startAlarmVibration() {
    try {
      val vib = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        vibratorManager?.defaultVibrator ?: (getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator)
      } else {
        getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
      }
      this.vibrator = vib

      if (vib != null && vib.hasVibrator()) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          val effect = VibrationEffect.createWaveform(VIBRATION_TIMINGS, 0)
          val vibrationAttributes = VibrationAttributes.Builder()
            .setUsage(VibrationAttributes.USAGE_ALARM)
            .build()
          vib.vibrate(effect, vibrationAttributes)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          val effect = VibrationEffect.createWaveform(VIBRATION_TIMINGS, 0)
          vib.vibrate(effect)
        } else {
          @Suppress("DEPRECATION")
          vib.vibrate(VIBRATION_TIMINGS, 0)
        }
      }
    } catch (_: Exception) {
      // Falha na vibração não interrompe a prova de som
    }
  }

  private fun scheduleAutoTimeout() {
    val handler = timeoutHandler ?: Handler(Looper.getMainLooper()).also { this.timeoutHandler = it }
    timeoutRunnable?.let { r -> handler.removeCallbacks(r) }

    val runnable = Runnable {
      cleanupAndStop("auto_timeout_30s")
    }
    this.timeoutRunnable = runnable
    handler.postDelayed(runnable, AUTO_TIMEOUT_MS)
  }

  private fun cleanupAndStop(reason: String) {
    if (!isRunning && mediaPlayer == null && vibrator == null) {
      return
    }
    isRunning = false

    // 1. Cancela temporizador de timeout
    timeoutHandler?.let { h ->
      timeoutRunnable?.let { r -> h.removeCallbacks(r) }
      h.removeCallbacksAndMessages(null)
    }
    timeoutHandler = null
    timeoutRunnable = null

    // 2. Para e libera os MediaPlayers (principal e secundário)
    mediaPlayer?.let { player ->
      try {
        if (player.isPlaying) {
          player.stop()
        }
      } catch (_: Exception) {}
      try {
        player.release()
      } catch (_: Exception) {}
    }
    mediaPlayer = null

    secondaryMediaPlayer?.let { player ->
      try {
        if (player.isPlaying) {
          player.stop()
        }
      } catch (_: Exception) {}
      try {
        player.release()
      } catch (_: Exception) {}
    }
    secondaryMediaPlayer = null

    // 3. Cancela a vibração nativa imediatamente
    vibrator?.let { vib ->
      try {
        vib.cancel()
      } catch (_: Exception) {}
    }
    vibrator = null

    // 4. Abandona o foco de áudio
    val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    if (audioManager != null) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        audioFocusRequest?.let { req ->
          try {
            audioManager.abandonAudioFocusRequest(req)
          } catch (_: Exception) {}
        }
        audioFocusRequest = null
      } else {
        legacyFocusListener?.let { listener ->
          try {
            @Suppress("DEPRECATION")
            audioManager.abandonAudioFocus(listener)
          } catch (_: Exception) {}
        }
        legacyFocusListener = null
      }
    }

    // 5. Atualiza o gerenciador de estado nativo
    val dismissedAlertId = currentAlertId
    if (!dismissedAlertId.isNullOrBlank()) {
      AlarmStateManager.getInstance(this).markAlertDismissed(dismissedAlertId, reason)
    } else {
      AlarmStateManager.getInstance(this).clearActiveAlert()
    }

    currentAlertId = null
    currentDeliveryId = null
    currentTitle = null
    currentMessage = null

    // 6. Remove notificação persistente e finaliza Foreground
    try {
      ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    } catch (_: Exception) {}

    try {
      val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      notificationManager?.cancel(NOTIFICATION_ID)
    } catch (_: Exception) {}

    // 7. Notifica ouvinte TypeScript sobre a alteração de estado
    notifyStateChanged(false, reason)

    // 8. Encerra o serviço
    stopSelf()
  }

  private fun notifyStateChanged(active: Boolean, reason: String?) {
    try {
      onStateChangeListener?.invoke(active, reason)
    } catch (_: Exception) {}
  }

  override fun onDestroy() {
    cleanupAndStop("service_destroyed")
    super.onDestroy()
  }
}
