/* imports */
const L = require('leaflet');
const twemoji = require('twemoji');
const fs = require('fs');
const { ipcRenderer, app } = require('electron');

/* ******** Constants ********* */

const configFile = './src/config.json'
const poiFile = './poi/poi.geojson'
const iconDir = './img/svg/'
let config = JSON.parse(fs.readFileSync(configFile)) /* can be edited, update at program shutdown */
let pois = JSON.parse(fs.readFileSync(poiFile)) /* can be edited, update at program shutdown */

const strMapObject = 'map'
const tmpPoiImgURL = './img/tmp_newPoi.svg'

const layerMapbox = {
    'url': 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
    'attribution': 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors,'+
	'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    'maxZoom': 18,
    'id': 'ceramicmug/cke7lvu382bhs19o4l2aev08b',
    'tileSize': 512,
    'zoomOffset': -1,
    // for personal styles
    'accessToken': 'pk.eyJ1IjoiY2VyYW1pY211ZyIsImEiOiJja2U3bGxxaDAxbzE2MzFzempsb3Jkam9kIn0.BJX4awVLutkNLqHahwJOEw'
    // for base mapBox (below)
    // 'accessToken': 'pk.eyJ1IjoiY2VyYW1pY211ZyIsImEiOiJja2U3bG9nZngxbzN0MnhudDY0cjcxdmtuIn0.xIox5D1GCX_Sy-7ARCFtBg'
};//

const layer = {
    'mapbox' : layerMapbox
};

const intComfyZoom = 13;

const ICONSIZE = 50;

const tmpIcon = L.icon({
    iconUrl: tmpPoiImgURL,
    iconSize: [ICONSIZE, ICONSIZE],
    iconAnchor: [ICONSIZE/2, ICONSIZE/2]
})

/* structures */

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

function popupText(t,d,c) {
    return "<h1>"+t+"</h1>"+'<i>'+d+'</i><br><code>'+c+'</code>'
}

/* ************* RENDERER PROCESS  ************** */

/* create the map */
var map = L.map(strMapObject, {
                zoomControl: true
            }).setView(config.startCoords, intComfyZoom);
L.tileLayer(        layer['mapbox']['url'], {
    attribution:    layer['mapbox']['attribution'],
    maxZoom:        layer['mapbox']['maxZoom'],
    id:             layer['mapbox']['id'],
    tileSize:       layer['mapbox']['tileSize'],
    zoomOffset:     layer['mapbox']['zoomOffset'],
    accessToken:    layer['mapbox']['accessToken']
}).addTo(map);

//add zoom control with your options
map.zoomControl.setPosition('topright');

// TODO: use layers instead of adding directly to enable adding/removing/editing markers
// add saved pois to map
let poiLen = pois.features.length;
for (i=0; i < poiLen; i++){
    // get the feature
    let poi = pois.features[i]
    // get the twemoji code for the emoji
    let ic = twemoji.convert.toCodePoint(poi['properties']['icon'])
    // add the '.svg' to it
    let icnUrl = iconDir.concat(ic,'.svg')
    // create the icon object
    let icon = L.icon({
        iconUrl: icnUrl,
        iconSize: [50, 50]
    })
    // create the marker and add it to the map
    let m = L.marker(
        poi['geometry']['coordinates'],
        {icon : icon}
    ).addTo(map)
    m.bindPopup(popupText(
        poi['properties']['title'],
        poi['properties']['description'],
        poi['geometry']['coordinates']
    ))
}

// for getting various emoji codes // TODO: remove for release
console.log(twemoji.convert.toCodePoint('📂'))

// iterate through returned list of files
// pois.forEach( function (file) {

//     // read the file, root out errors, and place it on the map with popup info
//     fs.readFile(file, 'utf8', function(err, data) {
// 	if (err) {
// 	    return console.log(err)
//     }

// 	// call regular expression on the contents of the header file
// 	info = reHead.exec(data)
// 	var latlng = L.latLng(info[2],info[3])
// 	var title = reHead.exec(data)[1]
// 	var date = reHead.exec(data)[4]

// 	// Set marker and add text to popup
// 	var marker = L.marker(latlng).addTo(map)
// 	ll = latlng.toString().replace('LatLng(','').replace(')','')
// 	marker.bindPopup(popupText(title,date,ll));

//     })
// })

// listen for clicks on the map and add POI
document.addEventListener('click', map.on('click', onMapClick))

// On map click:
// (1) center the map to the location of the click
// (2) create a temporary layer on the map visualized as
//     a small rounded box with dashed outline to indicate
//     location of click and temp status
// (3) Prompt user and ask if add location or not
//      -> If yes, add send 'add-poi' to main process
//      -> If no, delete temporary layer and return 0

function onMapClick(e) {
    map.setView(e.latlng, map.getZoom(), { // center view
        "animate": true,
        "pan": {
          "duration": 0.5
        }
      });
    
    // create temporary marker
    curLat = e.latlng.lat
    curLong = e.latlng.long

    // create the icon object
    let tmpIcon = L.icon({
        iconUrl: iconDir.concat(twemoji.convert.toCodePoint(config['defaultIcon']),'.svg'),
        iconSize: [50, 50],
        tooltipAnchor: [0, -10],
    })
    tmpMarker = L.marker(e.latlng, {icon: tmpIcon})
    tmpMarker.addTo(map)

    tmpMarker.bindTooltip(
        e.latlng.toString().replace('LatLng(','').replace(')','') + "<br>",
        {
            permanent: true
        }
    )

    // ipcRenderer.sendSync('map-click')

    // TODO: Conditionally save marker and add title, description, etc.
    //          if save, add marker to poi
    //          CHOOSE ~20 emoji icons
    //          *remember to rewrite pois.geojson at SIGKILL
}

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