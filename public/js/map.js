let map = L.map('map')
const init = () => {
    navigator.geolocation.getCurrentPosition(locationSuccessCallback, locationErrorCallback, {enableHighAccuracy:true});
    getDates()
}

const getDates = async () => {
    const response = await fetch('/api/dates')
    const data = await response.json()
    setDates(data.dates)
}

const setDates = (dates) => {
    const dateEl = document.querySelector('#dates')
    let str = ''
    for( let date of dates){
        str += `<a href="#" class="list-group-item list-group-item-action gps-date" 
                    data-year="${date.year}"
                    data-month="${date.month}"
                    data-day="${date.day}">
                    ${date.full}
                </a>`
    }
    dateEl.innerHTML = str
    const btnEls = document.querySelectorAll('.gps-date')
    for(let btn of btnEls) btn.addEventListener('click', getData)
}

const getData = async (e) => {
    clearMap()
    const year = e.target.dataset.year
    const month = e.target.dataset.month
    const day = e.target.dataset.day
    const response = await fetch(`/api/points/${year}/${month}/${day}`)
    const data = await response.json()
    let points = []
    for( let point of data.points){
        points.push([point.lat, point.lon])
    }
    const polyLine = L.motion.polyline(points,
        {
            color: '#00758F',
            weight: 8
        },
        {
            auto: true,
            duration:3000
        })
    map.fitBounds(polyLine.getBounds())
    polyLine.addTo(map)
}

const clearMap = () => {
    map.eachLayer(layer => {
       if(layer._path) layer.remove()
    })
}

const locationSuccessCallback = (position) => {
    map.setView([position.coords.latitude, position.coords.longitude], 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);
};

const locationErrorCallback = (error) => {
    console.log(error);
};

window.onload = init