/* Import electron framework */
const { app, BrowserWindow, ipcMain, remote } = require("electron")

/* File-system interaction for reading/writing
   place files and navigating directories */
const fs = require("fs")

// Create the main window
function createWindow() {
    const mainWinHeight = 700
    const mainWinWidth = 800
    console.info("Window height: %d", mainWinHeight);
    console.info("Window width: %d", mainWinWidth);
    const MainWin = new BrowserWindow({
	width: mainWinWidth,
	height: mainWinHeight,
	frame: true,
	webPreferences: {
	    nodeIntegration: true
	}
    })

    // load index.html of app
    MainWin.loadFile('index.html')
}

/* ********* STARTUP ********* */

// wait until the app starts, then load the main window
app.whenReady().then(createWindow)
console.info("Main window created.")

// create a folder to hold pois if note already created
if (!fs.existsSync('./poi')) {fs.mkdir('./poi', function() {})}

// read through the poi folder and add all saved pois to map
ipcMain.on('load-pois', function(event) {
    console.log('Loading Pois from Main Process')
    fs.readdir('./poi/', function (err, folders) {
	if (err) {
	    return console.log('Unable to scan poi direcory: ' + err)
	}
	var pois = []
	folders.forEach(function (folder) {
	    dir = './poi/'+folder+'/'
	    file = dir + 'head.txt'

	    // send the file back for processing
	    pois.push(file)
	})
	event.returnValue = pois
	})})

	/* ********************** */

/* ******* POI Map Interactions ******* */
ipcMain.on('map-click', function(event) {
	console.log('Map clicked. Enter name for new POI or return NULL');
	const nameWinHeight = 100;
	const nameWinWidth = 600;
	var nameWin = new BrowserWindow({
		width: nameWinWidth,
		height: nameWinHeight,
		frame: false
	})
	nameWin.loadFile('./src/nameWin.html')
})