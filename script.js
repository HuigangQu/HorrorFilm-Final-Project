// script.js - Main visualization controller

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
  document.getElementById('toggle-radar-btn').addEventListener('click', toggleRadar);
  document.getElementById('close-radar').addEventListener('click', hideRadar);
  
  // Set initial active button
  d3.select(`button[data-key="${state.activeKey}"]`).classed('active', true);
}

// Format button labels to be more concise
function formatButtonLabel(key) {
  return key
    .replace(' Score', '')
    .replace('Adjusted', 'Adj.')
    .replace('Audience', 'Aud.')
    .replace('Critic', 'Crit.');
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
      // FIX: For non-horror, calculate positivity based on Combined Score
      // Assuming scores >= 70 are positive (industry standard)
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
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 300);
  })
  .catch(error => {
    console.error('Error loading data:', error);
    loadingOverlay.innerHTML = `
      <div class="error-message">
        <h3>Error Loading Data</h3>
        <p>${error.message}</p>
        <button onclick="location.reload()">Try Again</button>
      </div>
    `;
  });
}

// Set up event handlers for interactivity
function setupEventHandlers() {
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
}

// Create a legend
function createLegend() {
  const legend = d3.select('#legend-container');
  
  // Add legend for positive/negative ratings
  legend.append('div')
    .attr('class', 'legend-item')
    .html(`
      <div class="legend-color" style="background: var(--pos-color)"></div>
      <div>Positive Rating</div>
    `);
  
  legend.append('div')
    .attr('class', 'legend-item')
    .html(`
      <div class="legend-color" style="background: var(--neg-color)"></div>
      <div>Negative Rating</div>
    `);
  
  // Add separator
  legend.append('div')
    .attr('class', 'legend-separator')
    .style('width', '1px')
    .style('height', '20px')
    .style('background', '#ddd')
    .style('margin', '0 10px');
  
  // Add legend for score types
  SCORE_KEYS.forEach((key, i) => {
    legend.append('div')
      .attr('class', 'legend-item score-legend')
      .attr('data-key', key)
      .style('display', 'none') // Hidden initially
      .html(`
        <div class="legend-color" style="background: ${SCORE_COLORS[i]}"></div>
        <div>${formatButtonLabel(key)}</div>
      `);
  });
}

// Update all visualizations
function updateVisualizations() {
  // Clear previous charts
  d3.select('#graph-container').selectAll('*').remove();
  
  // Create new charts
  createGraph(state.horrorFilms, 'Horror Movies', state.activeKey, state.showAllScores);
  createGraph(state.nonHorrorFilms, 'Non-Horror Movies', state.activeKey, state.showAllScores);
  
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
  
  if (state.showRadar) {
    radarContainer.classList.add('visible');
    const allFilms = [...state.horrorFilms, ...state.nonHorrorFilms];
    drawRadar(allFilms, state.hoveredFilm);
  } else {
    radarContainer.classList.remove('visible');
  }
}

// Hide radar chart
function hideRadar() {
  state.showRadar = false;
  document.getElementById('radar-container').classList.remove('visible');
}

// Create an individual graph visualization
function createGraph(films, title, activeKey, showAllScores) {
  // Sort films by year
  films.sort((a, b) => a.Year - b.Year);
  
  // Chart dimensions
  const width = 460, 
        height = 320,
        margin = {top: 40, right: 30, bottom: 40, left: 50};
      
  // Create scales
  const x = d3.scaleLinear()
      .domain(d3.extent(films, d => d.Year)).nice()
      .range([margin.left, width - margin.right]);
  
  const y = d3.scaleLinear()
      .domain([0, 100])
      .range([height - margin.bottom, margin.top]);
  
  // Create SVG container with viewBox for responsiveness
  const svg = d3.create('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'chart-svg');
  
  // Add background
  svg.append('rect')
     .attr('width', width)
     .attr('height', height)
     .attr('fill', '#fff');
  
  // Add grid lines
  svg.append('g')
     .attr('class', 'grid')
     .attr('transform', `translate(0,${height - margin.bottom})`)
     .call(d3.axisBottom(x)
             .ticks(width/80)
             .tickSize(-(height - margin.top - margin.bottom))
             .tickFormat(''))
     .call(g => g.select('.domain').remove());
  
  svg.append('g')
     .attr('class', 'grid')
     .attr('transform', `translate(${margin.left},0)`)
     .call(d3.axisLeft(y)
             .ticks(10)
             .tickSize(-(width - margin.left - margin.right))
             .tickFormat(''))
     .call(g => g.select('.domain').remove());
     
  // Add X and Y axes
  svg.append('g')
     .attr('class', 'x-axis')
     .attr('transform', `translate(0,${height - margin.bottom})`)
     .call(d3.axisBottom(x)
            .ticks(width/80)
            .tickFormat(d3.format('d')));
            
  svg.append('g')
     .attr('class', 'y-axis')
     .attr('transform', `translate(${margin.left},0)`)
     .call(d3.axisLeft(y));
  
  // Add axis labels
  svg.append('text')
     .attr('class', 'axis-label')
     .attr('text-anchor', 'middle')
     .attr('x', width / 2)
     .attr('y', height - 5)
     .text('Year');
     
  svg.append('text')
     .attr('class', 'axis-label')
     .attr('text-anchor', 'middle')
     .attr('transform', 'rotate(-90)')
     .attr('x', -height / 2)
     .attr('y', 15)
     .text('Score');
  
  // Determine which score keys to display
  const keys = showAllScores ? SCORE_KEYS : [activeKey];
  
  // Draw line paths for each score
  keys.forEach((key, idx) => {
    // Filter out entries with NaN values
    const validFilms = films.filter(d => !isNaN(d[key]));
    
    if (validFilms.length > 0) {
      const lineGen = d3.line()
          .defined(d => !isNaN(d[key]))
          .curve(d3.curveCatmullRom)
          .x(d => x(d.Year))
          .y(d => y(d[key]));
      
      // Add line with animation
      const path = svg.append('path')
         .datum(validFilms)
         .attr('fill', 'none')
         .attr('stroke', SCORE_COLORS[SCORE_KEYS.indexOf(key)])
         .attr('stroke-width', key === activeKey && !showAllScores ? 2.5 : 2)
         .attr('d', lineGen);
         
      // Animate path drawing
      const pathLength = path.node().getTotalLength();
      path.attr('stroke-dasharray', pathLength)
          .attr('stroke-dashoffset', pathLength)
          .transition()
          .duration(1000)
          .ease(d3.easeLinear)
          .attr('stroke-dashoffset', 0);
    }
  });
  
  // FIX: Only draw data points when NOT showing all scores
  if (!showAllScores) {
    const pointsGroup = svg.append('g').attr('class', 'data-points');
    
    pointsGroup.selectAll('circle')
       .data(films.filter(d => !isNaN(d[activeKey])))
       .join('circle')
         .attr('cx', d => x(d.Year))
         .attr('cy', d => y(d[activeKey]))
         .attr('r', 0) // Start with radius 0 for animation
         .attr('fill', d => d.isPositive ? 'var(--pos-color)' : 'var(--neg-color)')
         .attr('stroke', '#fff')
         .attr('stroke-width', 1)
         .transition() // Animate points appearing
         .duration(1000)
         .delay((d, i) => i * 30)
         .attr('r', 5);
    
    // Add interactivity to data points
    pointsGroup.selectAll('circle')
       .on('mouseover', (event, d) => {
         // Update state and highlight point
         state.hoveredFilm = d;
         d3.select(event.target)
           .transition()
           .duration(200)
           .attr('r', 8);
         
         // Update radar chart if visible
         if (state.showRadar) {
           drawRadar([...state.horrorFilms, ...state.nonHorrorFilms], d);
         }
         
         // Show tooltip
         showTooltip(event, d);
       })
       .on('mouseout', (event) => {
         // Reset point size
         d3.select(event.target)
           .transition()
           .duration(200)
           .attr('r', 5);
         
         // Hide tooltip
         hideTooltip();
       })
       .on('click', (event, d) => {
         // Show radar and focus on this film
         state.showRadar = true;
         state.hoveredFilm = d;
         document.getElementById('radar-container').classList.add('visible');
         drawRadar([...state.horrorFilms, ...state.nonHorrorFilms], d);
       });
  }
  
  // Add title
  svg.append('text')
     .attr('class', 'chart-title')
     .attr('x', width / 2)
     .attr('y', 16)
     .attr('text-anchor', 'middle')
     .text(`${title} – ${showAllScores ? 'All Scores' : activeKey}`);
  
  // Create container and add SVG
  const container = document.createElement('div');
  container.className = 'chart-container';
  container.style.flex = '1 1 440px';
  container.appendChild(svg.node());
  const graphContainer = document.getElementById('graph-container');
  graphContainer.appendChild(container);

  graphContainer.style.display = 'flex';
  graphContainer.style.flexWrap = 'wrap';
  graphContainer.style.justifyContent = 'center';
}

// Show tooltip with film details
function showTooltip(event, d) {
  const tooltip = d3.select('#tooltip');
  
  // Format content
  let content = `
    <h3>${d.Film} (${d.Year})</h3>
    <div class="tooltip-row">
      <span class="tooltip-label">Genre:</span>
      <span>${d.Genre}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">Rating:</span>
      <span style="color: ${d.isPositive ? 'var(--pos-color)' : 'var(--neg-color)'}">
        ${d.isPositive ? 'Positive' : 'Negative'}
      </span>
    </div>
  `;
  
  // Add score details
  SCORE_KEYS.forEach(key => {
    if (!isNaN(d[key])) {
      content += `
        <div class="tooltip-row">
          <span class="tooltip-label">${formatButtonLabel(key)}:</span>
          <span>${Math.round(d[key])}</span>
        </div>
      `;
    }
  });
  
  // Position and show tooltip
  tooltip
    .html(content)
    .style('left', `${event.pageX + 15}px`)
    .style('top', `${event.pageY - 28}px`)
    .style('opacity', 1);
    
  // Ensure tooltip doesn't overflow viewport
  const tooltipNode = tooltip.node();
  const tooltipRect = tooltipNode.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  
  if (tooltipRect.right > viewportWidth) {
    tooltip.style('left', `${event.pageX - tooltipRect.width - 10}px`);
  }
}

// Hide tooltip
function hideTooltip() {
  d3.select('#tooltip').style('opacity', 0);
}



