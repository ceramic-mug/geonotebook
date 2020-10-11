/* imports */
const L = require('leaflet');
const fs = require('fs');
const { ipcRenderer } = require('electron');

/* ******** Constants ********* */

const strMapObject = 'map'

const layerMapbox = {
    'url': 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
    'attribution': 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors,'+
	'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    'maxZoom': 18,
    'id': 'mapbox/streets-v11',
    'tileSize': 512,
    'zoomOffset': -1,
    'accessToken': 'pk.eyJ1IjoiY2VyYW1pY211ZyIsImEiOiJja2U3bG9nZngxbzN0MnhudDY0cjcxdmtuIn0.xIox5D1GCX_Sy-7ARCFtBg'
};

const layer = {
    'mapbox' : layerMapbox
};

const intComfyZoom = 13;

/* structures */

/*
   coords: Holds application-state coordinates, such as
   for the location of the map on startup.
*/
var coords = {
    'start' : [38.4192, -82.4452]
};

/* ************* REGEX ************* */

/* gobs coords from leaflet coord pair */
var reHead = /title: (.*)\ncoords: (.*),(.*)\ndate: (.*)/

///////// FUNCTIONS //////////

// No arguments. Return yyyy-mm-dd string
function datestring() {
    // create a datestring to add to the popup
    date = new Date();

    yr = date.getFullYear();
    mon = date.getMonth()+1;
    dy = date.getDate();

    return yr + '-' + mon + '-' + dy
}

// When map is clicked, create a popup with the coordinates of the click and date of click
// function onMapClick(e) {

//     ll = e.latlng.toString().replace('LatLng(','').replace(')','')

//     var marker = L.marker(e.latlng).addTo(map);

//     marker.bindPopup(popupText(name,datestring(),ll)).openPopup();
// }

function onMapClick(e) {
    ipcRenderer.sendSync('map-click')
}

function popupText(t,d,c) {
    return "<h1>"+t+"</h1>"+'<i>'+d+'</i><br><code>'+c+'</code>'
}

/* ************* RENDERER PROCESS  ************** */

/* create the map */
var map = L.map(strMapObject).setView(coords['start'], intComfyZoom);
L.tileLayer(layer['mapbox']['url'], {
    attribution: layer['mapbox']['attribution'],
    maxZoom: layer['mapbox']['maxZoom'],
    id: layer['mapbox']['id'],
    tileSize: layer['mapbox']['tileSize'],
    zoomOffset: layer['mapbox']['zoomOffset'],
    accessToken: layer['mapbox']['accessToken']
}).addTo(map);


// add saved pois to map
pois = ipcRenderer.sendSync('load-pois')

// iterate through returned list of files
pois.forEach( function (file) {

    // read the file, root out errors, and place it on the map with popup info
    fs.readFile(file, 'utf8', function(err, data) {
	if (err) {
	    return console.log(err)
	}

	// call regular expression on the contents of the header file
	info = reHead.exec(data)
	var latlng = L.latLng(info[2],info[3])
	var title = reHead.exec(data)[1]
	var date = reHead.exec(data)[4]

	// Set marker and add text to popup
	var marker = L.marker(latlng).addTo(map)
	ll = latlng.toString().replace('LatLng(','').replace(')','')
	marker.bindPopup(popupText(title,date,ll));

    })
})

// listen for clicks on the map and add POI
document.addEventListener('click', map.on('click', onMapClick))

// Managing sidebar actions

sidebarButton = document.getElementById("sidebarButton")
sidebar =  document.getElementById("sidebar")

sidebarButton.addEventListener("click",openSideBar)

// Opens the sidebar (left)

function openSideBar() {
    sidebar.style.width = "200px";
    sidebarButton.style.marginLeft = "20";
}

// Closes the sidebar

function closeSideBar() {
    sidebar.style.width = "0px";
    sidebarButton.style.marginLeft = "0px";
}