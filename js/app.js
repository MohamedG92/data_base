// StockFlow Main Application
StockFlow.App = {
  async init() {
    StockFlow.UI.showLoading('Connexion à la base de données...');
    try {
      await StockFlow.Data.init();
      StockFlow.UI.showLoading('Chargement de l\'interface...');
      StockFlow.Charts.init();
      StockFlow.UI.init();
      StockFlow.UI.hideLoading();
      // Navigate to dashboard if alert param
      if (window.location.hash === '#alertes') {
        $('.nav-tab[data-page="dashboard"]').click();
      }
    } catch (e) {
      console.error('StockFlow init error:', e);
      $('#loadingText').text('❌ Erreur de connexion à la base de données. Vérifiez que XAMPP (Apache + MySQL) est démarré.');
      $('#loadingText').css('color', '#ef4444');
    }
  }
};

$(document).ready(() => StockFlow.App.init());
