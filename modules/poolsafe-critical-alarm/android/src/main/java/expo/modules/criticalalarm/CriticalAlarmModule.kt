package expo.modules.criticalalarm

import android.content.Context
import android.content.Intent
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Módulo Expo Nativo em Kotlin para controle de Alarme Crítico do PoolSafe (Fatias 8A.1 e 9B.4).
 *
 * Fornece à camada TypeScript operações para:
 * - iniciar o Foreground Service com áudio e vibração de alarme (com ou sem payload);
 * - interromper o alarme;
 * - consultar se o alarme está ativo;
 * - consultar alertId e deliveryId ativos;
 * - ouvir eventos de alteração de estado (onAlarmStateChanged);
 * - consultar estado de otimização de bateria;
 * - abrir configurações de otimização de bateria;
 * - limpar estado de teste.
 */
class CriticalAlarmModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("CriticalAlarm")

    Events("onAlarmStateChanged")

    OnCreate {
      appContext.reactContext?.let { ctx ->
        try {
          AlarmStateManager.getInstance(ctx).reconcileActiveState()
        } catch (_: Exception) {}
      }

      CriticalAlarmForegroundService.onStateChangeListener = { isActive, reason ->
        try {
          sendEvent(
            "onAlarmStateChanged",
            mapOf(
              "isActive" to isActive,
              "reason" to (reason ?: "")
            )
          )
        } catch (_: Exception) {}
      }
    }

    OnDestroy {
      CriticalAlarmForegroundService.onStateChangeListener = null
    }

    AsyncFunction("startAlarm") { options: Map<String, String>? ->
      val context = appContext.reactContext ?: return@AsyncFunction false

      val alertId = options?.get("alertId")
      val deliveryId = options?.get("deliveryId")
      val title = options?.get("title")
      val message = options?.get("message")

      val intent = Intent(context, CriticalAlarmForegroundService::class.java).apply {
        action = CriticalAlarmForegroundService.ACTION_START
        alertId?.let { putExtra(CriticalAlarmForegroundService.EXTRA_ALERT_ID, it) }
        deliveryId?.let { putExtra(CriticalAlarmForegroundService.EXTRA_DELIVERY_ID, it) }
        title?.let { putExtra(CriticalAlarmForegroundService.EXTRA_TITLE, it) }
        message?.let { putExtra(CriticalAlarmForegroundService.EXTRA_MESSAGE, it) }
      }

      ContextCompat.startForegroundService(context, intent)
      return@AsyncFunction true
    }

    AsyncFunction("stopAlarm") {
      val context = appContext.reactContext ?: return@AsyncFunction false

      if (!CriticalAlarmForegroundService.isRunning) {
        return@AsyncFunction true
      }

      val intent = Intent(context, CriticalAlarmForegroundService::class.java).apply {
        action = CriticalAlarmForegroundService.ACTION_STOP
      }

      context.startService(intent)
      return@AsyncFunction true
    }

    Function("isAlarmActive") {
      return@Function CriticalAlarmForegroundService.isRunning
    }

    Function("getActiveAlertId") {
      val context = appContext.reactContext ?: return@Function null
      return@Function AlarmStateManager.getInstance(context).getActiveAlertId()
    }

    Function("getActiveDeliveryId") {
      val context = appContext.reactContext ?: return@Function null
      return@Function AlarmStateManager.getInstance(context).getActiveDeliveryId()
    }

    AsyncFunction("clearAlarmStateForTesting") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      AlarmStateManager.getInstance(context).clearAllForTesting()
      return@AsyncFunction true
    }

    // Escopo opcional de bateria: consulta pura a PowerManager.isIgnoringBatteryOptimizations
    Function("isIgnoringBatteryOptimizations") {
      val context = appContext.reactContext ?: return@Function false
      val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
      return@Function powerManager?.isIgnoringBatteryOptimizations(context.packageName) ?: false
    }

    // Escopo opcional de bateria: atalho genérico para ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS
    AsyncFunction("openBatteryOptimizationSettings") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      return@AsyncFunction true
    }
  }
}
