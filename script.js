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

//the value where each category starts (null means not used)
const limits = {
    psi:  { ok: 51,   notGood: null, bad: 101 },
    uv:   { ok: 6,    notGood: 8,    bad: null },
    wbgt: { ok: 30,   notGood: 31,   bad: 33 },
    rain: { ok: null, notGood: 0.1,  bad: null }
};

let latest_parks = []; //kept so we can redraw without calling the APIs again

//helper functions

//true if a limit is set and the value has reached it
function reaches(value, limit){
    return limit !== null && value >= limit;
}

//true if any metric has reached its limit for this level
function any_reaches(park, level){
    return reaches(park.haze, limits.psi[level])
        || reaches(park.uv, limits.uv[level])
        || reaches(park.wbgt.value, limits.wbgt[level])
        || reaches(park.rainfall, limits.rain[level]);
}

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
async function api_call(endpoint, retries = 3) {
    try {
        const response = await fetch(endpoint);

        //429 means too many requests: wait, then try again
        if (response.status === 429 && retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            return api_call(endpoint, retries - 1);
        }

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
        output[park.name] = {
            value: Number(reading.wbgt), //the API sends text, so convert to a number
            stress: reading.heatStress
        };
    }
    return output;
}

//classify a park for running: check the worst level first
function classify_park(park){
    const forecast = park.forecast.toLowerCase();

    //bad: don't run
    if (forecast.includes("thundery") || forecast.includes("heavy") || any_reaches(park, "bad")){
        return "bad";
    }

    //not good: think twice
    if (forecast.includes("rain") || forecast.includes("showers") || any_reaches(park, "notGood")){
        return "not good";
    }

    //ok: fine to run, minor care needed
    if (any_reaches(park, "ok")){
        return "ok";
    }

    return "good";
}

//choose a weather icon from the forecast text
function get_icon(forecast){
    const text = forecast.toLowerCase();

    if (text.includes("thundery")) return "⛈️";
    if (text.includes("rain") || text.includes("showers") || text.includes("drizzle")) return "🌧️";
    if (text.includes("partly cloudy")) return "⛅";
    if (text.includes("cloudy")) return "☁️";
    if (text.includes("fair")) return text.includes("night") ? "🌙" : "☀️";

    return "🌡️"; //anything not matched above
}

//turn a status into a CSS class name (class names can't contain spaces)
function status_class(status){
    return "status-" + status.replace(" ", "-");
}

//display one row of cards per status, from best to worst
function display_parks(parks){
    const results = document.getElementById("results");
    results.innerHTML = "";

    for (const status of ["good", "ok", "not good", "bad"]){
        const matches = parks.filter((park) => classify_park(park) === status);

        //skip a status that has no parks
        if (matches.length === 0){
            continue;
        }

        const heading = document.createElement("h3");
        heading.textContent = status.toUpperCase();
        heading.className = status_class(status);
        results.appendChild(heading);

        const row = document.createElement("div");
        row.className = "status-row";
        results.appendChild(row);

        for (const park of matches){
            row.appendChild(create_card(park));
        }
    }
}

//build the card for one park
function create_card(park){
    const rainfall = typeof park.rainfall === "number" ? `${park.rainfall} mm` : park.rainfall;

    const card = document.createElement("div");
    const status = classify_park(park);

    card.className = `park-card ${status_class(status)}`;
    card.innerHTML = `
        <h3>${get_icon(park.forecast)} ${park.name}</h3>
        <p>Status: ${status}</p>
        <p>Rainfall: ${rainfall}</p>
        <p>Forecast: ${park.forecast}</p>
        <p>PSI (24h): ${park.haze}</p>
        <p>UV index: ${park.uv}</p>
        <p>WBGT: ${park.wbgt.value}°C (${park.wbgt.stress} heat stress)</p>
    `;

    return card;
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

        latest_parks = parks;
        display_parks(parks);

        //show when the readings were fetched, in Singapore time
        document.getElementById("last_updated").textContent = new Date().toLocaleString("en-SG", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Singapore"
        });
    } catch (error) {
        console.error(error);
        results.textContent = "Couldn't get the weather. Please try again.";
    }
}

//show the current limits in the input boxes
function fill_settings(){
    for (const metric in limits){
        for (const level in limits[metric]){
            document.getElementById(`${metric}_${level}`).value = limits[metric][level] ?? "";
        }
    }
}

//read the input boxes, save the new limits and redraw the cards
function update_settings(event){
    event.preventDefault(); //stop the form from reloading the page
    const message = document.getElementById("settings_message");
    const entered = {};

    for (const metric in limits){
        entered[metric] = {};
        for (const level in limits[metric]){
            const text = document.getElementById(`${metric}_${level}`).value;
            entered[metric][level] = text === "" ? null : Number(text);
        }

        //the filled boxes must go up from OK to Bad
        const filled = Object.values(entered[metric]).filter((value) => value !== null);
        if (filled.some((value, i) => i > 0 && value <= filled[i - 1])){
            message.textContent = "Not saved: in each row, values must increase from OK to Bad.";
            return;
        }
    }

    Object.assign(limits, entered);
    message.textContent = "Settings updated.";

    //if the weather never loaded, try again
    if (latest_parks.length === 0){
        main_forecast();
    } else {
        display_parks(latest_parks);
    }
}

//move the logo based on how far the page is scrolled:
//left edge at the top, right edge at the bottom, and back again on the way up
function move_logo(){
    //leave the logo centred for people who have turned animations off
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches){
        return;
    }

    const header = document.querySelector(".site-header");
    const logo = document.querySelector(".logo");
    //how far the page can scroll in total
    const max_scroll = document.documentElement.scrollHeight - window.innerHeight;

    //0 at the top of the page, 1 at the bottom
    const progress = max_scroll > 0 ? Math.min(window.scrollY / max_scroll, 1) : 0;
    const left_offset = (header.clientWidth - logo.offsetWidth) / 2;
    const x = left_offset * (2 * progress - 1); //the logo's normal spot is the centre

    //small hops while running
    const y = -Math.abs(Math.sin(window.scrollY / 35)) * 3;

    logo.style.transform = `translate(${x}px, ${y}px)`;
}

window.addEventListener("scroll", move_logo);
window.addEventListener("resize", move_logo);
window.addEventListener("load", move_logo); //once the logo image has a width

//set up the settings form and load the forecast when the page loads
fill_settings();
document.getElementById("settings_form").addEventListener("submit", update_settings);
main_forecast();
