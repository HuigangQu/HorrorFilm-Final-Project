// charts.js - Main line chart visualizations

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
    
    // Only draw data points when NOT showing all scores
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
  
  // Create a legend for the line charts
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
  