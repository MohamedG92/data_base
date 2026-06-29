// StockFlow Charts
StockFlow.Charts = {
  catChart: null,
  mvtChart: null,

  init() {
    Chart.defaults.color = '#a1a1aa';
    Chart.defaults.borderColor = '#2a2a2a';
    Chart.defaults.font.family = "'Space Mono', monospace";
    Chart.defaults.font.size = 11;
    this.renderCatChart();
    this.renderMvtChart();
  },

  renderCatChart() {
    const ctx = document.getElementById('chartCategories');
    if (!ctx) return;
    const data = StockFlow.Data.getStockParCategorie();
    if (this.catChart) this.catChart.destroy();
    this.catChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Stock total',
          data: data.map(d => d.stock),
          backgroundColor: ['rgba(212,212,216,0.6)', 'rgba(161,161,170,0.6)', 'rgba(113,113,122,0.6)', 'rgba(82,82,91,0.6)', 'rgba(63,63,70,0.6)'],
          borderColor: ['#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46'],
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#2a2a2a' }, ticks: { color: '#a1a1aa' } },
          y: { grid: { color: '#2a2a2a' }, ticks: { color: '#a1a1aa' }, beginAtZero: true }
        }
      }
    });
  },

  renderMvtChart() {
    const ctx = document.getElementById('chartMouvements');
    if (!ctx) return;
    const data = StockFlow.Data.getMouvementsParJour();
    if (this.mvtChart) this.mvtChart.destroy();
    this.mvtChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          {
            label: 'Entrées',
            data: data.map(d => d.entrees),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#10b981'
          },
          {
            label: 'Sorties',
            data: data.map(d => d.sorties),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#ef4444'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#a1a1aa', boxWidth: 12, padding: 16 } }
        },
        scales: {
          x: { grid: { color: '#2a2a2a' }, ticks: { color: '#a1a1aa' } },
          y: { grid: { color: '#2a2a2a' }, ticks: { color: '#a1a1aa' }, beginAtZero: true }
        }
      }
    });
  },

  refresh() {
    this.renderCatChart();
    this.renderMvtChart();
  }
};
