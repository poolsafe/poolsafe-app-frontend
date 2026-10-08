package expo.modules.criticalalarm

import android.content.Context
import android.content.Intent
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Módulo Expo Nativo em Kotlin para controle da prova de Alarme Crítico (Fatia 8A.1).
 *
 * Fornece à camada TypeScript operações para:
 * - iniciar o Foreground Service com áudio e vibração de alarme;
 * - interromper o alarme;
 * - consultar se o alarme está ativo;
 * - ouvir eventos de alteração de estado (onAlarmStateChanged);
 * - consultar estado de otimização de bateria (opcional);
 * - abrir configurações genéricas de otimização de bateria (opcional).
 */
class CriticalAlarmModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("CriticalAlarm")

    Events("onAlarmStateChanged")

    OnCreate {
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

    AsyncFunction("startAlarm") {
      val context = appContext.reactContext ?: return@AsyncFunction false

      if (CriticalAlarmForegroundService.isRunning) {
        return@AsyncFunction true
      }

      val intent = Intent(context, CriticalAlarmForegroundService::class.java).apply {
        action = CriticalAlarmForegroundService.ACTION_START
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
