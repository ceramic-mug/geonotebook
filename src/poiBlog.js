const twemoji = require('twemoji');
const fs = require('fs');
const { ipcRenderer, app, ipcMain } = require('electron');

document.getElementById('back to map').addEventListener(type='click', function() {
    ipcRenderer.sendSync('load map')
})