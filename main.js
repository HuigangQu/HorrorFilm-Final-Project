// main.js - Main application controller and initialization

// Score categories and their better color palette
const SCORE_KEYS = [
    'Combined Score',
    'RT Critic Score',
    'RT Audience Score',
    'Metacritic Critic Score',
    'Metacritic Audience Score',
    'Letterboxd Score (Adjusted)',
    'CinemaScore (Adjusted)'
  ];
  
  // Color-blind friendly palette
  const SCORE_COLORS = [
    '#4e79a7', // blue
    '#f28e2c', // orange
    '#e15759', // red
    '#76b7b2', // teal
    '#59a14f', // green
    '#edc949', // yellow
    '#af7aa1'  // purple
  ];
  
  // Global state
  let state = {
    activeKey: 'Combined Score',
    showAllScores: false,
    showRadar: false,
    hoveredFilm: null,
    horrorFilms: [],
    nonHorrorFilms: []
  };
  
  // Comparison state
  let comparisonState = {
    filmCount: 20,
    sortMethod: 'abs-diff'
  };
  
  // Initialize application
  document.addEventListener('DOMContentLoaded', () => {
    initUI();
    loadData();
  });
  
  // Set up UI elements
  function initUI() {
    // Create score buttons
    const btnGroup = d3.select('#score-buttons');
    SCORE_KEYS.forEach((key, i) => {
      btnGroup.append('button')
              .text(formatButtonLabel(key))
              .attr('data-key', key)
              .style('border-color', SCORE_COLORS[i]);
    });
    
    // Create "All Scores" button
    btnGroup.append('button')
            .text('All Scores')
            .attr('id', 'btn-all');
    
    // Set up the legend
    createLegend();
    
    // Set up radar toggle buttons
    const toggleRadarBtn = document.getElementById('toggle-radar-btn');
    const closeRadarBtn = document.getElementById('close-radar');
    
    if (toggleRadarBtn) {
      toggleRadarBtn.addEventListener('click', toggleRadar);
    }
    
    if (closeRadarBtn) {
      closeRadarBtn.addEventListener('click', hideRadar);
    }
    
    // Set initial active button
    d3.select(`button[data-key="${state.activeKey}"]`).classed('active', true);
  }
  
  // Load and process the data
  function loadData() {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    Promise.all([
      d3.csv('data/Project Data - Horror Movies.csv'),
      d3.csv('data/Project Data - Non-Horror Movies.csv')
    ])
    .then(([horrorData, nonHorrorData]) => {
      // Parse and clean data - with different handling for horror vs non-horror
      const parseHorror = d => {
        d.Year = +d.Year;
        SCORE_KEYS.forEach(k => d[k] = +d[k]);
        d.isPositive = d['Postive/Negative'] === 'Positive';
        return d;
      };
      
      const parseNonHorror = d => {
        d.Year = +d.Year;
        SCORE_KEYS.forEach(k => d[k] = +d[k]);
        // For non-horror, calculate positivity based on Combined Score
        d.isPositive = +d['Combined Score'] >= 70;
        return d;
      };
      
      // Filter and parse the data
      state.horrorFilms = horrorData.filter(d => d.Genre === 'Horror').map(parseHorror);
      state.nonHorrorFilms = nonHorrorData.map(parseNonHorror);
      
      // Initialize visualizations
      updateVisualizations();
      setupEventHandlers();
      
      // Hide loading overlay with animation
      if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
          loadingOverlay.style.display = 'none';
        }, 300);
      }
    })
    .catch(error => {
      console.error('Error loading data:', error);
      if (loadingOverlay) {
        loadingOverlay.innerHTML = `
          <div class="error-message">
            <h3>Error Loading Data</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()">Try Again</button>
          </div>
        `;
      }
    });
  }
  
  // Set up event handlers for interactivity
  function setupEventHandlers() {
    // Score button handlers
    d3.selectAll('#score-buttons button').on('click', function() {
      const button = d3.select(this);
      const isAllButton = this.id === 'btn-all';
      
      // Update active button UI
      d3.selectAll('#score-buttons button').classed('active', false);
      button.classed('active', true);
      
      // Update state
      state.showAllScores = isAllButton;
      if (!isAllButton) {
        state.activeKey = button.attr('data-key');
      }
      
      // Update visualizations based on new state
      updateVisualizations();
    });
    
    // Comparison control handlers (if they exist in the DOM)
    const filmCountSelect = document.getElementById('film-count');
    const sortMethodSelect = document.getElementById('sort-method');
    
    if (filmCountSelect) {
      filmCountSelect.addEventListener('change', function() {
        comparisonState.filmCount = this.value;
        updateComparisonCharts();
      });
    }
    
    if (sortMethodSelect) {
      sortMethodSelect.addEventListener('change', function() {
        comparisonState.sortMethod = this.value;
        updateComparisonCharts();
      });
    }
  }
  
  // Update all visualizations
  function updateVisualizations() {
    // Clear previous charts
    d3.select('#graph-container').selectAll('*').remove();
    
    // Create new main charts
    createGraph(state.horrorFilms, 'Horror Movies', state.activeKey, state.showAllScores);
    createGraph(state.nonHorrorFilms, 'Non-Horror Movies', state.activeKey, state.showAllScores);
    
    // Create comparison charts if container exists
    const comparisonContainer = document.getElementById('comparison-container');
    if (comparisonContainer) {
      d3.select('#comparison-container').selectAll('*').remove();
      createCriticAudienceComparison();
    }
    
    // Show/hide score legends
    d3.selectAll('.score-legend').style('display', state.showAllScores ? 'flex' : 'none');
    
    // Update radar chart if visible
    if (state.showRadar) {
      const allFilms = [...state.horrorFilms, ...state.nonHorrorFilms];
      drawRadar(allFilms, state.hoveredFilm);
    }
  }
  
  // Toggle radar chart visibility
  function toggleRadar() {
    state.showRadar = !state.showRadar;
    const radarContainer = document.getElementById('radar-container');
    
    if (radarContainer) {
      if (state.showRadar) {
        radarContainer.classList.add('visible');
        const allFilms = [...state.horrorFilms, ...state.nonHorrorFilms];
        drawRadar(allFilms, state.hoveredFilm);
      } else {
        radarContainer.classList.remove('visible');
      }
    }
  }
  
  // Hide radar chart
  function hideRadar() {
    state.showRadar = false;
    const radarContainer = document.getElementById('radar-container');
    if (radarContainer) {
      radarContainer.classList.remove('visible');
    }
  }
  