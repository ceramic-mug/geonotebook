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
    MainWin = new BrowserWindow({
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
	MainWin.on('close', function() { //   <---- Catch close event

		// The dialog box below will open, instead of your app closing.
		console.log('closing main window')
		MainWin.webContents.send('handle exit')
	});

}

/* ********* STARTUP ********* */

// wait until the app starts, then load the main window
app.whenReady().then(createWindow)

console.info("Main window created.")

// create a folder to hold pois if note already created
if (!fs.existsSync('./poi')) {
	fs.mkdir('./poi', function() {});
	
}