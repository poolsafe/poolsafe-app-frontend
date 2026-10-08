package expo.modules.criticalalarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
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
 * Foreground Service temporário para teste de Alarme Crítico Nativo do PoolSafe (Fatia 8A.1).
 *
 * Características:
 * - Tipo mediaPlayback (START_NOT_STICKY);
 * - Reprodução em loop no fluxo USAGE_ALARM (sonificação);
 * - Foco de áudio solicitado APÓS promoção a foreground;
 * - Vibração nativa repetida classificada como USAGE_ALARM;
 * - Canal próprio do serviço, isolado, silencioso e sem vibração;
 * - Notificação persistente com ação "Interromper alerta";
 * - Encerramento automático em 30 segundos ou por interrupção manual;
 * - Idempotente e com liberação completa de recursos.
 */
class CriticalAlarmForegroundService : Service() {

  companion object {
    const val ACTION_START = "expo.modules.criticalalarm.ACTION_START"
    const val ACTION_STOP = "expo.modules.criticalalarm.ACTION_STOP"

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

    var onStateChangeListener: ((isActive: Boolean, reason: String?) -> Unit)? = null
  }

  private var mediaPlayer: MediaPlayer? = null
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
      if (isRunning) {
        // Idempotente: se já estiver em execução, não duplica
        return START_NOT_STICKY
      }
      startCriticalAlarm()
    }

    return START_NOT_STICKY
  }

  private fun startCriticalAlarm() {
    isRunning = true
    notifyStateChanged(true, null)

    // 1. Cria canal específico do Foreground Service (silencioso e sem vibração)
    createServiceNotificationChannel()

    // 2. Constrói notificação persistente com ação "Interromper alerta"
    val notification = buildPersistentNotification()

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
    val audioAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    // 5. Solicita foco de áudio após a promoção do serviço
    val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    if (audioManager == null) {
      cleanupAndStop("audio_manager_unavailable")
      return
    }

    val focusGranted = requestAlarmAudioFocus(audioManager, audioAttributes)
    if (!focusGranted) {
      cleanupAndStop("audio_focus_denied")
      return
    }

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

  private fun buildPersistentNotification(): android.app.Notification {
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

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("[TESTE] Alerta Crítico PoolSafe")
      .setContentText("Alarme contínuo em execução no fluxo de alarmes. Toque para interromper.")
      .setSmallIcon(iconRes)
      .setColor(0xFF0284C7.toInt())
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
            if (focusChange == AudioManager.AUDIOFOCUS_LOSS) {
              cleanupAndStop("audio_focus_lost")
            }
          }
          .build()
        this.audioFocusRequest = request
        audioManager.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
      } else {
        val listener = AudioManager.OnAudioFocusChangeListener { focusChange ->
          if (focusChange == AudioManager.AUDIOFOCUS_LOSS) {
            cleanupAndStop("audio_focus_lost")
          }
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

  private fun startMediaPlayer(audioAttributes: AudioAttributes): Boolean {
    return try {
      // Tenta obter o recurso local de áudio provisório
      var soundResId = resources.getIdentifier("poolsafe_alert_provisional", "raw", packageName)
      if (soundResId == 0) {
        soundResId = resources.getIdentifier("poolsafe_alert_provisional", "raw", "expo.modules.criticalalarm")
      }
      if (soundResId == 0) {
        soundResId = R.raw.poolsafe_alert_provisional
      }

      val player = MediaPlayer()
      player.setAudioAttributes(audioAttributes)

      val afd = resources.openRawResourceFd(soundResId)
      player.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
      afd.close()

      player.isLooping = true
      player.setOnErrorListener { _, what, extra ->
        cleanupAndStop("player_error_${what}_${extra}")
        true
      }

      player.prepare()
      player.start()
      this.mediaPlayer = player
      true
    } catch (_: Exception) {
      false
    }
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
    val handler = Handler(Looper.getMainLooper())
    this.timeoutHandler = handler
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

    // 2. Para e libera o MediaPlayer
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

    // 5. Remove notificação persistente e finaliza Foreground
    try {
      ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    } catch (_: Exception) {}

    try {
      val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      notificationManager?.cancel(NOTIFICATION_ID)
    } catch (_: Exception) {}

    // 6. Notifica ouvinte TypeScript sobre a alteração de estado
    notifyStateChanged(false, reason)

    // 7. Encerra o serviço
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
