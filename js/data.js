// StockFlow Data Layer — MySQL/PHP API Version
StockFlow.Data = {
  API_BASE: '/stockflow/api',
  categories: [],
  produits: [],
  mouvements: [],

  async init() {
    try {
      const [categories, produits, mouvements, stats] = await Promise.all([
        this._fetch('/categories.php'),
        this._fetch('/produits.php'),
        this._fetch('/mouvements.php'),
        this._fetch('/stats.php')
      ]);
      this.categories = categories;
      this.produits = produits;
      this.mouvements = mouvements;
      this._stats = stats;
    } catch (e) {
      console.error('StockFlow Data init failed:', e);
      throw e;
    }
  },

  async _fetch(endpoint, options = {}) {
    const url = this.API_BASE + endpoint;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'API error');
    }
    return res.json();
  },

  async reload() {
    await this.init();
  },

  // ─── Read methods (sync, from cached data) ───

  getStockActuel(produitId) {
    const p = this.produits.find(p => p.id == produitId);
    return p ? parseInt(p.stock_actuel) || 0 : 0;
  },

  getProduitsWithStock() {
    return this.produits.map(p => ({
      ...p,
      id: parseInt(p.id),
      categorie_id: parseInt(p.categorie_id),
      prix_unitaire: parseFloat(p.prix_unitaire),
      seuil_alerte: parseInt(p.seuil_alerte),
      stock_actuel: parseInt(p.stock_actuel) || 0,
      categorie_nom: p.categorie_nom || this.getCategorieNom(parseInt(p.categorie_id))
    }));
  },

  getCategorieNom(id) {
    const c = this.categories.find(cat => cat.id == id);
    return c ? c.nom : 'Sans catégorie';
  },

  getProduitById(id) {
    return this.produits.find(p => p.id == id);
  },

  getStockStatus(stock, seuil) {
    if (stock <= 0) return 'critical';
    if (stock <= seuil) return 'low';
    return 'ok';
  },

  getAlerteProduits() {
    return this.getProduitsWithStock().filter(p => p.stock_actuel <= p.seuil_alerte);
  },

  getStats() {
    // Return cached stats from server
    if (this._stats) {
      return {
        totalProduits: this._stats.totalProduits,
        alertes: this._stats.alertes,
        entrees30: this._stats.entrees30,
        sorties30: this._stats.sorties30,
        ok: this._stats.ok,
        low: this._stats.low,
        critical: this._stats.critical,
        totalMouvements: this._stats.totalMouvements
      };
    }
    // Fallback to local calc
    const produits = this.getProduitsWithStock();
    return {
      totalProduits: produits.length,
      alertes: produits.filter(p => p.stock_actuel <= p.seuil_alerte).length,
      entrees30: 0, sorties30: 0,
      ok: produits.filter(p => this.getStockStatus(p.stock_actuel, p.seuil_alerte) === 'ok').length,
      low: produits.filter(p => this.getStockStatus(p.stock_actuel, p.seuil_alerte) === 'low').length,
      critical: produits.filter(p => this.getStockStatus(p.stock_actuel, p.seuil_alerte) === 'critical').length,
      totalMouvements: this.mouvements.length
    };
  },

  getStockParCategorie() {
    if (this._stats && this._stats.stockParCategorie) {
      return this._stats.stockParCategorie;
    }
    return this.categories.map(cat => ({
      label: cat.nom,
      stock: this.produits.filter(p => p.categorie_id == cat.id)
        .reduce((acc, p) => acc + (parseInt(p.stock_actuel) || 0), 0)
    }));
  },

  getMouvementsParJour() {
    if (this._stats && this._stats.mouvementsParJour) {
      return this._stats.mouvementsParJour;
    }
    return [];
  },

  // ─── Write methods (async, call API) ───

  async addProduit(data) {
    const result = await this._fetch('/produits.php', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await this.reload();
    return result;
  },

  async updateProduit(id, data) {
    await this._fetch('/produits.php', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data })
    });
    await this.reload();
  },

  async deleteProduit(id) {
    await this._fetch('/produits.php?id=' + id, {
      method: 'DELETE'
    });
    await this.reload();
  },

  async addMouvement(data) {
    const result = await this._fetch('/mouvements.php', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await this.reload();
    return result;
  },

  async deleteMouvement(id) {
    await this._fetch('/mouvements.php?id=' + id, {
      method: 'DELETE'
    });
    await this.reload();
  }
};
