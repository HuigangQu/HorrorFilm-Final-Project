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

// Update just the comparison charts
function updateComparisonCharts() {
  const comparisonContainer = document.getElementById('comparison-container');
  if (comparisonContainer) {
    d3.select('#comparison-container').selectAll('*').remove();
    createCriticAudienceComparison();
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
         const radarContainer = document.getElementById('radar-container');
         if (radarContainer) {
           radarContainer.classList.add('visible');
           drawRadar([...state.horrorFilms, ...state.nonHorrorFilms], d);
         }
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
  
  // For better centering
  container.style.width = '460px';
  container.style.display = 'inline-block';
  container.style.margin = '0 12px 24px';
  container.style.verticalAlign = 'top';
  
  container.appendChild(svg.node());
  
  // Ensure parent container has text-align center
  const graphContainer = document.getElementById('graph-container');
  if (graphContainer) {
    graphContainer.style.textAlign = 'center';
    graphContainer.appendChild(container);
  }
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
  if (tooltipNode) {
    const tooltipRect = tooltipNode.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    if (tooltipRect.right > viewportWidth) {
      tooltip.style('left', `${event.pageX - tooltipRect.width - 10}px`);
    }
  }
}

// Hide tooltip
function hideTooltip() {
  d3.select('#tooltip').style('opacity', 0);
}

// Create critic vs audience comparison visualization
function createCriticAudienceComparison() {
  // Create comparison for Rotten Tomatoes
  createComparisonChart(
    [...state.horrorFilms, ...state.nonHorrorFilms], 
    'Rotten Tomatoes: Critic vs Audience Scores',
    'RT Critic Score',
    'RT Audience Score'
  );
  
  // Create comparison for Metacritic
  createComparisonChart(
    [...state.horrorFilms, ...state.nonHorrorFilms], 
    'Metacritic: Critic vs Audience Scores',
    'Metacritic Critic Score',
    'Metacritic Audience Score'
  );
}

// Create an individual comparison chart
function createComparisonChart(films, title, criticKey, audienceKey) {
  // Filter out films with missing data
  const validFilms = films.filter(d => 
    !isNaN(d[criticKey]) && !isNaN(d[audienceKey])
  );
  
  // Calculate differences and add to data
  validFilms.forEach(d => {
    d.difference = d[criticKey] - d[audienceKey];
  });
  
  // Sort based on the selected sort method
  const sortedFilms = sortFilms(validFilms, comparisonState.sortMethod);
  
  // Limit the number of films to display based on the selected count
  const filmCount = comparisonState.filmCount === 'all' ? 
    validFilms.length : parseInt(comparisonState.filmCount);
  
  const displayFilms = sortedFilms.slice(0, filmCount);
  
  // Get comparison container
  const comparisonContainer = document.getElementById('comparison-container');
  if (!comparisonContainer) return;
  
  // Create container for this chart
  const container = document.createElement('div');
  container.className = 'comparison-chart';
  comparisonContainer.appendChild(container);
  
  // Add the title
  const titleElement = document.createElement('div');
  titleElement.className = 'bar-chart-title';
  titleElement.textContent = title;
  container.appendChild(titleElement);
  
  // Create legend
  const legendDiv = document.createElement('div');
  legendDiv.className = 'comparison-legend';
  
  // Critic higher legend item
  const criticHigher = document.createElement('div');
  criticHigher.className = 'comparison-legend-item';
  criticHigher.innerHTML = `
    <div class="legend-color-box" style="background-color: #4e79a7;"></div>
    <span>Critics Rate Higher</span>
  `;
  
  // Audience higher legend item
  const audienceHigher = document.createElement('div');
  audienceHigher.className = 'comparison-legend-item';
  audienceHigher.innerHTML = `
    <div class="legend-color-box" style="background-color: #e15759;"></div>
    <span>Audience Rates Higher</span>
  `;
  
  legendDiv.appendChild(criticHigher);
  legendDiv.appendChild(audienceHigher);
  container.appendChild(legendDiv);
  
  // Display count info
  const countInfo = document.createElement('div');
  countInfo.className = 'count-info';
  countInfo.style.textAlign = 'center';
  countInfo.style.marginBottom = '10px';
  countInfo.style.fontSize = '0.9rem';
  countInfo.style.color = '#666';
  countInfo.textContent = `Showing ${displayFilms.length} of ${validFilms.length} films`;
  container.appendChild(countInfo);
  
  // Chart dimensions
  const width = 700;
  const barHeight = 22;
  const margin = {top: 20, right: 160, bottom: 40, left: 160};
  const chartHeight = displayFilms.length * (barHeight + 8) + margin.top + margin.bottom;
  
  // Create scales
  // Find max difference to set domain
  const maxDiff = Math.max(
    d3.max(displayFilms, d => Math.abs(d.difference)) || 20, 
    20 // Minimum range of 20 points to avoid too narrow scales
  );
  
  const x = d3.scaleLinear()
    .domain([-maxDiff, maxDiff])
    .range([margin.left, width - margin.right]);
    
  const y = d3.scaleBand()
    .domain(displayFilms.map(d => d.Film))
    .range([margin.top, chartHeight - margin.bottom])
    .padding(0.3);
  
  // Create SVG
  const svg = d3.create('svg')
    .attr('width', width)
    .attr('height', chartHeight)
    .attr('viewBox', `0 0 ${width} ${chartHeight}`)
    .attr('style', 'max-width: 100%; height: auto;');
  
  // Add background
  svg.append('rect')
    .attr('width', width)
    .attr('height', chartHeight)
    .attr('fill', 'white');
  
  // Add grid lines
  svg.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${chartHeight - margin.bottom})`)
    .call(
      d3.axisBottom(x)
        .ticks(10)
        .tickSize(-(chartHeight - margin.top - margin.bottom))
        .tickFormat('')
    )
    .call(g => g.select('.domain').remove());
  
  // Add zero line
  svg.append('line')
    .attr('class', 'zero-line')
    .attr('x1', x(0))
    .attr('x2', x(0))
    .attr('y1', margin.top - 10)
    .attr('y2', chartHeight - margin.bottom);
  
  // Add x-axis
  svg.append('g')
    .attr('transform', `translate(0,${chartHeight - margin.bottom})`)
    .call(
      d3.axisBottom(x)
        .ticks(10)
        .tickFormat(d => d === 0 ? '0' : d > 0 ? `+${d}` : d)
    );
  
  // Add x-axis label
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', chartHeight - 5)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text('Score Difference (Critic - Audience)');
  
  // Add film labels (y-axis)
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select('.domain').remove())
    .selectAll('.tick text')
    .attr('class', 'film-label')
    .call(wrap, margin.left - 10); // Wrap text function to handle long film names
  
  // Create bars
  const bars = svg.selectAll('.film-bar')
    .data(displayFilms)
    .join('rect')
    .attr('class', 'film-bar')
    .attr('y', d => y(d.Film))
    .attr('height', y.bandwidth())
    .attr('x', d => d.difference < 0 ? x(0) : x(0) - 1)
    .attr('width', 0) // Start with width 0 for animation
    .attr('fill', d => d.difference < 0 ? '#e15759' : '#4e79a7')
    .attr('fill-opacity', d => d.Genre === 'Horror' ? 1 : 0.7) // Highlight horror
    .attr('rx', 2) // Rounded corners
    .attr('ry', 2);
  
  // Animate bars
  bars.transition()
    .duration(800)
    .delay((d, i) => i * 50)
    .attr('x', d => d.difference < 0 ? x(d.difference) : x(0))
    .attr('width', d => Math.abs(x(d.difference) - x(0)));
  
  // Add critic score labels
  svg.selectAll('.critic-score')
    .data(displayFilms)
    .join('text')
    .attr('class', 'score-label')
    .attr('x', d => d.difference > 0 ? x(d.difference) + 5 : x(0) - 5)
    .attr('y', d => y(d.Film) + y.bandwidth() / 2 - 5)
    .attr('text-anchor', d => d.difference > 0 ? 'start' : 'end')
    .attr('fill', '#4e79a7')
    .attr('dy', '0.35em')
    .text(d => `Critic: ${Math.round(d[criticKey])}`);
  
  // Add audience score labels
  svg.selectAll('.audience-score')
    .data(displayFilms)
    .join('text')
    .attr('class', 'score-label')
    .attr('x', d => d.difference < 0 ? x(d.difference) - 5 : x(0) + 5)
    .attr('y', d => y(d.Film) + y.bandwidth() / 2 + 5)
    .attr('text-anchor', d => d.difference < 0 ? 'end' : 'start')
    .attr('fill', '#e15759')
    .attr('dy', '0.35em')
    .text(d => `Audience: ${Math.round(d[audienceKey])}`);
  
  // Add year and genre info
  svg.selectAll('.info-label')
    .data(displayFilms)
    .join('text')
    .attr('class', 'score-label')
    .attr('x', width - margin.right + 10)
    .attr('y', d => y(d.Film) + y.bandwidth() / 2)
    .attr('text-anchor', 'start')
    .attr('fill', '#777')
    .attr('dy', '0.35em')
    .text(d => `${d.Year} · ${d.Genre}`);
  
  // Add interactivity
  bars.on('mouseover', function(event, d) {
    // Highlight the bar
    d3.select(this)
      .transition().duration(200)
      .attr('stroke', 'black')
      .attr('stroke-width', 1.5)
      .attr('fill-opacity', 1);
    
    // Show tooltip with detailed information
    showDifferenceTooltip(event, d, criticKey, audienceKey);
  })
  .on('mouseout', function() {
    // Restore original appearance
    d3.select(this)
      .transition().duration(200)
      .attr('stroke', 'none')
      .attr('fill-opacity', d => d.Genre === 'Horror' ? 1 : 0.7);
    
    // Hide tooltip
    hideTooltip();
  });
  
  // Append the SVG to the container
  container.appendChild(svg.node());
}

// Helper function to handle text wrapping for long film titles
function wrap(text, width) {
  text.each(function() {
    const text = d3.select(this);
    const words = text.text().split(/\s+/).reverse();
    let word;
    let line = [];
    let lineNumber = 0;
    const lineHeight = 1.1; // ems
    const y = text.attr("y");
    const dy = parseFloat(text.attr("dy") || 0);
    let tspan = text.text(null).append("tspan")
      .attr("x", -5)
      .attr("y", y)
      .attr("dy", dy + "em");
    
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan")
          .attr("x", -5)
          .attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .text(word);
      }
    }
  });
}

// Show detailed tooltip for difference charts
function showDifferenceTooltip(event, d, criticKey, audienceKey) {
  const tooltip = d3.select('#tooltip');
  
  const absDiff = Math.abs(d.difference);
  const whoRatedHigher = d.difference > 0 ? 
    "Critics rated this higher" : 
    "Audiences rated this higher";
  
  // Format content
  let content = `
    <h3>${d.Film} (${d.Year})</h3>
    <div class="tooltip-row">
      <span class="tooltip-label">Genre:</span>
      <span>${d.Genre}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">Critic Score:</span>
      <span style="color: #4e79a7; font-weight: bold">${Math.round(d[criticKey])}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">Audience Score:</span>
      <span style="color: #e15759; font-weight: bold">${Math.round(d[audienceKey])}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">Difference:</span>
      <span style="font-weight: bold; color: ${d.difference > 0 ? '#4e79a7' : '#e15759'}">
        ${d.difference > 0 ? '+' : ''}${Math.round(d.difference)} points
      </span>
    </div>
    <div class="tooltip-row" style="margin-top: 5px; font-style: italic; color: #555">
      ${whoRatedHigher} by ${absDiff.toFixed(1)} points
    </div>
  `;
  
  // Position and show tooltip
  tooltip
    .html(content)
    .style('left', `${event.pageX + 15}px`)
    .style('top', `${event.pageY - 28}px`)
    .style('opacity', 1);
    
  // Ensure tooltip doesn't overflow viewport
  const tooltipNode = tooltip.node();
  if (tooltipNode) {
    const tooltipRect = tooltipNode.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    if (tooltipRect.right > viewportWidth) {
      tooltip.style('left', `${event.pageX - tooltipRect.width - 10}px`);
    }
  }
}

// Add this function to sort films based on the selected method
function sortFilms(films, sortMethod) {
  switch(sortMethod) {
    case 'abs-diff':
      // Sort by absolute difference (largest first)
      return [...films].sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
    
    case 'critic-higher':
      // Sort by how much critics rate higher than audience (descending)
      return [...films].sort((a, b) => b.difference - a.difference)
        .filter(d => d.difference > 0); // Only keep films where critics rated higher
    
    case 'audience-higher':
      // Sort by how much audience rates higher than critics (descending)
      return [...films].sort((a, b) => a.difference - b.difference)
        .filter(d => d.difference < 0); // Only keep films where audience rated higher
    
    case 'year-asc':
      // Sort by year (oldest first)
      return [...films].sort((a, b) => a.Year - b.Year);
    
    case 'year-desc':
      // Sort by year (newest first)
      return [...films].sort((a, b) => b.Year - a.Year);
    
    default:
      // Default to absolute difference
      return [...films].sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  }
}
