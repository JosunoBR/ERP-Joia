package br.com.mega12.app.domain

import br.com.mega12.app.data.model.FiscalConfig
import kotlin.math.max
import kotlin.math.roundToLong

data class FiscalCalculationResult(
    val percentualDespesasPdv: Double,
    val percentualCreditoEntrada: Double,
    val despesasPdvUnit: Double,
    val creditoIcmsUnit: Double,
    val custoRealEfetivo: Double,
    val margemRealUnit: Double,
    val margemPercentual: Double,
    val isLucrativo: Boolean,
    val statusMargem: MarginStatus
)

enum class MarginStatus {
    EXCELENTE,
    BOA,
    APERTADA,
    PREJUIZO
}

object FiscalEngine {

    val DEFAULT_CONFIG = FiscalConfig(
        icmsAliquota = 0.11,
        ipiAliquota = 0.00,
        pisCofinsAliquota = 0.03,
        custosFixos = 0.26,
        creditoEntradaICMS = 0.195
    )

    /**
     * Calcula o custo real efetivo e a margem de um item baseado no preço de compra e no PDV pretendido.
     */
    fun calculateItemFiscal(
        precoCompra: Double,
        pdvAlvo: Double,
        config: FiscalConfig = DEFAULT_CONFIG,
        customIcms: Double? = null,
        customIpi: Double? = null,
        customPisCofins: Double? = null,
        customCustosFixos: Double? = null,
        customCreditoEntrada: Double? = null
    ): FiscalCalculationResult {
        val icms = customIcms ?: config.icmsAliquota
        val ipi = customIpi ?: config.ipiAliquota
        val pisCofins = customPisCofins ?: config.pisCofinsAliquota
        val custosFixos = customCustosFixos ?: config.custosFixos
        val creditoEntrada = customCreditoEntrada ?: config.creditoEntradaICMS

        val percentualDespesasPdv = icms + ipi + pisCofins + custosFixos
        val percentualCreditoEntrada = creditoEntrada

        val despesasPdvUnit = round4(pdvAlvo * percentualDespesasPdv)
        val creditoIcmsUnit = round4(precoCompra * percentualCreditoEntrada)
        val custoRealEfetivo = round4(precoCompra + despesasPdvUnit - creditoIcmsUnit)
        val margemRealUnit = round4(pdvAlvo - custoRealEfetivo)
        val margemPercentual = if (pdvAlvo > 0) round2((margemRealUnit / pdvAlvo) * 100) else 0.0

        val statusMargem = when {
            margemPercentual >= 25.0 -> MarginStatus.EXCELENTE
            margemPercentual >= 15.0 -> MarginStatus.BOA
            margemPercentual > 0.0 -> MarginStatus.APERTADA
            else -> MarginStatus.PREJUIZO
        }

        return FiscalCalculationResult(
            percentualDespesasPdv = percentualDespesasPdv,
            percentualCreditoEntrada = percentualCreditoEntrada,
            despesasPdvUnit = despesasPdvUnit,
            creditoIcmsUnit = creditoIcmsUnit,
            custoRealEfetivo = custoRealEfetivo,
            margemRealUnit = margemRealUnit,
            margemPercentual = margemPercentual,
            isLucrativo = margemRealUnit > 0,
            statusMargem = statusMargem
        )
    }

    /**
     * Calcula o Preço Máximo de Compra para atingir uma margem percentual alvo desejada no PDV.
     */
    fun calculateMaxPurchasePrice(
        pdvAlvo: Double,
        margemAlvoPercentual: Double = 20.0,
        config: FiscalConfig = DEFAULT_CONFIG
    ): Double {
        val icms = config.icmsAliquota
        val ipi = config.ipiAliquota
        val pisCofins = config.pisCofinsAliquota
        val custosFixos = config.custosFixos
        val creditoEntrada = config.creditoEntradaICMS

        val totalDespesas = icms + ipi + pisCofins + custosFixos
        val margemDecimal = margemAlvoPercentual / 100.0

        val divisor = 1.0 - creditoEntrada
        if (divisor <= 0) return 0.0

        val maxCompra = (pdvAlvo * (1.0 - margemDecimal - totalDespesas)) / divisor
        return max(0.0, round2(maxCompra))
    }

    private fun round4(value: Double): Double {
        return (value * 10000.0).roundToLong() / 10000.0
    }

    private fun round2(value: Double): Double {
        return (value * 100.0).roundToLong() / 100.0
    }
}
