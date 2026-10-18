package expo.modules.criticalalarm

import android.content.Context
import android.content.SharedPreferences

/**
 * Gerenciador nativo de estado e deduplicação de alarmes críticos do PoolSafe.
 *
 * Responsável por:
 * 1. Persistir entregas (deliveryId) processadas para evitar reprocessamento;
 * 2. Manter política explícita de retenção (TTL de 24 horas e teto de 50 entregas);
 * 3. Impedir que repetições ou retries reiniciem ou estendam o alarme;
 * 4. Reconciliar o estado salvo com a execução real do processo (sem presumir
 *    que um alerta marcado como ativo continua tocando se o serviço parou);
 * 5. Bloquear reativação sonora de um alerta (alertId) já silenciado ou finalizado;
 * 6. Suportar a transição ordenada para um segundo alerta distinto.
 */
class AlarmStateManager(private val context: Context) {

  companion object {
    const val PREFS_NAME = "poolsafe_critical_alarm_state"

    private const val KEY_ACTIVE_ALERT_ID = "active_alert_id"
    private const val KEY_ACTIVE_DELIVERY_ID = "active_delivery_id"
    private const val KEY_ACTIVE_START_TIME = "active_start_time"

    private const val KEY_RECENT_PROCESSED_ALERTS = "recent_processed_alerts"
    private const val KEY_RECENT_DELIVERIES = "recent_deliveries"

    // TTL de retenção de entregas: 24 horas
    const val DELIVERY_RETENTION_TTL_MS = 24 * 60 * 60 * 1000L

    // Limite máximo de entregas e alertas persistidos
    const val MAX_RETAINED_DELIVERIES = 50
    const val MAX_RETAINED_ALERTS = 50

    // TTL de retenção de alerta finalizado/descartado/substituído: 2 horas
    const val DISMISSED_ALERT_RETENTION_TTL_MS = 2 * 60 * 60 * 1000L

    // Tolerância para reconciliação de alarme zumbi (30s do timeout + 5s de margem)
    const val ZOMBIE_TIMEOUT_THRESHOLD_MS = 35_000L

    @Volatile
    private var instance: AlarmStateManager? = null

    fun getInstance(context: Context): AlarmStateManager {
      return instance ?: synchronized(this) {
        instance ?: AlarmStateManager(context.applicationContext).also { instance = it }
      }
    }
  }

  private val prefs: SharedPreferences by lazy {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  /**
   * Reconcilia o estado persistido com a realidade do processo.
   * Não presume que o alarme continua tocando se o serviço não estiver em execução
   * ou se o tempo decorrido ultrapassar o limite automático de 30 segundos.
   *
   * Caso o processo tenha sido encerrado abruptamente sem executar onDestroy()
   * (ex.: Low Memory Killer do SO), o alerta zumbi é registrado na coleção de
   * alertas processados/descartados para impedir que uma nova entrega o ressuscite.
   */
  @Synchronized
  fun reconcileActiveState() {
    val activeAlertId = prefs.getString(KEY_ACTIVE_ALERT_ID, null) ?: return
    val startTime = prefs.getLong(KEY_ACTIVE_START_TIME, 0L)
    val now = System.currentTimeMillis()

    val serviceActuallyRunning = CriticalAlarmForegroundService.isRunning
    val isExpiredByTime = (now - startTime) > ZOMBIE_TIMEOUT_THRESHOLD_MS

    if (!serviceActuallyRunning || isExpiredByTime) {
      // Processo foi morto ou timeout estourou sem encerramento limpo:
      // Registra o alerta órfão como processado para evitar repetição indevida
      recordAlertProcessed(activeAlertId)

      prefs.edit()
        .remove(KEY_ACTIVE_ALERT_ID)
        .remove(KEY_ACTIVE_DELIVERY_ID)
        .remove(KEY_ACTIVE_START_TIME)
        .apply()
    }
  }

  /**
   * Consulta o alertId ativo no momento, após reconciliação.
   */
  @Synchronized
  fun getActiveAlertId(): String? {
    reconcileActiveState()
    return prefs.getString(KEY_ACTIVE_ALERT_ID, null)
  }

  /**
   * Consulta o deliveryId ativo no momento, após reconciliação.
   */
  @Synchronized
  fun getActiveDeliveryId(): String? {
    reconcileActiveState()
    return prefs.getString(KEY_ACTIVE_DELIVERY_ID, null)
  }

  /**
   * Verifica se a entrega especificada já foi processada anteriormente.
   * Aplica a política de retenção expirando registros antigos (24h).
   */
  @Synchronized
  fun isDeliveryProcessed(deliveryId: String): Boolean {
    if (deliveryId.isBlank()) return false
    val now = System.currentTimeMillis()
    val deliveries = loadAndPruneDeliveries(now)
    return deliveries.any { it.first == deliveryId }
  }

  /**
   * Registra uma entrega como processada com o timestamp atual.
   */
  @Synchronized
  fun recordDeliveryProcessed(deliveryId: String) {
    if (deliveryId.isBlank()) return
    val now = System.currentTimeMillis()
    val deliveries = loadAndPruneDeliveries(now).toMutableList()

    // Remove ocorrência anterior do mesmo deliveryId se houver
    deliveries.removeAll { it.first == deliveryId }

    // Adiciona na frente (mais recente)
    deliveries.add(0, Pair(deliveryId, now))

    // Trunca para o teto configurado
    val truncated = if (deliveries.size > MAX_RETAINED_DELIVERIES) {
      deliveries.subList(0, MAX_RETAINED_DELIVERIES)
    } else {
      deliveries
    }

    saveDeliveries(truncated)
  }

  /**
   * Verifica se o alerta já foi finalizado (por interrupção manual, término de 30s
   * ou substituição por outro alerta distinto) dentro da janela de retenção de 2 horas.
   */
  @Synchronized
  fun isAlertDismissed(alertId: String): Boolean {
    if (alertId.isBlank()) return false
    val now = System.currentTimeMillis()
    val processedAlerts = loadAndPruneProcessedAlerts(now)
    return processedAlerts.any { it.first == alertId }
  }

  /**
   * Registra um alerta como processado/descartado/substituído na coleção persistida.
   * Mantém histórico dos últimos até 50 alertas com retenção de 2 horas.
   */
  @Synchronized
  fun recordAlertProcessed(alertId: String) {
    if (alertId.isBlank()) return
    val now = System.currentTimeMillis()
    val alerts = loadAndPruneProcessedAlerts(now).toMutableList()

    // Remove ocorrência anterior do mesmo alertId se houver
    alerts.removeAll { it.first == alertId }

    // Adiciona na frente (mais recente)
    alerts.add(0, Pair(alertId, now))

    // Trunca para o teto configurado
    val truncated = if (alerts.size > MAX_RETAINED_ALERTS) {
      alerts.subList(0, MAX_RETAINED_ALERTS)
    } else {
      alerts
    }

    saveProcessedAlerts(truncated)
  }

  /**
   * Marca um alerta como em reprodução ativa no sistema.
   */
  @Synchronized
  fun markAlertActive(alertId: String, deliveryId: String) {
    recordDeliveryProcessed(deliveryId)
    val now = System.currentTimeMillis()

    prefs.edit()
      .putString(KEY_ACTIVE_ALERT_ID, alertId)
      .putString(KEY_ACTIVE_DELIVERY_ID, deliveryId)
      .putLong(KEY_ACTIVE_START_TIME, now)
      .apply()
  }

  /**
   * Marca um alerta como finalizado/interrompido/substituído, limpa o estado ativo
   * e registra o alertId na coleção de alertas processados com retenção de 2 horas.
   */
  @Synchronized
  fun markAlertDismissed(alertId: String, reason: String) {
    recordAlertProcessed(alertId)

    val currentActiveId = prefs.getString(KEY_ACTIVE_ALERT_ID, null)
    if (currentActiveId == null || currentActiveId == alertId) {
      prefs.edit()
        .remove(KEY_ACTIVE_ALERT_ID)
        .remove(KEY_ACTIVE_DELIVERY_ID)
        .remove(KEY_ACTIVE_START_TIME)
        .apply()
    }
  }

  /**
   * Limpa o estado ativo sem registrar descarte definitivo.
   */
  @Synchronized
  fun clearActiveAlert() {
    prefs.edit()
      .remove(KEY_ACTIVE_ALERT_ID)
      .remove(KEY_ACTIVE_DELIVERY_ID)
      .remove(KEY_ACTIVE_START_TIME)
      .apply()
  }

  /**
   * Limpa todos os registros persistidos (usado em testes automatizados).
   */
  @Synchronized
  fun clearAllForTesting() {
    prefs.edit().clear().apply()
  }

  // --- Funções internas de serialização da lista de entregas ---

  private fun loadAndPruneDeliveries(now: Long): List<Pair<String, Long>> {
    val raw = prefs.getString(KEY_RECENT_DELIVERIES, "") ?: ""
    if (raw.isBlank()) return emptyList()

    val parsed = raw.split(";").mapNotNull { entry ->
      val parts = entry.split(":")
      if (parts.size == 2) {
        val id = parts[0]
        val time = parts[1].toLongOrNull()
        if (id.isNotBlank() && time != null) Pair(id, time) else null
      } else null
    }

    // Filtra pelo TTL de 24h
    val valid = parsed.filter { (now - it.second) <= DELIVERY_RETENTION_TTL_MS }

    // Se houve poda por expiração, atualiza o storage
    if (valid.size != parsed.size) {
      saveDeliveries(valid)
    }

    return valid
  }

  private fun saveDeliveries(deliveries: List<Pair<String, Long>>) {
    val serialized = deliveries.joinToString(";") { "${it.first}:${it.second}" }
    prefs.edit().putString(KEY_RECENT_DELIVERIES, serialized).apply()
  }

  // --- Funções internas de serialização da lista de alertas processados ---

  private fun loadAndPruneProcessedAlerts(now: Long): List<Pair<String, Long>> {
    val raw = prefs.getString(KEY_RECENT_PROCESSED_ALERTS, "") ?: ""
    if (raw.isBlank()) return emptyList()

    val parsed = raw.split(";").mapNotNull { entry ->
      val parts = entry.split(":")
      if (parts.size == 2) {
        val id = parts[0]
        val time = parts[1].toLongOrNull()
        if (id.isNotBlank() && time != null) Pair(id, time) else null
      } else null
    }

    // Filtra pelo TTL de 2h
    val valid = parsed.filter { (now - it.second) <= DISMISSED_ALERT_RETENTION_TTL_MS }

    // Se houve poda por expiração, atualiza o storage
    if (valid.size != parsed.size) {
      saveProcessedAlerts(valid)
    }

    return valid
  }

  private fun saveProcessedAlerts(alerts: List<Pair<String, Long>>) {
    val serialized = alerts.joinToString(";") { "${it.first}:${it.second}" }
    prefs.edit().putString(KEY_RECENT_PROCESSED_ALERTS, serialized).apply()
  }
}
