const { ipcRenderer } = require("electron");
const prompt = require("electron-prompt");

/* Renderer Process */

/* 
    Prompt the user to enter a location name.
    
    If name is entered, create a directory with
    a header file in poi directory with name
    and date file convention. Create a head.txt
    file within that directory with
    
    title: <User's text>
    coords: <lat>,<long>
    date: yyyy-m(m)-d(d)

    Add pin to the map with title, latlong,
    and dates in popup.

    If NULL input, close the prompt and return
    to regular map state. No new POI added.
*/

prompt({
    title: 'Location Name',
    label: 'Name:',
    value: 'Enter a location name...',
    type: 'input'
})
.then((r) => {
    if(r === null) {
        console.log('no name given');
        ipcRenderer.sendSync('no-name')
    } else {
        console.log('name', r);
    }
})
.catch(console.error);

// from https://www.npmjs.com/package/electron-prompt