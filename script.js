const rainfall_api = "https://api-open.data.gov.sg/v2/real-time/api/rainfall"
//temporarily assign park parameters first
const park = { name: "East Coast Park", latitude: 1.3008, longitude: 103.9122 };


async function checkrain(){
    const parkname = document.getElementById("parkname_box");
    const rainfalllevel = document.getElementById("rainfalllevel_box");

    try{
        const response = await fetch(rainfall_api);
        if(!response.ok){
            throw Error("Request failed: " + response.status)
        }
        const result = await response.json();

        const stations = result.data.stations;          // where each sensor is
        const readings = result.data.readings[0].data;  // what each sensor measured

                // find the station closest to the park
        const distance = (s) => Math.hypot(
            s.location.latitude - park.latitude,
            s.location.longitude - park.longitude
        );
        const nearest = stations.reduce((a, b) => distance(a) < distance(b) ? a : b);

        // get that station's reading
        const reading = readings.find((r) => r.stationId === nearest.id);

        parkname.textContent = park.name;
        rainfalllevel.textContent = reading
            ? `${reading.value} mm of rain near ${nearest.name}`
            : "No reading available right now";
    } catch (error) {
        console.error(error);
        rainfalllevel.textContent = "Couldn't get the weather. Please try again.";
    }
}

document.getElementById("run_button").addEventListener("click", checkrain);
