const { ipcRenderer } = require('electron');
const searchBtn = document.getElementById('searchBtn');// button search
const resultDiv = document.getElementById('result'); // papar result search
const itineraryBtn = document.getElementById('itineraryBtn'); // button untuk plan trip
let currentCity = '';

// Event bila user tekan search
searchBtn.addEventListener('click', async () => { //event for button search

  var city = document.getElementById("country").value // ambil input city
  
  // Fetch weather API
  fetch(`https://api.weatherapi.com/v1/forecast.json?key=32804b24a847407391c53709241010&q=${city},MY`)//api url
     .then((response) => response.json())
     .then((data) => {

      // Papar result current weather 
         resultDiv.innerHTML = `
        <h3>${data.location.name}, ${data.location.country}</h3>
        <p>Temperature: ${data.current.temp_c}°C</p>
        <p>Weather: ${data.current.condition.text}</p>
        <p>Humidity: ${data.current.humidity}%</p>
        <p>Wind: ${data.current.wind_kph}km/hour</p>
      `;
      resultDiv.style.display = ''; // tunjukkan result
      itineraryBtn.style.display = 'block'; // tunjukkan button plan trip
      currentCity = data.location.name; // simpan latest city 

     } )
});

//display wather beranang di homepage
async function loadBeranangWeather() {
    const res = await fetch("https://api.weatherapi.com/v1/forecast.json?key=32804b24a847407391c53709241010&q=Beranang&days=3");
    const data = await res.json();

    const weather = data.current;

    // Current data
    let currentHtml = `
      <div class="weather-card">
      <div class="forecast-banner">
      <h3>Current Weather For Beranang</h3></div><br>
      <div class="forecast-item">
        
        <p><strong>Temperature:</strong> ${weather.temp_c}°C</p>
        <p><strong>Condition:</strong> ${weather.condition.text}</p>
        <p><strong>Humidity:</strong> ${weather.humidity}%</p>
        <p><strong>Wind:</strong> ${weather.wind_kph} kph</p>
      </div></div>
    `;

    // next 3 day data
    let forecastHtml = `
      <div class="forecast-card">
      <div class="forecast-banner">
        <h3>Beranang's Weather For Next 3 Days</h3></div>
        <br>
        <div class="forecast-row">
    `;

    data.forecast.forecastday.forEach(day => {
      forecastHtml += `
        <div class="forecast-item">
          <p><strong>${day.date}</strong></p>
          <p>Max: ${day.day.maxtemp_c}°C</p>
          <p>Min: ${day.day.mintemp_c}°C</p>
          <p>${day.day.condition.text}</p>
          <p>Rain: ${day.day.daily_chance_of_rain}%</p>
        </div>
      `;
    });

    forecastHtml += `</div></div>`;


    document.getElementById("klWeather").innerHTML = `
      <div class="weather-layout">
       ${currentHtml} 
       ${forecastHtml}
        
      </div>
    `;

}

// Load weather Beranang bila page siap load
window.addEventListener("DOMContentLoaded", loadBeranangWeather);

// Event bila user klik plan trip
itineraryBtn.addEventListener('click', () => { //event button for CREATE ITINERARY
  ipcRenderer.send('open-itinerary-window', currentCity); //send message to main
});