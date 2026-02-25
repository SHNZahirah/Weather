const { ipcRenderer } = require('electron');

// Class simpan weather dan cadangan aktiviti
class WeatherForecast {
  constructor(city, date, maxTemp, minTemp, rainChance, riskRain, windSpeed, condition){
    this.city = city;
    this.date = date;
    this.maxTemp = maxTemp;
    this.minTemp = minTemp;
    this.rainChance = rainChance;// kemungkinan hujan 
    this.riskRain = riskRain; 
    this.windSpeed = windSpeed;
    this.condition = condition;
  }

  // Function kira suhu purata
  calculateAverageTemp() {
    return ((this.maxTemp + this.minTemp)/2).toFixed(1);
  }

  // Function bagi cadangan aktiviti berdasarkan cuaca
  recommendActivity() {
    const averageTemp = this.calculateAverageTemp();
    if (this.rainChance > 60 || this.riskRain == 1) {
      return {recommend:"Indoor activities", reason:"High probability of rain"};
    } else if (this.windSpeed > 30) {
      return {recommend:"Indoor activities", reason:"Strong wind"};
    } else if (averageTemp > 33) {
      return {recommend:"Outdoor morning/evening", reason:"High daytime temp"};
    } else {
      return {recommend:"Outdoor activities", reason:"Stable weather"};
    }
  }
}

// Auto render bila page load
window.addEventListener("DOMContentLoaded", renderItineraries);

async function renderItineraries() {
  const itineraries = await ipcRenderer.invoke('load-itineraries'); // load data dari main
  const container = document.getElementById("itineraryList");
  container.innerHTML = "";

  // Jika tiada data
  if (itineraries.length === 0) {
    container.innerHTML = "<p class='no-plan'>No plan saved yet.</p>";
    return;
  }

  itineraries.forEach((item, index) => {
    const div = document.createElement("div");
    div.classList.add("itinerary-card");
    div.innerHTML = `
      <div class="itinerary-left">
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

     // Event klik paparkan form update
    document.getElementById(`update-${index}`).addEventListener("click", () => {
      document.getElementById(`date-${index}`).value = item.date;
      document.getElementById(`notes-${index}`).value = item.notes;
      document.getElementById(`edit-${index}`).style.display = "block";
    });

    // Save update
    document.getElementById(`save-${index}`).addEventListener("click", async () => {
      const newDate = document.getElementById(`date-${index}`).value;
      const newNotes = document.getElementById(`notes-${index}`).value.trim();
      if (!newDate || !newNotes) { alert("Please fill all fields."); return; }

      // Fetch untuk tarikh baru
      const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=32804b24a847407391c53709241010&q=${item.city}&dt=${newDate}`);
      const data = await res.json();
      const f = data.forecast.forecastday[0].day;
      const weather = new WeatherForecast(item.city, newDate, f.maxtemp_c, f.mintemp_c, f.daily_chance_of_rain, f.daily_will_it_rain, f.maxwind_kph, f.condition.text);
      const activity = weather.recommendActivity();

      // Hantar update ke main process
        const result = await ipcRenderer.invoke("update-itinerary", { 
        index,
        newDate,
        newNotes,
        newCondition: weather.condition,
        newAverage: weather.calculateAverageTemp(),
        newRainChance: weather.rainChance,
        newRecommend: activity.recommend,
        newReason: activity.reason
        });

      if (result.success) {
        alert("Plan updated!");
        renderItineraries(); // refresh list
      } else {
        alert("Update failed.");
      }
    });

    // Cancel edit
    document.getElementById(`cancel-${index}`).addEventListener("click", () => {
      document.getElementById(`edit-${index}`).style.display = "none";
    });

    // Delete
    document.getElementById(`delete-${index}`).addEventListener("click", () => {
      if (!confirm("Are you sure you want to delete this plan? This plan will be deleted permanently.")) return;
      ipcRenderer.send("delete-itinerary", index);
      alert("Plan deleted!");
      renderItineraries();// refresh terus
    });
  });
}