//constant declaration
//park list with area, region and latlong for the midpoint of each park
const park_list = [
  {
    name: "East Coast Park",
    area: "Marine Parade",
    region: "east",
    lat: 1.3040,
    long: 103.9264
  },
  {
    name: "Bishan–Ang Mo Kio Park",
    area: "Bishan",
    region: "north",
    lat: 1.3670,
    long: 103.8330
  },
  {
    name: "Marina Bay",
    area: "City",
    region: "south",
    lat: 1.2830,
    long: 103.8600
  },
  {
    name: "Punggol Waterway Park",
    area: "Punggol",
    region: "east",
    lat: 1.4050,
    long: 103.9020
  },
  {
    name: "Jurong Lake Gardens",
    area: "Jurong East",
    region: "west",
    lat: 1.3381,
    long: 103.7283
  },
  {
    name: "Rail Corridor",
    area: "Bukit Timah",
    region: "west",
    lat: 1.3260,
    long: 103.7900
  },
  {
    name: "Kallang Riverside Park",
    area: "Kallang",
    region: "south",
    lat: 1.3070,
    long: 103.8660
  }
];

const base_url = "https://api-open.data.gov.sg/v2/real-time/api";

//helper functions

//find the id of the station nearest to a park
function get_deviceid(park, stations){
    let nearest = null;
    let shortest = Infinity;

    for (const station of stations){
        const lat_diff = station.location.latitude - park.lat;
        const long_diff = station.location.longitude - park.long;
        const distance = Math.sqrt(lat_diff ** 2 + long_diff ** 2);

        if (distance < shortest){
            shortest = distance;
            nearest = station;
        }
    }

    return nearest.deviceId;
}

function get_reading(device_id, readings){
    const reading = readings.find((r) => r.stationId === device_id);
    return reading ? reading.value : "no reading";
}

//api call
async function api_call(endpoint) {
    try {
        const response = await fetch(endpoint);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        return data;

    } catch (error) {
        console.error("API call failed:", error);
        throw error;
    }
}

//rainfall api: reading from the nearest station
async function get_rainfall(){
    const result = await api_call(`${base_url}/rainfall`);

    const stations = result.data.stations;
    const readings = result.data.readings[0].data;

    const output = {};
    for (const park of park_list){
        const device_id = get_deviceid(park, stations);
        output[park.name] = get_reading(device_id, readings);
    }
    return output;
}

//thunder: 2 hour forecast text for the park's area
async function get_forecast(){
    const result = await api_call(`${base_url}/two-hr-forecast`);
    const forecasts = result.data.items[0].forecasts;

    const output = {};
    for (const park of park_list){
        const match = forecasts.find((f) => f.area === park.area);
        output[park.name] = match ? match.forecast : "no reading";
    }
    return output;
}

//haze: 24 hour PSI for the park's region
async function get_haze(){
    const result = await api_call(`${base_url}/psi`);
    const psi = result.data.items[0].readings.psi_twenty_four_hourly;

    const output = {};
    for (const park of park_list){
        output[park.name] = psi[park.region];
    }
    return output;
}

//uv: one value for the whole of Singapore, latest hour first
async function get_uv(){
    const result = await api_call(`${base_url}/uv`);
    return result.data.records[0].index[0].value;
}

//running index: WBGT (heat stress) from the nearest station
async function get_wbgt(){
    const result = await api_call(`${base_url}/weather?api=wbgt`);
    const readings = result.data.records[0].item.readings;

    //reshape into the station format that get_deviceid expects
    const stations = readings.map((r) => ({ deviceId: r.station.id, location: r.location }));

    const output = {};
    for (const park of park_list){
        const device_id = get_deviceid(park, stations);
        const reading = readings.find((r) => r.station.id === device_id);
        output[park.name] = `${reading.wbgt}°C (${reading.heatStress} heat stress)`;
    }
    return output;
}

//display one card per park
function display_parks(parks){
    const results = document.getElementById("results");
    results.innerHTML = "";

    for (const park of parks){
        const rainfall = typeof park.rainfall === "number" ? `${park.rainfall} mm` : park.rainfall;

        const card = document.createElement("div");
        card.className = "park-card";
        card.innerHTML = `
            <h3>${park.name}</h3>
            <p>Rainfall: ${rainfall}</p>
            <p>Forecast: ${park.forecast}</p>
            <p>PSI (24h): ${park.haze}</p>
            <p>UV index: ${park.uv}</p>
            <p>WBGT: ${park.wbgt}</p>
        `;
        results.appendChild(card);
    }
}

//fetch all the metrics, combine them per park and display
async function main_forecast(){
    const results = document.getElementById("results");
    results.textContent = "Loading...";

    try {
        const [rainfall, forecast, haze, uv, wbgt] = await Promise.all([
            get_rainfall(),
            get_forecast(),
            get_haze(),
            get_uv(),
            get_wbgt()
        ]);

        const parks = park_list.map((park) => ({
            name: park.name,
            rainfall: rainfall[park.name],
            forecast: forecast[park.name],
            haze: haze[park.name],
            uv: uv,
            wbgt: wbgt[park.name]
        }));

        display_parks(parks);
    } catch (error) {
        console.error(error);
        results.textContent = "Couldn't get the weather. Please try again.";
    }
}

//load the forecast when the page loads, and refresh it on button click
main_forecast();
document.getElementById("run_button").addEventListener("click", main_forecast);

//TODO: choose a weather icon for each park

//TODO: park sorting function
    //get sorting metric
    //based on list
    //return sorted list to html for sorting
