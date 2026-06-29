// StockFlow UI Layer
StockFlow.UI = {
  currentPage: 'dashboard',
  sortKey: 'nom',
  sortDir: 1,
  catFilter: '',
  stockFilter: '',
  searchQuery: '',

  init() {
    this._bindNav();
    this._bindFilters();
    this._bindModals();
    this._bindForms();
    this.renderAll();
  },

  renderAll() {
    const stats = StockFlow.Data.getStats();
    this._renderKPIs(stats);
    this._renderSidebar(stats);
    this._renderAlertTable();
    this._renderProductTable();
    this._renderMvtTable();
    this._updateAlertStrip();
    StockFlow.Charts.refresh();
  },

  _renderKPIs(stats) {
    $('#kpiTotal').text(stats.totalProduits);
    $('#kpiAlerts').text(stats.alertes);
    $('#kpiEntrees').text(stats.entrees30);
    $('#kpiSorties').text(stats.sorties30);
    $('#statOk').text(stats.ok);
    $('#statLow').text(stats.low);
    $('#statCritical').text(stats.critical);
    $('#statMouvements').text(stats.totalMouvements);

    const alertCard = $('.kpi-card.warn');
    if (stats.alertes === 0) {
      alertCard.css('border-color', 'var(--border)');
    } else if (stats.alertes >= 3) {
      alertCard.find('.kpi-value').addClass('danger');
    }
  },

  _renderSidebar(stats) {
    const cats = StockFlow.Data.categories;
    const produits = StockFlow.Data.getProduitsWithStock();
    $('#catCount').text(cats.length);

    let html = '<div class="cat-item ' + (this.catFilter === '' ? 'active' : '') + '" data-cat="">';
    html += '<span class="cat-item-name">Tous les produits</span>';
    html += '<span class="cat-count">' + produits.length + '</span></div>';

    cats.forEach(c => {
      const count = produits.filter(p => p.categorie_id === c.id).length;
      html += '<div class="cat-item ' + (this.catFilter == c.id ? 'active' : '') + '" data-cat="' + c.id + '">';
      html += '<span class="cat-item-name">' + c.nom + '</span>';
      html += '<span class="cat-count">' + count + '</span></div>';
    });
    $('#categoryList').html(html);

    // populate filter selects
    let catOptions = '<option value="">Toutes les catégories</option>';
    cats.forEach(c => catOptions += '<option value="' + c.id + '">' + c.nom + '</option>');
    $('#catFilter').html(catOptions).val(this.catFilter);

    // populate product selects in modals
    let prodOptions = '<option value="">Sélectionner un produit...</option>';
    produits.forEach(p => prodOptions += '<option value="' + p.id + '">' + p.reference + ' - ' + p.nom + '</option>');
    $('#mvtProduit').html(prodOptions);
    $('#mvtProduitFilter').html('<option value="">Tous les produits</option>' + produits.map(p => '<option value="' + p.id + '">' + p.nom + '</option>').join(''));

    // populate product modal category select
    let catSelectHtml = '<option value="">Sélectionner...</option>';
    cats.forEach(c => catSelectHtml += '<option value="' + c.id + '">' + c.nom + '</option>');
    $('#pCat').html(catSelectHtml);
  },

  _getFilteredProducts() {
    let products = StockFlow.Data.getProduitsWithStock();
    if (this.catFilter) products = products.filter(p => p.categorie_id == this.catFilter);
    if (this.stockFilter) {
      products = products.filter(p => StockFlow.Data.getStockStatus(p.stock_actuel, p.seuil_alerte) === this.stockFilter);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      products = products.filter(p => p.nom.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q));
    }
    products.sort((a, b) => {
      let av = a[this.sortKey], bv = b[this.sortKey];
      if (typeof av === 'string') av = av.toLowerCase(), bv = bv.toLowerCase();
      return av < bv ? -this.sortDir : av > bv ? this.sortDir : 0;
    });
    return products;
  },

  _renderProductTable() {
    const products = this._getFilteredProducts();
    $('#productCount').text(products.length + ' produit' + (products.length > 1 ? 's' : ''));
    $('#tableCount').text(products.length);

    if (products.length === 0) {
      $('#productTableBody').html('<tr><td colspan="7"><div class="empty-state"><i class="fas fa-box-open"></i><p>Aucun produit trouvé</p></div></td></tr>');
      return;
    }

    let html = '';
    products.forEach(p => {
      const status = StockFlow.Data.getStockStatus(p.stock_actuel, p.seuil_alerte);
      const isAlert = p.stock_actuel <= p.seuil_alerte;
      html += '<tr class="' + (isAlert ? 'alert-row' : '') + '" data-id="' + p.id + '">';
      html += '<td><div class="product-cell"><span class="product-name">' + p.nom + '</span><span class="product-ref">' + p.reference + '</span></div></td>';
      html += '<td><span class="cat-tag">' + p.categorie_nom + '</span></td>';
      html += '<td><span class="price-cell">' + parseFloat(p.prix_unitaire).toFixed(2) + ' MAD</span></td>';
      html += '<td><span class="stock-badge ' + status + '">' + p.stock_actuel + '</span></td>';
      html += '<td><span style="color:var(--text-muted);font-size:11px;">' + p.seuil_alerte + '</span></td>';
      html += '<td>' + this._statusBadge(status) + '</td>';
      html += '<td><div class="action-btns">';
      html += '<button class="action-btn" onclick="StockFlow.UI.openDetail(' + p.id + ')" title="Détail"><i class="fas fa-eye"></i></button>';
      html += '<button class="action-btn" onclick="StockFlow.UI.openEditProduct(' + p.id + ')" title="Modifier"><i class="fas fa-pen"></i></button>';
      html += '<button class="action-btn" onclick="StockFlow.UI.openAddMvt(' + p.id + ')" title="Mouvement"><i class="fas fa-right-left"></i></button>';
      html += '<button class="action-btn danger" onclick="StockFlow.UI.confirmDelete(' + p.id + ')" title="Supprimer"><i class="fas fa-trash"></i></button>';
      html += '</div></td>';
      html += '</tr>';
    });
    $('#productTableBody').html(html);
  },

  _renderAlertTable() {
    const alerts = StockFlow.Data.getAlerteProduits();
    $('#alertCount').text(alerts.length);

    if (alerts.length === 0) {
      $('#alertTableBody').html('<tr><td colspan="6"><div class="empty-state" style="padding:20px"><i class="fas fa-check-circle" style="color:var(--success)"></i><p>Aucune alerte de stock</p></div></td></tr>');
      return;
    }

    let html = '';
    alerts.sort((a, b) => a.stock_actuel - b.stock_actuel).forEach(p => {
      const status = StockFlow.Data.getStockStatus(p.stock_actuel, p.seuil_alerte);
      html += '<tr class="alert-row">';
      html += '<td><div class="product-cell"><span class="product-name">' + p.nom + '</span><span class="product-ref">' + p.reference + '</span></div></td>';
      html += '<td><span class="cat-tag">' + p.categorie_nom + '</span></td>';
      html += '<td><span class="stock-badge ' + status + '">' + p.stock_actuel + '</span></td>';
      html += '<td><span style="color:var(--text-muted);font-size:11px;">' + p.seuil_alerte + '</span></td>';
      html += '<td>' + this._statusBadge(status) + '</td>';
      html += '<td><button class="action-btn" onclick="StockFlow.UI.openAddMvt(' + p.id + ')" title="Réapprovisionner"><i class="fas fa-plus"></i></button></td>';
      html += '</tr>';
    });
    $('#alertTableBody').html(html);
  },

  _renderMvtTable() {
    let mvts = StockFlow.Data.mouvements;
    const pFilter = $('#mvtProduitFilter').val();
    const tFilter = $('#mvtTypeFilter').val();
    if (pFilter) mvts = mvts.filter(m => m.produit_id == pFilter);
    if (tFilter) mvts = mvts.filter(m => m.type_mouvement === tFilter);

    $('#mvtCount').text(mvts.length);

    if (mvts.length === 0) {
      $('#mvtTableBody').html('<tr><td colspan="7"><div class="empty-state"><i class="fas fa-right-left"></i><p>Aucun mouvement trouvé</p></div></td></tr>');
      return;
    }

    let html = '';
    mvts.slice(0, 100).forEach(m => {
      const p = StockFlow.Data.getProduitById(m.produit_id);
      const pName = p ? p.nom : 'Produit supprimé';
      const pRef = p ? p.reference : '-';
      const date = new Date(m.date_mouvement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const typeClass = m.type_mouvement === 'entree' ? 'entree' : 'sortie';
      const typeLabel = m.type_mouvement === 'entree' ? '<i class="fas fa-arrow-down"></i> ENTRÉE' : '<i class="fas fa-arrow-up"></i> SORTIE';
      html += '<tr>';
      html += '<td style="color:var(--text-muted);font-size:11px;">' + date + '</td>';
      html += '<td><div class="product-cell"><span class="product-name" style="font-size:11px;">' + pName + '</span><span class="product-ref">' + pRef + '</span></div></td>';
      html += '<td><span class="type-badge ' + typeClass + '">' + typeLabel + '</span></td>';
      html += '<td><span class="qty-cell ' + typeClass + '">' + (m.type_mouvement === 'entree' ? '+' : '-') + m.quantite + '</span></td>';
      html += '<td style="color:var(--text-secondary);font-size:11px;">' + (m.commentaire || '-') + '</td>';
      html += '<td style="color:var(--text-muted);font-size:11px;">' + (m.utilisateur || '-') + '</td>';
      html += '<td><button class="action-btn danger" onclick="StockFlow.UI.deleteMvt(' + m.id + ')" title="Supprimer"><i class="fas fa-trash"></i></button></td>';
      html += '</tr>';
    });
    $('#mvtTableBody').html(html);
  },

  _statusBadge(status) {
    if (status === 'ok') return '<span class="alert-indicator ok"><i class="fas fa-check"></i> OK</span>';
    if (status === 'low') return '<span class="alert-indicator low"><i class="fas fa-triangle-exclamation"></i> FAIBLE</span>';
    return '<span class="alert-indicator critical"><i class="fas fa-circle-xmark"></i> CRITIQUE</span>';
  },

  _updateAlertStrip() {
    const alerts = StockFlow.Data.getAlerteProduits();
    if (alerts.length === 0) { $('#alertStrip').addClass('hidden'); return; }
    $('#alertStrip').removeClass('hidden');
    const text = alerts.map(p => '⚠ ' + p.nom + ' (' + p.reference + ') — stock: ' + p.stock_actuel + ' / seuil: ' + p.seuil_alerte).join('   ·   ');
    $('#alertTickerText').text(text);
  },

  _bindNav() {
    $(document).on('click', '.nav-tab', function() {
      const page = $(this).data('page');
      $('.nav-tab').removeClass('active');
      $(this).addClass('active');
      $('.page').removeClass('active');
      $('#page-' + page).addClass('active');
      StockFlow.UI.currentPage = page;
    });

    $(document).on('click', '.cat-item', function() {
      StockFlow.UI.catFilter = $(this).data('cat') + '';
      StockFlow.UI.renderAll();
      if (StockFlow.UI.currentPage === 'dashboard') {
        $('.nav-tab[data-page="produits"]').click();
      }
    });

    $('#quickAddProduct, #addProductBtn').on('click', () => this.openAddProduct());
    $('#quickAddMvt, #addMvtBtn').on('click', () => this.openAddMvt());
    $('#refreshBtn').on('click', async () => { await StockFlow.Data.reload(); this.renderAll(); });

    $('#exportBtn').on('click', () => this._exportCSV());

    $(document).on('click', '.sortable', function() {
      const key = $(this).data('sort');
      if (StockFlow.UI.sortKey === key) StockFlow.UI.sortDir *= -1;
      else { StockFlow.UI.sortKey = key; StockFlow.UI.sortDir = 1; }
      StockFlow.UI._renderProductTable();
    });

    $('#mvtProduitFilter, #mvtTypeFilter').on('change', () => this._renderMvtTable());
  },

  _bindFilters() {
    $('#searchInput').on('input', function() { StockFlow.UI.searchQuery = $(this).val(); StockFlow.UI._renderProductTable(); });
    $('#catFilter').on('change', function() { StockFlow.UI.catFilter = $(this).val(); StockFlow.UI.renderAll(); });
    $('#stockFilter').on('change', function() { StockFlow.UI.stockFilter = $(this).val(); StockFlow.UI._renderProductTable(); });
  },

  _bindModals() {
    $(document).on('click', '.modal-close', function() {
      const modalId = $(this).data('modal');
      $('#' + modalId).removeClass('open');
    });
    $('#cancelProductModal').on('click', () => $('#productModal').removeClass('open'));
    $('#cancelMvtModal').on('click', () => $('#mvtModal').removeClass('open'));
    $(document).on('click', '.modal', function(e) { if (e.target === this) $(this).removeClass('open'); });

    // MVT type selector
    $(document).on('click', '.mvt-type-btn', function() {
      $('.mvt-type-btn').removeClass('active');
      $(this).addClass('active');
      $('#mvtType').val($(this).data('type'));
    });
  },

  _bindForms() {
    $('#saveProductBtn').on('click', () => this._saveProduct());
    $('#saveMvtBtn').on('click', () => this._saveMouvement());
  },

  openAddProduct() {
    $('#productModalTitle').text('Nouveau produit');
    $('#pRef, #pNom, #pDesc, #pPrix, #pSeuil').val('');
    $('#pCat').val('');
    $('#pEditId').val('');
    $('#productModal').addClass('open');
  },

  openEditProduct(id) {
    const p = StockFlow.Data.getProduitById(id);
    if (!p) return;
    $('#productModalTitle').text('Modifier produit');
    $('#pRef').val(p.reference);
    $('#pNom').val(p.nom);
    $('#pDesc').val(p.description);
    $('#pPrix').val(p.prix_unitaire);
    $('#pSeuil').val(p.seuil_alerte);
    $('#pCat').val(p.categorie_id);
    $('#pEditId').val(p.id);
    $('#productModal').addClass('open');
  },

  openAddMvt(prefillProductId) {
    $('#mvtProduit').val(prefillProductId || '');
    $('#mvtQty').val('');
    $('#mvtUser').val('');
    $('#mvtComment').val('');
    $('#mvtType').val('entree');
    $('.mvt-type-btn').removeClass('active');
    $('.mvt-type-btn.entree').addClass('active');
    $('#mvtModal').addClass('open');
  },

  openDetail(id) {
    const p = StockFlow.Data.getProduitById(id);
    if (!p) return;
    const stock = StockFlow.Data.getStockActuel(id);
    const status = StockFlow.Data.getStockStatus(stock, p.seuil_alerte);
    const pct = Math.min(100, (stock / (p.seuil_alerte * 2)) * 100);
    const mvts = StockFlow.Data.mouvements.filter(m => m.produit_id == id).slice(0, 5);

    let mvtHtml = '';
    mvts.forEach(m => {
      const t = m.type_mouvement === 'entree' ? 'entree' : 'sortie';
      mvtHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);">';
      mvtHtml += '<span class="type-badge ' + t + '" style="font-size:9px;">' + (m.type_mouvement === 'entree' ? '↓ ENT' : '↑ SOR') + '</span>';
      mvtHtml += '<span style="font-family:var(--font-display);font-weight:700;color:' + (t === 'entree' ? 'var(--success)' : 'var(--danger)') + ';">' + (t === 'entree' ? '+' : '-') + m.quantite + '</span>';
      mvtHtml += '<span style="font-size:10px;color:var(--text-muted);">' + new Date(m.date_mouvement).toLocaleDateString('fr-FR') + '</span>';
      mvtHtml += '</div>';
    });
    if (!mvtHtml) mvtHtml = '<p style="color:var(--text-dim);font-size:11px;text-align:center;padding:10px;">Aucun mouvement</p>';

    $('#detailModalBody').html(`
      <div class="detail-header">
        <div class="detail-name">${p.nom}</div>
        <div class="detail-ref">${p.reference}</div>
      </div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">Catégorie</div><div class="detail-item-value" style="font-size:13px;">${StockFlow.Data.getCategorieNom(p.categorie_id)}</div></div>
        <div class="detail-item"><div class="detail-item-label">Prix unitaire</div><div class="detail-item-value" style="color:var(--accent-primary)">${parseFloat(p.prix_unitaire).toFixed(2)} MAD</div></div>
        <div class="detail-item"><div class="detail-item-label">Stock actuel</div><div class="detail-item-value ${status === 'ok' ? '' : status === 'low' ? 'warn' : 'danger'}" style="font-size:24px;">${stock}</div></div>
        <div class="detail-item"><div class="detail-item-label">Seuil d'alerte</div><div class="detail-item-value" style="font-size:16px;color:var(--warn)">${p.seuil_alerte}</div></div>
      </div>
      <div class="stock-gauge">
        <div class="gauge-label"><span>Stock</span><span>${stock} / seuil ${p.seuil_alerte}</span></div>
        <div class="gauge-bar"><div class="gauge-fill ${status}" style="width:${pct}%"></div></div>
      </div>
      ${p.description ? '<p style="font-size:11px;color:var(--text-secondary);margin:12px 0;">' + p.description + '</p>' : ''}
      <div style="margin-top:16px;">
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">Derniers mouvements</div>
        ${mvtHtml}
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn-primary" style="flex:1;justify-content:center;" onclick="StockFlow.UI.openAddMvt(${id});$('#detailModal').removeClass('open')"><i class="fas fa-right-left"></i> Mouvement</button>
        <button class="btn-secondary" onclick="StockFlow.UI.openEditProduct(${id});$('#detailModal').removeClass('open')"><i class="fas fa-pen"></i> Modifier</button>
      </div>
    `);
    $('#detailModal').addClass('open');
  },

  async confirmDelete(id) {
    const p = StockFlow.Data.getProduitById(id);
    if (!p) return;
    if (confirm('Supprimer "' + p.nom + '" et tous ses mouvements ?')) {
      try {
        await StockFlow.Data.deleteProduit(id);
        this.renderAll();
      } catch (e) { alert('Erreur: ' + e.message); }
    }
  },

  async deleteMvt(id) {
    if (confirm('Supprimer ce mouvement ?')) {
      try {
        await StockFlow.Data.deleteMouvement(id);
        this.renderAll();
      } catch (e) { alert('Erreur: ' + e.message); }
    }
  },

  async _saveProduct() {
    const ref = $('#pRef').val().trim();
    const nom = $('#pNom').val().trim();
    const cat = $('#pCat').val();
    const prix = parseFloat($('#pPrix').val());
    const seuil = parseInt($('#pSeuil').val());
    const desc = $('#pDesc').val().trim();

    if (!ref || !nom || !cat || isNaN(prix) || isNaN(seuil)) {
      alert('Veuillez remplir tous les champs obligatoires (*)');
      return;
    }

    const data = { reference: ref, nom, categorie_id: parseInt(cat), description: desc, prix_unitaire: prix, seuil_alerte: seuil };
    const editId = parseInt($('#pEditId').val());

    try {
      if (editId) {
        await StockFlow.Data.updateProduit(editId, data);
      } else {
        await StockFlow.Data.addProduit(data);
      }
      $('#productModal').removeClass('open');
      this.renderAll();
    } catch (e) { alert('Erreur: ' + e.message); }
  },

  async _saveMouvement() {
    const produitId = parseInt($('#mvtProduit').val());
    const type = $('#mvtType').val();
    const qty = parseInt($('#mvtQty').val());
    const user = $('#mvtUser').val().trim();
    const comment = $('#mvtComment').val().trim();

    if (!produitId || isNaN(qty) || qty <= 0) {
      alert('Veuillez sélectionner un produit et saisir une quantité valide.');
      return;
    }

    try {
      await StockFlow.Data.addMouvement({ produit_id: produitId, type_mouvement: type, quantite: qty, utilisateur: user || 'Inconnu', commentaire: comment });
      $('#mvtModal').removeClass('open');
      this.renderAll();
    } catch (e) { alert('Erreur: ' + e.message); }
  },

  _exportCSV() {
    const products = StockFlow.Data.getProduitsWithStock();
    const header = 'Référence,Nom,Catégorie,Prix unitaire,Stock actuel,Seuil alerte,Statut\n';
    const rows = products.map(p => {
      const s = StockFlow.Data.getStockStatus(p.stock_actuel, p.seuil_alerte);
      return [p.reference, '"' + p.nom + '"', p.categorie_nom, p.prix_unitaire, p.stock_actuel, p.seuil_alerte, s === 'ok' ? 'OK' : s === 'low' ? 'FAIBLE' : 'CRITIQUE'].join(',');
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'stockflow_inventaire_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
  },

  showLoading(text) {
    $('#loadingText').text(text || 'Chargement...');
    $('#loadingScreen').show().css('opacity', 1);
  },

  hideLoading() {
    $('#loadingScreen').addClass('fade-out');
    setTimeout(() => $('#loadingScreen').hide(), 400);
  }
};
