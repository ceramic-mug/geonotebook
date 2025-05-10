document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variables ---
    let map;
    let locations = []; // Array to store our location objects
    let markersLayer = L.layerGroup(); // Layer group to manage markers for easy clearing

    // DOM Elements
    const modal = document.getElementById('notebookModal');
    const closeModalButton = document.querySelector('.close-button');
    const saveNotebookButton = document.getElementById('saveNotebookButton');
    const locationIdInput = document.getElementById('locationId');
    const locationEmojiInput = document.getElementById('locationEmoji');
    const locationTitleInput = document.getElementById('locationTitle');
    const locationDescriptionInput = document.getElementById('locationDescription');
    const locationMarkdownInput = document.getElementById('locationMarkdown');
    const markdownPreview = document.getElementById('markdownPreview');
    const searchInput = document.getElementById('searchInput');
    const saveStartView = document.getElementById('saveMapViewButton')

    // --- Initialize Application ---
    function init() {
        setupMap();
        loadLocationsFromLocalStorage();
        renderMarkers();
        setupEventListeners();
    }

    // --- Map Setup ---
    function setupMap() {

        // User's saved map center choice
        const savedMapCenter = localStorage.getItem('mapCenter');
        if (savedMapCenter) {
            mapCenter = JSON.parse(savedMapCenter)
        } else {
            mapCenter = [39, -97] // center of USA
        }
        // and zoom
        const savedMapZoom = localStorage.getItem('mapZoom')
        if (savedMapZoom) {
            mapZoom = JSON.parse(savedMapZoom);
        } else {
            mapZoom = 4 // visualize all of USA
        }

        // Initialize the map and set its view to a default location and zoom
        // TODO: allow the user to customize their center
        map = L.map('map').setView(mapCenter, mapZoom); // Centered globally, adjust as needed

        // Define Tile Layers
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        });

        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });

        // Add the default layer (satellite) to the map
        satelliteLayer.addTo(map);
        markersLayer.addTo(map); // Add marker layer group to map

        // ************************ //
        // DEBUGGING CONSOLE OUTPUT //
        console.info("Got here")

        // Layer control
        const baseMaps = {
            "Satellite": satelliteLayer,
            "OpenStreetMap": osmLayer
        };
        L.control.layers(baseMaps).addTo(map);

        // Event listener for map clicks to add new locations
        map.on('click', onMapClick);
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        closeModalButton.addEventListener('click', closeModal);
        saveNotebookButton.addEventListener('click', handleSaveNotebook);
        saveStartView.addEventListener('click', handleSaveStartView);
        
        // Live Markdown preview
        locationMarkdownInput.addEventListener('input', (e) => {
            // Use `marked.parse()` if `marked.js` is loaded
            if (window.marked) {
                markdownPreview.innerHTML = marked.parse(e.target.value);
            } else {
                markdownPreview.textContent = "Markdown preview (Marked.js not loaded)";
            }
        });

        // Search functionality
        searchInput.addEventListener('input', handleSearch);

        // Close modal if user clicks outside of it
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    // --- Map Interaction ---
    function onMapClick(e) {
        // For a new location, clear ID and open modal
        // The actual location data will be created upon saving the notebook
        openNotebookModal(null, e.latlng); // Pass latlng for the new marker
    }

    // --- Notebook Modal Logic ---
    function openNotebookModal(locationData = null, latlng = null) {
        // Reset form
        locationIdInput.value = '';
        locationEmojiInput.value = '📌'; // Default emoji
        locationTitleInput.value = '';
        locationDescriptionInput.value = '';
        locationMarkdownInput.value = '';
        markdownPreview.innerHTML = ''; // Clear preview

        if (locationData) {
            // Editing an existing location
            document.getElementById('modalTitle').textContent = locationData.title;
            locationIdInput.value = locationData.id;
            locationEmojiInput.value = locationData.emoji;
            locationTitleInput.value = locationData.title;
            locationDescriptionInput.value = locationData.description;
            locationMarkdownInput.value = locationData.markdownText;
            if (window.marked) { // Update preview
                markdownPreview.innerHTML = marked.parse(locationData.markdownText);
            }
        } else if (latlng) {
            // Adding a new location, store latlng temporarily
            document.getElementById('modalTitle').textContent = "New Notebook Entry";
            // Store latlng on a temporary attribute of the save button or modal itself
            // This is a bit of a hack for simplicity; a more robust state mgt might be better for complex apps
            saveNotebookButton.dataset.lat = latlng.lat;
            saveNotebookButton.dataset.lng = latlng.lng;
        }
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
        // Clear temporary latlng if it exists
        delete saveNotebookButton.dataset.lat;
        delete saveNotebookButton.dataset.lng;
    }

    function handleSaveNotebook() {
        const id = locationIdInput.value;
        const emoji = locationEmojiInput.value.trim() || '📍'; // Default if empty
        const title = locationTitleInput.value.trim();
        const description = locationDescriptionInput.value.trim();
        const markdownText = locationMarkdownInput.value;

        // Basic validation
        if (!title) {
            alert('Please enter a title for the location.');
            return;
        }

        let lat, lng;
        if (id) { // Editing existing
            const existingLocation = locations.find(loc => loc.id.toString() === id);
            if (existingLocation) {
                lat = existingLocation.lat;
                lng = existingLocation.lng;
            }
        } else { // New location
            lat = parseFloat(saveNotebookButton.dataset.lat);
            lng = parseFloat(saveNotebookButton.dataset.lng);
        }

        if (isNaN(lat) || isNaN(lng)) {
            // This might happen if dataset attributes were not set (e.g., modal opened not from map click)
            // Or if trying to save an "edit" that somehow lost its original lat/lng.
            // For a boilerplate, alert and return. In a real app, handle more gracefully.
            alert('Could not determine location coordinates. Please try adding the marker again.');
            return;
        }

        const locationData = {
            id: id || Date.now(), // Use existing ID or generate a new one
            lat: lat,
            lng: lng,
            emoji: emoji,
            title: title,
            description: description,
            markdownText: markdownText
        };

        addOrUpdateLocation(locationData);
        saveLocationsToLocalStorage();
        renderMarkers();
        closeModal();
    }


    // --- Location Data Management ---
    function addOrUpdateLocation(locationData) {
        const existingIndex = locations.findIndex(loc => loc.id.toString() === locationData.id.toString());
        if (existingIndex > -1) {
            locations[existingIndex] = locationData; // Update existing
        } else {
            locations.push(locationData); // Add new
        }
    }

    function saveLocationsToLocalStorage() {
        localStorage.setItem('geoNotebookLocations', JSON.stringify(locations));
    }

    function loadLocationsFromLocalStorage() {
        const savedLocations = localStorage.getItem('geoNotebookLocations');
        if (savedLocations) {
            locations = JSON.parse(savedLocations);
        }
    }

    function renderMarkers(filteredLocations = null) {
        markersLayer.clearLayers(); // Clear existing markers from the layer group

        const locationsToRender = filteredLocations || locations;

        locationsToRender.forEach(location => {
            // Create a custom DivIcon with the emoji
            const emojiIcon = L.divIcon({
                html: `<span class="emoji-marker-icon">${location.emoji}</span>`,
                className: '', // No default Leaflet icon background/border
                iconSize: [24, 24], // Adjust size as needed
                iconAnchor: [12, 12] // Center the icon on the coordinate
            });

            const marker = L.marker([location.lat, location.lng], { icon: emojiIcon });
            
            // Tooltip for hover
            marker.bindTooltip(`<b>${location.title}</b><br>${location.description || 'Click to see notes'}`);
            
            // Click event to open notebook
            marker.on('click', () => {
                openNotebookModal(location);
            });
            
            markersLayer.addLayer(marker); // Add marker to the layer group
        });
    }

    // --- Search Functionality ---
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();

        if (!searchTerm) {
            renderMarkers(); // If search is empty, show all markers
            return;
        }

        const filtered = locations.filter(location => {
            return (
                location.title.toLowerCase().includes(searchTerm) ||
                location.description.toLowerCase().includes(searchTerm) ||
                location.emoji.includes(searchTerm) || // Emoji search
                location.markdownText.toLowerCase().includes(searchTerm)
            );
        });
        renderMarkers(filtered);
    }

    // --- Set Start Center and Zoom --- //
    function handleSaveStartView() {
        const center = map.getCenter()
        const zoom = map.getZoom()
        localStorage.setItem('mapCenter', JSON.stringify([center.lat, center.lng]))
        localStorage.setItem('mapZoom', zoom)
    }

    // --- Start the app ---
    init();
});