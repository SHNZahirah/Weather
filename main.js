const { app, BrowserWindow, ipcMain } = require('electron');//dengar mesej dari renderer
const path = require('path');// handle path fail
const fs = require('fs');

let mainWindow;
let itineraryWindow;

function createMainWindow() { //function to create main window
  mainWindow = new BrowserWindow({
    width: 2000,
    height: 950,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile('renderer/index.html');// load homepage
}//function main window

function createItineraryWindow(city) {  //function to create itinerary window
  itineraryWindow = new BrowserWindow({
    width: 1000,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  itineraryWindow.loadFile('renderer/itinerary.html');// load homepage

  // Hantar city ke itinerary bila siap load
  itineraryWindow.webContents.on('did-finish-load', () => {
    itineraryWindow.webContents.send('city-selected', city);
  });
}

ipcMain.on("open-view-window", () => { //function view
  const viewWindow = new BrowserWindow({
    width: 600,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  viewWindow.loadFile("renderer/view.html"); // load view.html
});

// Simpan itinerary ke fail JSON
ipcMain.on('save-itinerary', (event, data) => {
  const filePath = path.join(__dirname, 'data', 'itineraries.json');
  let itineraries = [];

  if (fs.existsSync(filePath)) {  // kalau fail wujud, baca existed data
    itineraries = JSON.parse(fs.readFileSync(filePath));
  }

  itineraries.push(data);// tambah data baru
  fs.writeFileSync(filePath, JSON.stringify(itineraries, null, 2));
});

ipcMain.handle('load-itineraries', () => {
  const filePath = path.join(__dirname, 'data', 'itineraries.json');

  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath)); // return data
  } else {
    return []; // No file means no data yet
  }
});

// Update itinerary ikut index
ipcMain.handle('update-itinerary', async (event, { index, newDate, newNotes, newRecommend, newReason }) => {
  console.log("Update request received:", index, newDate, newNotes, newRecommend, newReason);
  const filePath = path.join(__dirname, 'data', 'itineraries.json');
  if (!fs.existsSync(filePath)) return { success: false };

  let itineraries = JSON.parse(fs.readFileSync(filePath));
  if (itineraries[index]) {
    itineraries[index].date = newDate;
    itineraries[index].notes = newNotes;
    itineraries[index].recommendation = newRecommend;
    itineraries[index].reason = newReason;

    fs.writeFileSync(filePath, JSON.stringify(itineraries, null, 2));
    return { success: true, updated: itineraries[index] };
  }
  return { success: false };// kalau index tak wujud
});

// Delete itinerary
ipcMain.on('delete-itinerary', (event, index) => {
  const filePath = path.join(__dirname, 'data', 'itineraries.json');
  if (!fs.existsSync(filePath)) return;

  let itineraries = JSON.parse(fs.readFileSync(filePath));
  if (itineraries[index]) {
    itineraries.splice(index, 1);
    fs.writeFileSync(filePath, JSON.stringify(itineraries, null, 2)); // simpan semula
  }
});

//back to home
ipcMain.on("open-home", () => {
  console.log("Back to home triggered"); // mesti keluar dalam terminal
  if (itineraryWindow) {
    itineraryWindow.close();// tutup itinerary window
    itineraryWindow = null;
  }
  if (mainWindow) {
    mainWindow.show(); // tunjuk main window
  } else {
    createMainWindow();
  }
});

// Buka itinerary dari main page
ipcMain.on('open-itinerary-window', (event, city) => {
  createItineraryWindow(city);
});// listen to message


app.whenReady().then(createMainWindow);//main program