/* imports */
const L = require('leaflet');
const twemoji = require('twemoji');
const fs = require('fs');
const { ipcRenderer, app } = require('electron');
var glob = require("glob");

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

let poisDict = {}

///////// FUNCTIONS //////////

// Get current date and return as string.
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
    return '<button type=\"button\" class=\"popupButton\" id=\"'+c+'_popupDeleteButton\">🗑</button><button type=\"button\" class=\"popupButton\" id=\"'+c+'_popupBlogButton\">ℹ️</button><br><span type=\"text\" class=\"popupTitle\" id=\"'+c+'_title\" contenteditable>'+t+'</span><br><span type=\"text\" class=\"popupDescription\" id=\"'+c+'_description\"  contenteditable>'+d+'</span><br><code>'+c+'</code>'
}

function poiBlogHeaderText(t,d,c) {
    return '<span type=\"text\" class=\"popupTitle\" id=\"'+c+'_title\">'+t+'</span><br><span type=\"text\" class=\"popupDescription\" id=\"'+c+'_description\">'+d+'</span><br><code>'+c+'</code>'
}

/* ************* RENDERER PROCESS  ************** */

/* create the map */
var map = L.map(strMapObject, {attributionControl: true}, {
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
        }
    )
    poisDict[poi['geometry']['coordinates']] = i
    m.bindPopup(popupText(
        poi['properties']['title'],
        poi['properties']['description'],
        poi['geometry']['coordinates']
    ))
    markerLayer.addLayer(m);
    L.DomUtil.addClass(m._icon, 'poiMarker');
}

// Drawer sliding up from bottom to hold poi blog
poiBlogContainer = document.getElementById("poiBlogContainer")
poiPostContainer = document.getElementById("poiBlogPost")

function poiBlog(coords) {

    folder = './poi/'+coords
    if (!fs.existsSync(folder)) {
        fs.mkdir(folder, function() {});
    }
    posts = glob(folder+"/*.md")
    poiBlogContainer.innerHTML += '<button type=\"button\" class=\"blogButton\" id=\"'+coords+'_blogAddPostButton\">Add post</button>'
    document.getElementById(coords+'_blogAddPostButton').addEventListener('click', function() {
        date = datestring()
        file = fs.open(folder+'/'+date+Date().getHours()+Date().getMinutes()+'.md')
        var simplemde = new SimpleMDE({ element: poiPostContainer });
        poiPostContainer.style.height = "80\%"
    })
}

// POPUP EDITING
markerLayer.on("click", function (event) {
    var clickedMarker = event.layer;
    let coords = clickedMarker.getLatLng()
    coords = coords.lat+','+coords.lng

    document.getElementById(coords+'_popupDeleteButton').addEventListener(type='click', function() {
        // delete from map
        markerLayer.removeLayer(clickedMarker)
        pois.features.splice(poisDict[coords],1)
        poiLen -= 1
        fs.writeFileSync(poiFile, JSON.stringify(pois));
        return false
    })

    document.getElementById(coords+'_popupBlogButton').addEventListener(type='click', function() {
       // scroll POI blog up to cover window
        poiBlogContainer.style.height="100\%"
        // TODO
        htmlString = '<div id=\"poiBlogHeader\">'
        htmlString += '<br>'
        htmlString += '<div class=\"poiBlogImgDiv\">'
        htmlString += '<img src=\"' + clickedMarker.options.icon.options.iconUrl + '\" style=\"height:70pt\">'
        htmlString += '</div>'
        htmlString += '<div class=\"poiBlogTitleDiv\">'
        htmlString += poiBlogHeaderText(pois.features[poisDict[coords]]['properties']['title'], pois.features[poisDict[coords]]['properties']['description'], coords)
        htmlString += '</div></div><br><hr>'
        poiBlogContainer.innerHTML += htmlString
        poiBlog(coords)
    })
    
    document.getElementById(coords+'_title').addEventListener(type='keydown', function(e) {
        if (e.code == 'Enter') {
            e.preventDefault()
            let newTitle = document.getElementById(coords+'_title').textContent 
            let newDescription = document.getElementById(coords+'_description').textContent
            i = poisDict[coords]
            pois.features[i]['properties']['title'] = newTitle;
            pois.features[i]['properties']['description'] = newDescription;
            clickedMarker.unbindPopup()
            clickedMarker.bindPopup(popupText(
                pois.features[i]['properties']['title'],
                pois.features[i]['properties']['description'],
                pois.features[i]['geometry']['coordinates']
            ))
            fs.writeFileSync(poiFile, JSON.stringify(pois));
            map.closePopup()
            return false;
        }
    })

    document.getElementById(coords+'_description').addEventListener(type='keydown', function(e) {
        if (e.code == 'Enter') {
            console.log(e)
            e.preventDefault()
            let newTitle = document.getElementById(coords+'_title').textContent 
            let newDescription = document.getElementById(coords+'_description').textContent 
            i = poisDict[coords]
            pois.features[i]['properties']['title'] = newTitle;
            pois.features[i]['properties']['description'] = newDescription;
            clickedMarker.unbindPopup()
            pop = clickedMarker.bindPopup(popupText(
                pois.features[i]['properties']['title'],
                pois.features[i]['properties']['description'],
                pois.features[i]['geometry']['coordinates']
            ))
            fs.writeFileSync(poiFile, JSON.stringify(pois));
            map.closePopup()
            return false;
        };
    })

    return false
});


// Switch to blogging window
markerLayer.on("dblclick", function (event) {
    var clickedMarker = event.layer;
    console.log(clickedMarker)
})

//do something when app is closing
ipcRenderer.on('handle exit', function() {
    // overwrite geojson
    let poisString = JSON.stringify(pois)
    console.log(poisString)
    fs.writeFile(poiFile, poisString)
    return 0;
})

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
    L.popup()
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
        map.closePopup()
        var target = s.target
        let icon = L.icon({
            iconUrl: target.id,
            iconSize: [newIconSize, newIconSize]
        })
        // add new feature to pois and write to JSON
        poiLen += 1
        newFeat = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [e.latlng.lat, e.latlng.lng]
            },
            "properties": {
                "title": "Untitled",
                "description": "description...",
                "categories": [],
                "made": datestring(),
                "edited": datestring(),
                "icon": twemoji.convert.fromCodePoint(target.id.match('.*/(.*).svg')[1])
            }
        }
        pois.features.push(newFeat)
        fs.writeFileSync(poiFile, JSON.stringify(pois));
        var popup = L.popup()
        .setLatLng(e.latlng)
        .setContent(popupText(
            'Enter title...',
            'Enter description...',
            e.latlng.lat+','+e.latlng.lng
        ))
        // create the marker and add it to the map
        let m = L.marker(
            e.latlng,
            {icon : icon}
        ).addTo(map)
        poisDict[e.latlng.lat+','+e.latlng.lng] = poiLen - 1
        m.bindPopup(popup)
        markerLayer.addLayer(m);
        map.openPopup(popup)
        markerLayer.fire('click', {
            layer: m
        })
        L.DomUtil.addClass(m._icon, 'poiMarker');
        // TODO: Prompt user to add name and description and
        //       save to pois.geojson
    }
} // TODO: Bug when marker not chosen and start to zoom, zoom looks for undefined

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

// Close blog containier

function closePoiBlogContainer() {
    poiBlogContainer.innerHTML =  '<button class=\"closeButton\" onclick=\"closePoiBlogContainer(this)\">Return to map</button>'
    poiBlogContainer.style.height="0"
}