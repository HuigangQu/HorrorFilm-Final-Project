// utilities.js - Helper functions for the application

// Format button labels to be more concise
function formatButtonLabel(key) {
    return key
      .replace(' Score', '')
      .replace('Adjusted', 'Adj.')
      .replace('Audience', 'Aud.')
      .replace('Critic', 'Crit.');
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
  
  // Standard tooltip functions
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
  
  function hideTooltip() {
    d3.select('#tooltip').style('opacity', 0);
  }
  