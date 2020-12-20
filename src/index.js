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

const con = require('electron').remote.getGlobal('console')

const strMapObject = 'map'
const tmpPoiImgURL = './img/tmp_newPoi.svg'

const layerMapbox = {
    'url': 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
    'attribution': 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors,'+
	'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    'maxZoom': 18,
    'id': 'ceramicmug/cke7lvu382bhs19o4l2aev08b', // geonotebook style
    'tileSize': 512,
    'zoomOffset': -1,
    'accessToken': 'pk.eyJ1IjoiY2VyYW1pY211ZyIsImEiOiJja2U3bGxxaDAxbzE2MzFzempsb3Jkam9kIn0.BJX4awVLutkNLqHahwJOEw'
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

let iconList =  config["iconList"]
let iconURLs = new Array(iconList.length)

for (i=0; i<iconList.length; i++){
    iconURLs[i] = iconDir+twemoji.convert.toCodePoint(iconList[i]).toUpperCase()+'.svg'
    iconURLs[i] = iconURLs[i].replace("-FE0F","")
}

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

// Convert title, description, and latlng coords to properly formatted html
// for popup
function popupText(t,d,c) {
    return '<form id=\"titleForm\"><input maxlength=\"20\" type=\"text\" class=\"popupTitle\" id=\"'+c+'\" value=\"'+t+'\" /></form>'+'<i>'+d+'</i><br><code>'+c+'</code>'
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

markerLayer = L.featureGroup().addTo(map)

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
        iconSize: [ICONSIZE, ICONSIZE]
    })
    // create the marker and add it to the map
    let m = L.marker(
        poi['geometry']['coordinates'],
        {
            icon : icon,
            attribution : i
        }
    )
    m.bindPopup(popupText(
        poi['properties']['title'],
        poi['properties']['description'],
        poi['geometry']['coordinates']
    ))
    markerLayer.addLayer(m);
    L.DomUtil.addClass(m._icon, 'poiMarker');
}

// Edit title of marker from popup
markerLayer.on("click", function (event) {
    var clickedMarker = event.layer;
    document.getElementById('titleForm').onsubmit = function() { 
        let coords = clickedMarker.getLatLng()
        coords = coords.lat+','+coords.lng
        let newTitle = document.getElementById(coords).value
        console.log(clickedMarker.getAttribution())
        return false //TODO found bug where if one is clicked and then another is clicked, the second doesnt return properly
    };
    return false
    // do some stuff…
});

// listen for clicks on the map and add POI
document.addEventListener('click', map.on('click', onMapClick))

// On map click:
//      (1) Present user with menu of icons (leaflet popup)
//      (2.1) if icon click, add to map and prompt user for title and description
//      (2.2) else close popup (user clicks back to map)
function onMapClick(e) {

    // HTML container for menu 
    let container = document.createElement("div");

    // Build icon string from config list
    let iconString = "<div id=\"iconTable\" sandbox=\"allow-same-origin allow-scripts allow-popups allow-forms\"><table>"
    let iconListLen = iconList.length

    // Build as table with IDs the path to icons
    for (i=0; i<iconListLen; i++){
        if(i % 5 == 0){
            iconString += "<tr>"
        }
        iconString += "<td>" // start table element
        iconString += "<form id=\""
        iconString += iconURLs[i]
        iconString += "\"><img id=\""
        iconString += iconURLs[i] // link
        iconString += "\" class=\"iconPick\" src=\""
        iconString += iconURLs[i]
         iconString += "\" width=\"30\"></img>"
        iconString += "</td>" // end table element
        if((i % 5 == 4) && (i != iconListLen-1)){
            iconString += "</tr>"
        }
    }
    iconString += "</tr>"
    iconString += "</table></div>"
    
    // add HTML to container
    container.innerHTML = iconString

    // create the popup
    var popup = L.popup()
    .setLatLng(e.latlng)
    .setContent(container)
    .openOn(map);

    // scroll to center new popup
    map.setView(e.latlng, map.getZoom(), { // center view
        "animate": true,
        "pan": {
          "duration": 0.5
        }
      });

    let newIconSize = ICONSIZE * (map.getZoom()/13)**1.5
    // if an icon is clicked, add it to the map
    container.onclick = function(s) {
        var target = s.target
        let icon = L.icon({
            iconUrl: target.id,
            iconSize: [newIconSize, newIconSize]
        })
        // create the marker and add it to the map
        let m = L.marker(
            e.latlng,
            {icon : icon}
        ).addTo(map)
        L.DomUtil.addClass(m._icon, 'poiMarker');
        map.closePopup()
        // TODO: Prompt user to add name and description and
        //       save to pois.geojson
    }
}

map.on('zoomend', function() {
    var poiMarkers = document.getElementsByClassName('poiMarker');
    var newzoom = '' + (ICONSIZE * (map.getZoom()/13)**1.5) +'px';
    for (var i in poiMarkers) {
        poiMarkers[i].style["width"]=newzoom;
        poiMarkers[i].style["height"]=newzoom;
    }
});

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