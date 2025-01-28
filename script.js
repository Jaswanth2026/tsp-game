class TSPGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.cities = [];
        this.distances = [];
        this.currentPath = [];
        this.bestPath = null;
        this.bestCost = Infinity;
        this.optimalPath = null;
        this.optimalCost = Infinity;
        
        // Initialize canvas and event listeners
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Initialize button listeners
        document.getElementById('startButton').addEventListener('click', () => this.startGame());
        document.getElementById('resetButton').addEventListener('click', () => this.resetPath());
        document.getElementById('hintButton').addEventListener('click', () => this.requestHint());
        document.getElementById('solutionButton').addEventListener('click', () => this.showOptimalSolution());
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.render();
    }

    startGame() {
        const numCities = parseInt(document.getElementById('numCities').value);
        if (numCities < 2 || numCities > 10) {
            this.showFeedback('Please choose between 2 and 10 cities', 'error');
            return;
        }

        // Generate random cities
        this.cities = [];
        for (let i = 0; i < numCities; i++) {
            this.cities.push({
                x: Math.random() * (this.canvas.width - 100) + 50,
                y: Math.random() * (this.canvas.height - 100) + 50,
                label: String.fromCharCode(65 + i)
            });
        }

        // Generate distances with some infinite paths
        this.distances = Array(numCities).fill().map(() => Array(numCities).fill(Infinity));
        for (let i = 0; i < numCities; i++) {
            for (let j = i + 1; j < numCities; j++) {
                // 70% chance of having a direct path
                if (Math.random() < 0.7) {
                    const distance = Math.round(this.calculateDistance(this.cities[i], this.cities[j]));
                    this.distances[i][j] = distance;
                    this.distances[j][i] = distance;
                }
            }
            this.distances[i][i] = 0;
        }

        // Ensure the graph is connected
        this.ensureConnectedGraph();

        this.currentPath = [];
        this.bestPath = null;
        this.bestCost = Infinity;
        this.findOptimalSolution();
        this.createDistanceMatrix();
        this.render();
        this.showFeedback('Click on cities to create your path. Only directly connected cities can be visited consecutively.', 'info');
    }

    ensureConnectedGraph() {
        const n = this.cities.length;
        const visited = new Set();
        
        const visit = (city) => {
            visited.add(city);
            for (let i = 0; i < n; i++) {
                if (this.distances[city][i] !== Infinity && !visited.has(i)) {
                    visit(i);
                }
            }
        };

        visit(0);
        
        if (visited.size !== n) {
            for (let i = 0; i < n; i++) {
                if (!visited.has(i)) {
                    const distance = Math.round(this.calculateDistance(this.cities[0], this.cities[i]));
                    this.distances[0][i] = distance;
                    this.distances[i][0] = distance;
                    visit(i);
                }
            }
        }
    }

    calculateDistance(city1, city2) {
        const dx = city1.x - city2.x;
        const dy = city1.y - city2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    createDistanceMatrix() {
        const container = document.getElementById('matrix-container');
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${this.cities.length + 1}, auto)`;

        // Add header row
        container.appendChild(this.createMatrixCell(''));
        for (let i = 0; i < this.cities.length; i++) {
            container.appendChild(this.createMatrixCell(this.cities[i].label));
        }

        // Add matrix rows
        for (let i = 0; i < this.cities.length; i++) {
            container.appendChild(this.createMatrixCell(this.cities[i].label));
            for (let j = 0; j < this.cities.length; j++) {
                const value = this.distances[i][j];
                container.appendChild(this.createMatrixCell(value === Infinity ? '∞' : value));
            }
        }
    }

    createMatrixCell(content) {
        const cell = document.createElement('div');
        cell.textContent = content;
        return cell;
    }

    handleCanvasClick(event) {
        if (!this.cities.length) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const clickedCity = this.cities.findIndex(city => {
            const dx = city.x - x;
            const dy = city.y - y;
            return Math.sqrt(dx * dx + dy * dy) < 20;
        });

        if (clickedCity !== -1) {
            this.addToPath(clickedCity);
        }
    }

    addToPath(cityIndex) {
        if (this.currentPath.includes(cityIndex)) {
            this.showFeedback('City already in path', 'error');
            return;
        }

        if (this.currentPath.length > 0) {
            const lastCity = this.currentPath[this.currentPath.length - 1];
            if (this.distances[lastCity][cityIndex] === Infinity) {
                this.showFeedback('No direct path to this city exists', 'error');
                return;
            }
        }

        this.currentPath.push(cityIndex);
        this.render();

        if (this.currentPath.length === this.cities.length) {
            const lastCity = this.currentPath[this.currentPath.length - 1];
            const firstCity = this.currentPath[0];
            if (this.distances[lastCity][firstCity] === Infinity) {
                this.showFeedback('Cannot complete the cycle - no path back to start', 'error');
                return;
            }
            this.checkSolution();
        }
    }

    checkSolution() {
        const totalDistance = this.calculatePathDistance(this.currentPath);
        if (totalDistance < this.bestCost) {
            this.bestCost = totalDistance;
            this.bestPath = [...this.currentPath];
            this.showFeedback(`New best path found! Distance: ${Math.round(totalDistance)}`, 'success');
        } else {
            this.showFeedback(`Path distance: ${Math.round(totalDistance)}`, 'info');
        }
    }

    calculatePathDistance(path) {
        let distance = 0;
        for (let i = 0; i < path.length - 1; i++) {
            distance += this.distances[path[i]][path[i + 1]];
        }
        if (path.length === this.cities.length) {
            distance += this.distances[path[path.length - 1]][path[0]];
        }
        return distance;
    }

    findOptimalSolution() {
        const n = this.cities.length;
        let minCost = Infinity;
        let optimalPath = null;

        const bound = (path, cost, visited) => {
            if (path.length === n) {
                if (this.distances[path[n-1]][path[0]] !== Infinity) {
                    const totalCost = cost + this.distances[path[n-1]][path[0]];
                    if (totalCost < minCost) {
                        minCost = totalCost;
                        optimalPath = [...path];
                    }
                }
                return;
            }

            const last = path[path.length - 1];
            for (let i = 0; i < n; i++) {
                if (!visited[i] && this.distances[last][i] !== Infinity) {
                    visited[i] = true;
                    path.push(i);
                    bound(path, cost + this.distances[last][i], visited);
                    path.pop();
                    visited[i] = false;
                }
            }
        };

        const visited = Array(n).fill(false);
        visited[0] = true;
        bound([0], 0, visited);

        this.optimalPath = optimalPath;
        this.optimalCost = minCost;
    }

    showOptimalSolution() {
        if (this.optimalPath) {
            this.currentPath = [...this.optimalPath];
            this.render();
            this.showFeedback(`Optimal path: ${this.optimalPath.map(i => this.cities[i].label).join(' → ')} → ${this.cities[this.optimalPath[0]].label}, Distance: ${Math.round(this.optimalCost)}`, 'success');
        }
    }

    resetPath() {
        this.currentPath = [];
        this.render();
        this.showFeedback('Path reset', 'info');
    }

    requestHint() {
        if (!this.cities.length) return;

        let hint;
        if (this.currentPath.length === 0) {
            hint = "Start with any city - try city A!";
        } else if (this.currentPath.length === this.cities.length) {
            hint = "Complete! Try a different starting city for a better solution.";
        } else {
            const lastCity = this.currentPath[this.currentPath.length - 1];
            const availableCities = this.cities
                .map((city, index) => ({index, distance: this.distances[lastCity][index]}))
                .filter(city => !this.currentPath.includes(city.index) && city.distance !== Infinity)
                .sort((a, b) => a.distance - b.distance);

            if (availableCities.length > 0) {
                const nextCity = this.cities[availableCities[0].index].label;
                hint = `Try visiting city ${nextCity} next - it's the closest connected city.`;
            } else {
                hint = "No direct paths available - try a different previous choice.";
            }
        }
        this.showFeedback(hint, 'info');
    }

    showFeedback(message, type) {
        const feedback = document.getElementById('feedback');
        feedback.textContent = message;
        feedback.className = `feedback ${type}`;
    }

    render() {
        if (!this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw edges (connections between cities)
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.cities.length; i++) {
            for (let j = i + 1; j < this.cities.length; j++) {
                if (this.distances[i][j] !== Infinity) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.cities[i].x, this.cities[i].y);
                    this.ctx.lineTo(this.cities[j].x, this.cities[j].y);
                    this.ctx.stroke();
                }
            }
        }

        // Draw current path
        if (this.currentPath.length > 0) {
            this.ctx.strokeStyle = '#20c997';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            const firstCity = this.cities[this.currentPath[0]];
            this.ctx.moveTo(firstCity.x, firstCity.y);

            for (let i = 1; i < this.currentPath.length; i++) {
                const city = this.cities[this.currentPath[i]];
                this.ctx.lineTo(city.x, city.y);
            }

            // If path is complete, connect back to start
            if (this.currentPath.length === this.cities.length) {
                const lastCity = this.currentPath[this.currentPath.length - 1];
                if (this.distances[lastCity][this.currentPath[0]] !== Infinity) {
                    this.ctx.lineTo(firstCity.x, firstCity.y);
                }
            }
            this.ctx.stroke();
        }

        // Draw cities
        for (let i = 0; i < this.cities.length; i++) {
            const city = this.cities[i];
            
            // Draw city circle
            this.ctx.beginPath();
            this.ctx.arc(city.x, city.y, 15, 0, Math.PI * 2);
            this.ctx.fillStyle = this.currentPath.includes(i) ? '#20c997' : '#ffffff';
            this.ctx.fill();
            this.ctx.strokeStyle = '#2d3748';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw city label
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(city.label, city.x, city.y);
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new TSPGame();
});