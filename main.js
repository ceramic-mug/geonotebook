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
	titleBarStyle: "default",
	webPreferences: {
	    nodeIntegration: true
	}
    })

    // load index.html of app
	MainWin.loadFile('index.html')
	return MainWin
}

/* ********* STARTUP ********* */

// wait until the app starts, then load the main window
MainWin = app.whenReady().then(createWindow)
console.info("Main window created.")

// create a folder to hold pois if note already created
if (!fs.existsSync('./poi')) {
	fs.mkdir('./poi', function() {});
	
}

// Create GeoJson to hold all POIs if not in POI folder





// 	/* ********************** */

// /* ******* POI Map Interactions ******* */
ipcMain.on('map-click', function(event) {
	app.showEmojiPanel();
	// console.log('Map clicked. Enter name for new POI or return NULL');
	// const nameWinHeight = 150;
	// const nameWinWidth = 400;
	// var nameWin = new BrowserWindow({
	// 	width: nameWinWidth,
	// 	height: nameWinHeight,
	// 	frame: false,
	// 	titleBarStyle: "hidden",
	// 	parent: MainWin,
	// 	webPreferences: {
    //         nodeIntegration: true
    //     }
    // })
	// nameWin.loadFile('./src/nameWin.html')
	// ipcMain.on('no-name', nameWin.close)
})