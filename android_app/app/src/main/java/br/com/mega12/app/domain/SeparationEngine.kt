package br.com.mega12.app.domain

import br.com.mega12.app.data.model.StoreConfig
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

data class ClusterTotals(
    val A: Int = 0,
    val B: Int = 0,
    val C: Int = 0
)

data class SeparationResult(
    val allocations: Map<String, Int>, // Em unidades
    val allocationsBoxes: Map<String, Int>, // Em caixas
    val totalAllocated: Int,
    val totalAllocatedBoxes: Int,
    val reserveStock: Int,
    val reserveStockBoxes: Int,
    val targetTotal: Int,
    val targetTotalBoxes: Int,
    val isBalanced: Boolean,
    val isOverAllocated: Boolean,
    val difference: Int,
    val differenceBoxes: Int,
    val clusterTotals: ClusterTotals,
    val clusterTotalsBoxes: ClusterTotals
)

object SeparationEngine {

    const val DEFAULT_RESERVE_STOCK_PERCENT = 0.10 // 10% de estoque central

    val DEFAULT_STORES = listOf(
        // Cluster A (8 Lojas - 6.41% cada) -> 51.28%
        StoreConfig("pg_centro", "Ponta Grossa Centro", "A", 6.41, true),
        StoreConfig("reserva", "Reserva", "A", 6.41, true),
        StoreConfig("tibagi", "Tibagi", "A", 6.41, true),
        StoreConfig("nova_russia", "Nova Rússia", "A", 6.41, true),
        StoreConfig("javert", "Javert", "A", 6.41, true),
        StoreConfig("ivai", "Ivaí", "A", 6.41, true),
        StoreConfig("irati_centro", "Irati Centro", "A", 6.41, true),
        StoreConfig("campo_largo", "Campo Largo", "A", 6.41, true),

        // Cluster B (8 Lojas - 4.49% cada) -> 35.92%
        StoreConfig("castro", "Castro", "B", 4.49, true),
        StoreConfig("imbituva", "Imbituva", "B", 4.49, true),
        StoreConfig("santa_paula", "Santa Paula", "B", 4.49, true),
        StoreConfig("prudentopolis", "Prudentópolis", "B", 4.49, true),
        StoreConfig("guarapuava", "Guarapuava", "B", 4.49, true),
        StoreConfig("imbau", "Imbaú", "B", 4.49, true),
        StoreConfig("rio_azul", "Rio Azul", "B", 4.49, true),
        StoreConfig("reboucas", "Rebouças", "B", 4.49, true),

        // Cluster C (4 Lojas - 3.20% cada) -> 12.80%
        StoreConfig("deposito_central", "Depósito Central", "C", 3.20, true),
        StoreConfig("teixeira_soares", "Teixeira Soares", "C", 3.20, true),
        StoreConfig("mallet", "Mallet", "C", 3.20, true),
        StoreConfig("ipiranga", "Ipiranga", "C", 3.20, true)
    )

    /**
     * Rateio por Caixas / Volumes Fechados (Padrão Operacional de Galpão)
     */
    fun calculateBoxesSeparation(
        totalBoxes: Int,
        packSize: Int = 1,
        stores: List<StoreConfig> = DEFAULT_STORES,
        reserveBoxes: Int? = null
    ): SeparationResult {
        val safePackSize = max(1, packSize)
        val defaultReserve = (totalBoxes * DEFAULT_RESERVE_STOCK_PERCENT).roundToInt()
        val actualReserve = reserveBoxes ?: defaultReserve
        val safeReserveBoxes = max(0, min(totalBoxes, actualReserve))
        val boxesToDistribute = max(0, totalBoxes - safeReserveBoxes)

        val activeStores = stores.filter { it.active }
        val totalWeight = activeStores.sumOf { it.defaultWeight }

        val allocationsBoxes = mutableMapOf<String, Int>()
        val allocationsUnits = mutableMapOf<String, Int>()
        stores.forEach {
            allocationsBoxes[it.id] = 0
            allocationsUnits[it.id] = 0
        }

        if (boxesToDistribute <= 0 || totalWeight <= 0.0 || activeStores.isEmpty()) {
            return SeparationResult(
                allocations = allocationsUnits,
                allocationsBoxes = allocationsBoxes,
                totalAllocated = 0,
                totalAllocatedBoxes = 0,
                reserveStock = totalBoxes * safePackSize,
                reserveStockBoxes = totalBoxes,
                targetTotal = totalBoxes * safePackSize,
                targetTotalBoxes = totalBoxes,
                isBalanced = true,
                isOverAllocated = false,
                difference = totalBoxes * safePackSize,
                differenceBoxes = totalBoxes,
                clusterTotals = ClusterTotals(),
                clusterTotalsBoxes = ClusterTotals()
            )
        }

        data class RemainderItem(
            val storeId: String,
            val cluster: String,
            val weight: Double,
            val remainder: Double,
            val originalIndex: Int
        )

        val remainders = mutableListOf<RemainderItem>()
        var sumIntegers = 0

        activeStores.forEachIndexed { index, store ->
            val exactQuota = (store.defaultWeight / totalWeight) * boxesToDistribute
            val integerPart = floor(exactQuota).toInt()
            val remainder = exactQuota - integerPart

            allocationsBoxes[store.id] = integerPart
            sumIntegers += integerPart

            remainders.add(
                RemainderItem(
                    storeId = store.id,
                    cluster = store.cluster,
                    weight = store.defaultWeight,
                    remainder = remainder,
                    originalIndex = index
                )
            )
        }

        var leftover = boxesToDistribute - sumIntegers
        val clusterOrder = mapOf("A" to 3, "B" to 2, "C" to 1)

        remainders.sortWith { a, b ->
            if (abs(b.remainder - a.remainder) > 0.000001) {
                b.remainder.compareTo(a.remainder)
            } else {
                val cDiff = (clusterOrder[b.cluster] ?: 0) - (clusterOrder[a.cluster] ?: 0)
                if (cDiff != 0) cDiff else b.weight.compareTo(a.weight)
            }
        }

        var rIdx = 0
        while (leftover > 0 && remainders.isNotEmpty()) {
            val item = remainders[rIdx % remainders.size]
            allocationsBoxes[item.storeId] = (allocationsBoxes[item.storeId] ?: 0) + 1
            leftover--
            rIdx++
        }

        var cA = 0
        var cB = 0
        var cC = 0
        var cABoxes = 0
        var cBBoxes = 0
        var cCBoxes = 0

        stores.forEach { store ->
            val cx = allocationsBoxes[store.id] ?: 0
            val un = cx * safePackSize
            allocationsUnits[store.id] = un

            when (store.cluster) {
                "A" -> { cABoxes += cx; cA += un }
                "B" -> { cBBoxes += cx; cB += un }
                "C" -> { cCBoxes += cx; cC += un }
            }
        }

        val totalAllocatedBoxes = allocationsBoxes.values.sum()
        val totalAllocated = totalAllocatedBoxes * safePackSize
        val reserveStockBoxes = max(0, totalBoxes - totalAllocatedBoxes)
        val reserveStock = reserveStockBoxes * safePackSize

        return SeparationResult(
            allocations = allocationsUnits,
            allocationsBoxes = allocationsBoxes,
            totalAllocated = totalAllocated,
            totalAllocatedBoxes = totalAllocatedBoxes,
            reserveStock = reserveStock,
            reserveStockBoxes = reserveStockBoxes,
            targetTotal = totalBoxes * safePackSize,
            targetTotalBoxes = totalBoxes,
            isBalanced = totalAllocatedBoxes <= totalBoxes,
            isOverAllocated = totalAllocatedBoxes > totalBoxes,
            difference = (totalBoxes * safePackSize) - totalAllocated,
            differenceBoxes = totalBoxes - totalAllocatedBoxes,
            clusterTotals = ClusterTotals(cA, cB, cC),
            clusterTotalsBoxes = ClusterTotals(cABoxes, cBBoxes, cCBoxes)
        )
    }
}
