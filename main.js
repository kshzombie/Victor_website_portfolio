// 1. Initialize Map
let subLayer, potLayer, currentLegend;
const map = L.map('map').setView([-1.286, 36.9], 11);

// Selectors
const projectSelector = document.getElementById('project-selector');
const infoBox = document.getElementById('project-description');

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO'
}).addTo(map);

// 2. Setup Coordinate Display
const coordDiv = document.createElement('div');
coordDiv.id = 'coords';
coordDiv.className = 'coordinate-display';
coordDiv.innerHTML = '<span class="coord-label">LAT:</span> 0.0000 | <span class="coord-label">LNG:</span> 0.0000';
document.getElementById('map').appendChild(coordDiv);

map.on('mousemove', (e) => {
    document.getElementById('coords').innerHTML = 
        `<span class="coord-label">LAT:</span> ${e.latlng.lat.toFixed(4)} | <span class="coord-label">LNG:</span> ${e.latlng.lng.toFixed(4)}`;
});

// 3. Sidebar Resizer
document.addEventListener('DOMContentLoaded', () => {
    const resizer = document.getElementById('resizer');
    const sidebar = document.getElementById('sidebar');
    const mapContainer = document.getElementById('map');

    if (resizer && sidebar) {
        let isDragging = false;
        resizer.addEventListener('mousedown', () => {
            isDragging = true;
            document.body.style.cursor = 'col-resize';
            mapContainer.style.pointerEvents = 'none';
        });
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let newWidth = e.clientX;
            if (newWidth > 250 && newWidth < window.innerWidth * 0.8) {
                sidebar.style.width = newWidth + 'px';
                map.invalidateSize();
            }
        });
        window.addEventListener('mouseup', () => {
            isDragging = false;
            document.body.style.cursor = 'default';
            mapContainer.style.pointerEvents = 'auto';
            map.invalidateSize();
        });
    }
});

// 4. Content & Data Definitions
const projectDetails = {
    subcounties: "Nairobi Pothole Monitoring: Visualizing infrastructure health across sub-counties. Red markers indicate high-priority road defects.",
    "qgis-map": "QGIS Earthquake Analysis: A static cartographic export displaying global seismic activity and intensity clusters.",
    "population-density": "NYC Population Density: A thematic map generated in QGIS using census tract data."
};

const qgisProjects = {
    "qgis-map": {
        url: "data/10_largest_earthquakes.png",
        caption: "Skill: Importing data layers, applying symbology, adding labels and designing layouts for maps using QGIS"
    },
    "population-density": {
        url: "data/nyc_population_density.png",
        caption: "Skill: Making thematic maps using QGIS"
    }
};

const geeProjects = {
    "expressway2":{
        url: "data/expressway2.mp4",
        caption: "Skills: Making fly-over videos using Google Earth Studio",
        type: "video"
    },
    "edinburgh-castle":{
        url: "data/edinburgh_castle_project.mp4",
        caption: "Skills: Making fly-over videos using Google Earth Studio",
        type: "video"
    },
    "golden-gate-bridge":{
        url: "data/golden_gate_bridge_project.mp4",
        caption: "Skills: Making fly-over videos using Google Earth Engine",
        type: "video"
    }
};

// 5. Updated Project Selector Logic
projectSelector.addEventListener('change', function(e) {
    const val = e.target.value;
    const selectedOption = e.target.options[e.target.selectedIndex];

    const vImg = document.getElementById('viewer-img');
    const vVid = document.getElementById('viewer-video');
    const viewer = document.getElementById('image-viewer');
    const vCap = document.getElementById('viewer-caption');

    // Reset State
    if (subLayer) map.removeLayer(subLayer);
    if (potLayer) map.removeLayer(potLayer);
    if (currentLegend) map.removeControl(currentLegend);
    
    if (vImg) vImg.style.display = 'none';
    if (vVid) {
        vVid.style.display = 'none';
        vVid.pause();
    }

    // CASE A: GEE Project
    if (typeof geeProjects !== 'undefined' && geeProjects[val]) {
        const project = geeProjects[val];
        if (project.type === "video") {
            vVid.style.display = 'block';
            vVid.src = project.url;
            vVid.load();
            vVid.play().catch(err => console.log("Autoplay prevented:", err));
        } else {
            vImg.style.display = 'block';
            vImg.src = project.url;
        }
        vCap.innerText = project.caption;
        viewer.style.display = 'flex';
        projectSelector.value = "default";
    } 
    // CASE B: QGIS Project
    else if (typeof qgisProjects !== 'undefined' && qgisProjects[val]) {
        vImg.style.display = 'block';
        vImg.src = qgisProjects[val].url;
        vCap.innerText = qgisProjects[val].caption;
        viewer.style.display = 'flex';
        projectSelector.value = "default";
    }
    // CASE C: Leaflet Map
    else if (val !== "default" && selectedOption.dataset.bounds) {
        const bounds = JSON.parse(selectedOption.dataset.bounds);
        map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
        
        if (val === 'subcounties') {
            if (subLayer) subLayer.addTo(map);
            if (potLayer) potLayer.addTo(map);
            if (typeof addLegend === 'function') {
                currentLegend = addLegend();
                currentLegend.addTo(map);
            }
        }
        infoBox.innerHTML = `<p>${projectDetails[val] || "Analysis loaded."}</p>`;
    }
});

// 6. Legend & Data Loading (Same as your original code)
function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'legend');
        div.innerHTML = `<h4>Pothole Data</h4>
            <i style="background: #3498db; width:10px; height:10px; display:inline-block"></i> Boundary<br>
            <i style="background: #ff4757; width:10px; height:10px; display:inline-block; border-radius:50%"></i> Pothole`;
        return div;
    };
    return legend;
}

async function loadData() {
    try {
        const [subRes, potRes] = await Promise.all([
            fetch('data/subcounties.geojson'),
            fetch('data/potholes.geojson')
        ]);
        const subData = await subRes.json();
        const potData = await potRes.json();

        subLayer = L.geoJSON(subData, { 
            style: { fillColor: "#3498db", weight: 1.5, color: 'white', fillOpacity: 0.1 },
            onEachFeature: (f, l) => l.bindPopup(`Sub-County: ${f.properties.NAME}`)
        });

        potLayer = L.geoJSON(potData, {
            pointToLayer: (f, latlng) => L.circleMarker(latlng, {
                radius: 6, fillColor: "#ff4757", color: "#fff", weight: 1, fillOpacity: 0.9
            })
        });
    } catch (err) { console.error("Load error:", err); }
}
loadData();

// 8. Robust Viewer Exit Logic
document.addEventListener('DOMContentLoaded', () => {
    const viewer = document.getElementById('image-viewer');
    const closeBtn = document.querySelector('.close-viewer');

    if (viewer && closeBtn) {
        const closeViewer = () => {
            const vVid = document.getElementById('viewer-video');
            viewer.style.display = 'none';
            if (vVid) { vVid.pause(); vVid.src = ""; }
        };
        closeBtn.onclick = closeViewer;
        viewer.onclick = (e) => { if (e.target === viewer) closeViewer(); };
        document.addEventListener('keydown', (e) => {
            if (e.key === "Escape" && viewer.style.display === 'flex') closeViewer();
        });
    }
});