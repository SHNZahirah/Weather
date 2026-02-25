const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

//HTML plan, button simpan dan view itineraries
const write = document.getElementById('planInput');
const saveBtn = document.getElementById('saveBtn');
const viewItinerariesBtn = document.getElementById('viewItinerariesBtn')

let selectedCity = ''; // simpan choosen bandar
let weatherData = {}; // simpan data weather utk plan skarang

// Class WeatherForecast utk kira suhu & cadangan aktiviti
class WeatherForecast {
  constructor(city, date, maxTemp, minTemp, rainChance, riskRain, windSpeed, condition){
    this.city = city;
    this.date = date;
    this.maxTemp = maxTemp;
    this.minTemp = minTemp;
    this.rainChance = rainChance;
    this.riskRain = riskRain;
    this.windSpeed = windSpeed;
    this.condition = condition;
  }

  // kira suhu purata
  calculateAverageTemp() {
    return ((this.maxTemp + this.minTemp)/2).toFixed(1);
  }

  // cadangan aktiviti ikut cuaca
  recommendActivity() {
    const averageTemp = this.calculateAverageTemp();
    let recommend = "";
    let reason = "";

    if (this.rainChance > 60 || this.riskRain == 1) {
      recommend = "Indoor activities such as museum, café hunt, shopping";
      reason = "High probability of rain detected.";
    } else if (this.windSpeed > 30) {
      recommend = "Indoor activities recommended such as movie marathon, reading, baking";
      reason = "Strong wind may cause safety issues outdoors.";
    } else if (averageTemp > 33) {
      recommend = "Outdoor activity in morning or evening such as fishing, gardening, biking";
      reason = "Temperature is high during daytime."; 
    } else {
      recommend = "Outdoor activities such as park visit, sightseeing, hiking.";
      reason = "Weather is stable with low rain probability.";
    }

    return {recommend, reason};
  }
}

//change depend on current weather
function getWeatherIcon(condition) {
  const iconMap = {
    "Sunny": "sunny.gif",
    "Clear": "sunny.gif",
    "Partly cloudy": "cloudy.gif",
    "Cloudy": "cloudy.gif",
    "Overcast": "cloudy.gif",
    "Patchy rain nearby": "rainy.gif",
    "Light rain": "rainy.gif",
    "Moderate rain": "rainy.gif",
    "Heavy rain": "rainy.gif",
    "Thunderstorm": "thunder.gif"
  };
  return iconMap[condition] || "weather.gif"; // kalau x de icon
}

// fetch choosen city dari main.js
ipcRenderer.on('city-selected', (event, city) => {
  selectedCity = city;
  document.getElementById('title').textContent = `Plan your trip & activities at ${city}`;
});

//event click for chosen date
document.getElementById("next").addEventListener("click", () => {
  const date = document.getElementById("dateInput").value; 
  if (!date) { alert("Please select a date."); return; }

  //fetch API
  fetch(`https://api.weatherapi.com/v1/forecast.json?key=32804b24a847407391c53709241010&q=${selectedCity}&dt=${date}`)
    .then(res => res.json())
    .then(data => {
      const f = data.forecast.forecastday[0].day;
      const weather = new WeatherForecast(selectedCity, date, f.maxtemp_c, f.mintemp_c, f.daily_chance_of_rain, f.daily_will_it_rain, f.maxwind_kph, f.condition.text);
      const average = weather.calculateAverageTemp();
      const activity = weather.recommendActivity();

      //display data
      document.getElementById("weatherInfo").innerHTML = `
        <p><strong>Location</strong>: ${selectedCity}</p>
        <p><strong>Condition</strong>: ${weather.condition}</p>
        <p><strong>Max Temp</strong>: ${weather.maxTemp}°C</p>
        <p><strong>Min Temp</strong>: ${weather.minTemp}°C</p>
        <p><strong>Average Temp</strong>: ${average}°C</p>
        <p><strong>Wind Speed</strong>: ${weather.windSpeed} kph</p>
        <p><strong>Chance of Rain</strong>: ${weather.rainChance}%</p>
      `;

      //display recommend
      document.getElementById("recommendationContent").innerHTML = `
        <p><strong>Recommendation</strong>:</p>
        <p>${activity.recommend}</p>
        <p><strong>Reason</strong>:</p>
        <p>${activity.reason}</p>
      `;

      //icon weather
      const iconPath = getWeatherIcon(weather.condition);
      document.getElementById("weatherIcon").innerHTML = `
        <img src="${iconPath}" alt="${weather.condition}" width="120" height="120">
      `;

      //display input date and notes
      write.style.display='';
      saveBtn.style.display='';
      weatherData = {city: selectedCity, date, maxTemp: weather.maxTemp, minTemp: weather.minTemp, average, rainChance: weather.rainChance, riskRain: weather.riskRain, windSpeed: weather.windSpeed, condition: weather.condition, recommendation: activity.recommend, reason: activity.reason};
    });
});

//simpan data untuk save
document.getElementById('saveBtn').addEventListener('click', () => {
  const date = document.getElementById('dateInput').value;
  const plan = document.getElementById('planInput').value.trim();

  if (!date || !plan) { //if user lupa nk masuk date @ plan
    alert('Please fill all fields.');
    return;
  }

  ipcRenderer.send('save-itinerary', {  
  city: selectedCity,
  date,
  condition: weatherData.condition,
  average: weatherData.average,
  rainChance: weatherData.rainChance,
  recommendation: weatherData.recommendation,
  reason: weatherData.reason, 
  notes: plan
});

 // simpan city
  alert('Plan saved!');
  renderItineraries();
});

document.getElementById("backHomeBtn").addEventListener("click", () => {
  console.log("Back button clicked");
  ipcRenderer.send("open-home");
});

// View 
async function renderItineraries() {
  const itineraries = await ipcRenderer.invoke('load-itineraries');
  const container = document.getElementById("itineraryList");
  container.innerHTML = "";

  if (itineraries.length === 0) {
    container.innerHTML = "<p>No plan saved yet.</p>";
    return;
  }

  itineraries.forEach((item, index) => {
    const div = document.createElement("div");
    div.classList.add("itinerary-card");
    div.innerHTML = `
    <div class="itinerary-left" >
      <h3>Plan #${index + 1}</h3>
      <p>Place: ${item.city}</p>
      <p>Date: ${item.date}</p>
      <p>Condition: ${item.condition}</p>
      <p>Average Temp: ${item.average}°C</p>
      <p>Rain Chance: ${item.rainChance}%</p>
      <p>Recommendation: ${item.recommendation}</p>
      <p>Reason: ${item.reason}</p>
      <p>Notes: ${item.notes}</p>
      <button id="update-${index}">Update</button>
      <button id="delete-${index}">Delete</button>
    </div>

      <div id="edit-${index}" style="display:none; margin-top:5px;">
        <input type="date" id="date-${index}">
        <input type="text" id="notes-${index}" placeholder="Edit notes">
        <button id="save-${index}">Save</button>
        <button id="cancel-${index}">Cancel</button>
      </div>
    `;
    container.appendChild(div);

    // Update
    document.getElementById(`update-${index}`).addEventListener("click", () => {
    // Pre-fill existing values
    document.getElementById(`date-${index}`).value = item.date;
    document.getElementById(`notes-${index}`).value = item.notes;

    document.getElementById(`edit-${index}`).style.display = "block";
  });



// Save update to main process
document.getElementById(`save-${index}`).addEventListener("click", async () => {
  const newDate = document.getElementById(`date-${index}`).value;
  const newNotes = document.getElementById(`notes-${index}`).value.trim();

  if (!newDate || !newNotes) { 
    alert("Please fill all fields."); 
    return; 
  }

  const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=32804b24a847407391c53709241010&q=${item.city}&dt=${newDate}`);
  const data = await res.json();
  const f = data.forecast.forecastday[0].day;
  const weather = new WeatherForecast(item.city, newDate, f.maxtemp_c, f.mintemp_c, f.daily_chance_of_rain, f.daily_will_it_rain, f.maxwind_kph, f.condition.text);
  const activity = weather.recommendActivity();

  
  const result = await ipcRenderer.invoke("update-itinerary", { 
  index: Number(index), 
  newDate, 
  newNotes,
  newRecommend:activity.recommend, 
  newReason: activity.reason 
});
  console.log("Update result:", result); // debug

  if (result.success) {
    alert("Plan updated!");
    renderItineraries(); // refresh after confirmation
  } else {
    alert("Update failed.");
  }
});

    document.getElementById(`cancel-${index}`).addEventListener("click", () => {
      document.getElementById(`edit-${index}`).style.display = "none";
    });

    // Delete
    document.getElementById(`delete-${index}`).addEventListener("click", () => {
      if (!confirm("Are you sure you want to delete this plan?")) return;
      if (!confirm(" This plan will be deleted permanently. Confirm delete?")) return;

      ipcRenderer.send("delete-itinerary", Number(index));
      alert("Plan deleted!");
      renderItineraries(); // refresh terus
    });
  });

  document.getElementById("viewItinerariesBtn").addEventListener("click", () => {
  ipcRenderer.send("open-view-window");
});
}

// Attach sekali sahaja
document.getElementById("viewItinerariesBtn").addEventListener("click", renderItineraries);