const { queryAll, queryOne, execute } = require('../config/database');

class PaymentConditionRepository {
  async findAll({ onlyActive = false } = {}, tenantSlug) {
    const sql = onlyActive
      ? "SELECT * FROM payment_conditions WHERE ativo = 1 ORDER BY padrao DESC, descricao ASC"
      : "SELECT * FROM payment_conditions ORDER BY padrao DESC, ativo DESC, descricao ASC";
    const rows = await queryAll(sql, tenantSlug);
    return rows.map(r => this._hydrate(r));
  }

  async findById(id, tenantSlug) {
    const row = await queryOne("SELECT * FROM payment_conditions WHERE id = ?", [id], tenantSlug);
    return row ? this._hydrate(row) : null;
  }

  async upsert(condition, tenantSlug) {
    const now = new Date().toISOString();
    const condId = condition.id || ('cond_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const existing = await this.findById(condId, tenantSlug);

    const descricao = (condition.descricao || '').trim();
    if (!descricao) {
      throw new Error('Descrição da condição de pagamento é obrigatória.');
    }

    const qtdParcelas = Math.max(1, parseInt(condition.qtdParcelas, 10) || 1);
    
    // Normalizar parcelasDias para array de números inteiros
    let parcelasDias = [];
    if (Array.isArray(condition.parcelasDias)) {
      parcelasDias = condition.parcelasDias.map(d => Math.max(0, parseInt(d, 10) || 0));
    } else if (typeof condition.parcelasDiasJson === 'string') {
      try {
        const parsed = JSON.parse(condition.parcelasDiasJson);
        if (Array.isArray(parsed)) {
          parcelasDias = parsed.map(d => Math.max(0, parseInt(d, 10) || 0));
        }
      } catch (e) {
        parcelasDias = [];
      }
    }

    // Se faltarem dias para o número de parcelas, preencher com múltiplos padrão (ex: 30, 60, 90)
    while (parcelasDias.length < qtdParcelas) {
      const step = 30;
      const last = parcelasDias.length > 0 ? parcelasDias[parcelasDias.length - 1] : 0;
      parcelasDias.push(last + step);
    }
    if (parcelasDias.length > qtdParcelas) {
      parcelasDias = parcelasDias.slice(0, qtdParcelas);
    }

    const parcelasDiasJson = JSON.stringify(parcelasDias);
    const especie = condition.especie || 'Boleto';
    const banco = condition.banco || '';
    const ativo = condition.ativo !== undefined ? (condition.ativo ? 1 : 0) : 1;
    const padrao = condition.padrao ? 1 : 0;
    const observacao = condition.observacao || '';

    // Se estiver marcando como padrão, desmarcar os outros
    if (padrao === 1) {
      await execute("UPDATE payment_conditions SET padrao = 0 WHERE id != ?", [condId], tenantSlug);
    }

    if (existing) {
      await execute(`
        UPDATE payment_conditions SET
          descricao = ?,
          qtdParcelas = ?,
          parcelasDiasJson = ?,
          especie = ?,
          banco = ?,
          ativo = ?,
          padrao = ?,
          observacao = ?,
          updatedAt = ?
        WHERE id = ?
      `, [
        descricao,
        qtdParcelas,
        parcelasDiasJson,
        especie,
        banco,
        ativo,
        padrao,
        observacao,
        now,
        condId
      ], tenantSlug);
    } else {
      await execute(`
        INSERT INTO payment_conditions (
          id, descricao, qtdParcelas, parcelasDiasJson, especie, banco, ativo, padrao, observacao, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        condId,
        descricao,
        qtdParcelas,
        parcelasDiasJson,
        especie,
        banco,
        ativo,
        padrao,
        observacao,
        condition.createdAt || now,
        now
      ], tenantSlug);
    }

    return await this.findById(condId, tenantSlug);
  }

  async delete(id, tenantSlug) {
    await execute("DELETE FROM payment_conditions WHERE id = ?", [id], tenantSlug);
    return true;
  }

  _hydrate(row) {
    if (!row) return null;
    let parcelasDias = [];
    try {
      if (row.parcelasDiasJson) {
        parcelasDias = JSON.parse(row.parcelasDiasJson);
      }
    } catch (e) {
      parcelasDias = [];
    }

    return {
      id: row.id,
      descricao: row.descricao,
      qtdParcelas: Number(row.qtdParcelas) || 1,
      parcelasDias: Array.isArray(parcelasDias) ? parcelasDias : [],
      parcelasDiasJson: row.parcelasDiasJson || '[]',
      especie: row.especie || 'Boleto',
      banco: row.banco || '',
      ativo: Boolean(row.ativo),
      padrao: Boolean(row.padrao),
      observacao: row.observacao || '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}

module.exports = new PaymentConditionRepository();
