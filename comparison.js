// comparison.js - Critic vs Audience comparison visualizations

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

// Update just the comparison charts
function updateComparisonCharts() {
  const comparisonContainer = document.getElementById('comparison-container');
  if (comparisonContainer) {
    d3.select('#comparison-container').selectAll('*').remove();
    createCriticAudienceComparison();
  }
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

// Sort films based on the selected method
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
