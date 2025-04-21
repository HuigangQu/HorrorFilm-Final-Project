// radar.js - Enhanced radar chart visualization

function drawRadar(data, focusFilm) {
  const svg = d3.select('#radar-chart');
  svg.selectAll('*').remove(); // Clear previous content
  
  if (!data || data.length === 0) return; // Safety check
  
  const size = Math.min(
    parseInt(svg.style('width')), 
    parseInt(svg.style('height'))
  );
  const margin = 60;
  const radius = (size / 2) - margin;
  const center = size / 2;
  
  svg.attr('viewBox', `0 0 ${size} ${size}`);
  
  const scores = [
    {key:'Combined Score',       label:'Combined'},
    {key:'RT Critic Score',      label:'RT Critic'},
    {key:'RT Audience Score',    label:'RT Audience'},
    {key:'Metacritic Critic Score',  label:'Meta Critic'},
    {key:'Metacritic Audience Score',label:'Meta Audience'},
    {key:'Letterboxd Score (Adjusted)',label:'Letterboxd'},
    {key:'CinemaScore (Adjusted)',label:'CinemaScore'}
  ];

  const angleSlice = (2 * Math.PI) / scores.length;
  const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

  // Add background circle
  svg.append('circle')
     .attr('cx', center)
     .attr('cy', center)
     .attr('r', radius)
     .attr('fill', '#f8f9fa')
     .attr('stroke', '#ddd');

  // Draw grid circles
  const levels = 5;
  const levelGroups = svg.append('g')
     .attr('class', 'levels');
     
  for (let lvl = 1; lvl <= levels; lvl++) {
    const lvlFactor = radius * (lvl / levels);
    levelGroups.append('circle')
       .attr('cx', center)
       .attr('cy', center)
       .attr('r', lvlFactor)
       .attr('fill', 'none')
       .attr('stroke', '#ccc')
       .attr('stroke-width', 0.5)
       .attr('stroke-opacity', 0.8);
       
    // Add scale labels
    if (lvl < levels) {
      levelGroups.append('text')
         .attr('x', center)
         .attr('y', center - lvlFactor)
         .attr('text-anchor', 'middle')
         .attr('dominant-baseline', 'middle')
         .attr('font-size', '9px')
         .attr('fill', '#777')
         .text(`${Math.round(lvl * (100 / levels))}`);
    }
  }

  // Draw axis lines
  const axisGrid = svg.append('g').attr('class', 'axis-grid');
  
  scores.forEach((s, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const lineData = [
      { x: center, y: center },
      { 
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle)
      }
    ];
    
    // Draw axis line
    axisGrid.append('line')
       .attr('x1', lineData[0].x)
       .attr('y1', lineData[0].y)
       .attr('x2', lineData[1].x)
       .attr('y2', lineData[1].y)
       .attr('stroke', '#bbb')
       .attr('stroke-width', 0.6);
    
    // Draw axis label
    const labelDistance = radius + 15;
    const x = center + labelDistance * Math.cos(angle);
    const y = center + labelDistance * Math.sin(angle);
    
    axisGrid.append('text')
       .attr('x', x)
       .attr('y', y)
       .attr('text-anchor', function() {
         // Better text alignment based on position
         if (Math.abs(angle) < 0.1 || Math.abs(angle - Math.PI) < 0.1) return 'middle';
         return angle > Math.PI / 2 && angle < 3 * Math.PI / 2 ? 'end' : 'start';
       })
       .attr('dominant-baseline', 'middle')
       .attr('font-size', '9px')
       .attr('fill', '#555')
       .text(s.label);
  });

  // Define radar line generator
  const radarLine = d3.lineRadial()
      .radius(d => rScale(d.value))
      .angle((d, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

  // Draw background data polygons with low opacity
  const dataPoints = svg.append('g')
     .attr('class', 'data-points')
     .attr('transform', `translate(${center},${center})`);
  
  const validData = data.map(d => {
    scores.forEach(({ key }) => {
      const n = Number(d[key]);
      d[key] = Number.isNaN(n) ? 0 : n;
    });
    return d;
  });
  
  if (validData.length > 0) {
    dataPoints.selectAll('.radar-area')
       .data(validData)
       .join('path')
       .attr('class', 'radar-area')
       .attr('d', d => radarLine(scores.map(s => ({value: +d[s.key] || 0}))))
       .attr('fill', '#bbb')
       .attr('fill-opacity', 0.05)
       .attr('stroke', '#999')
       .attr('stroke-width', 0.5)
       .attr('stroke-opacity', 0.3);
  }

  // Draw the focused film polygon if one is selected
  if (focusFilm && scores.every(s => !isNaN(+focusFilm[s.key]))) {
    const focusGroup = svg.append('g')
       .attr('class', 'focus-group')
       .attr('transform', `translate(${center},${center})`);
    
    // Add highlighted radar area
    focusGroup.append('path')
       .attr('class', 'radar-area-focus')
       .attr('d', radarLine(scores.map(s => ({value: +focusFilm[s.key] || 0}))))
       .attr('fill', 'rgba(0,123,255,0.2)')
       .attr('stroke', '#007bff')
       .attr('stroke-width', 2);
    
    // Add film information 
    svg.append('g')
       .attr('class', 'film-info')
       .attr('transform', `translate(${center}, ${center})`)
       .append('text')
       .attr('class', 'focus-title')
       .attr('text-anchor', 'middle')
       .attr('font-size', '12px')
       .attr('font-weight', 'bold')
       .attr('fill', '#007bff')
       .text(focusFilm.Film);
    
    // Add film year
    svg.append('text')
       .attr('x', center)
       .attr('y', center + 16)
       .attr('text-anchor', 'middle')
       .attr('font-size', '10px')
       .attr('fill', '#555')
       .text(`${focusFilm.Year} • ${focusFilm.Genre}`);
       
    // Add a legend of scores
    const legendGroup = svg.append('g')
       .attr('class', 'radar-legend')
       .attr('transform', `translate(${center - radius/2}, ${center + radius/2})`);
    
    scores.forEach((score, i) => {
      const scoreValue = +focusFilm[score.key] || 0;
      if (!isNaN(scoreValue)) {
        legendGroup.append('text')
           .attr('x', 0)
           .attr('y', i * 12)
           .attr('font-size', '8px')
           .attr('fill', '#555')
           .text(`${score.label}: ${Math.round(scoreValue)}`);
      }
    });
  }
}
