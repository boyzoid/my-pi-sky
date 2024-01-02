let map = L.map('map')
let dates = []
const init = () => {
    navigator.geolocation.getCurrentPosition(locationSuccessCallback, locationErrorCallback, {enableHighAccuracy:true});
}

const getDates = async () => {
    const response = await fetch('/api/dates')
    const data = await response.json()
    dates = data.dates
    initCalendar()
}

const initCalendar = () => {
    const elem = document.querySelector('#date')
    const lastDate = dates[dates.length-1]
    const firstDate = dates[0]
    const datepicker = new Datepicker(elem, {
        type: "inline",
        maxDate: new Date(lastDate.year, lastDate.month-1, lastDate.day),
        minDate: new Date(firstDate.year, firstDate.month-1, firstDate.day),
        datesDisabled: isDateDisabled,
        buttonClass: 'btn'
    });
    datepicker.element.addEventListener('changeDate',getData)
}

const isDateDisabled = (date) => {
    const disabled = !dates.find((element) =>{
        return element.year === date.getFullYear() && element.month-1 === date.getMonth() && element.day === date.getDate()
    })
    return disabled
}

const getData = async (e) => {
    clearMap()
    const year = e.detail.date.getFullYear()
    const month = e.detail.date.getMonth() + 1
    const day = e.detail.date.getDate()
    const response = await fetch(`/api/points/${year}/${month}/${day}`)
    const data = await response.json()
    let points = []
    for( let point of data.points){
        points.push([point.lat, point.lon])
    }
    const polyLine = L.motion.polyline(points,
        {
            color: '#00758F',
            weight: 6
        },
        {
            auto: true,
            duration:3000
        })
    map.fitBounds(polyLine.getBounds())
    polyLine.addTo(map)
    data.distanceK = round(GPS.TotalDistance(data.points))
    data.distanceM = round(data.distanceK * 0.6213711922)
    showData(data)
}

const showData = (data) => {
    const elem = document.querySelector('#details')
    elem.innerHTML = ''
    const str = `<div class="text-center">
                    <h2 class="fw-bold">Avg. Speed</h2> 
                    <h3>${data.avgSpeedK} kph<br/>${data.avgSpeedM} mph<h3>
                 </div>
                 <div class="text-center">
                    <h2 class="fw-bold">Distance</h2> 
                    <h3>${data.distanceK} km<br/>${data.distanceM} mi</h3>
                </div>`
    elem.innerHTML = str
}

const clearMap = () => {
    map.eachLayer(layer => {
       if(layer._path) layer.remove()
    })
}

const locationSuccessCallback = (position) => {
    map.setView([position.coords.latitude, position.coords.longitude], 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);
    getDates()
};

const locationErrorCallback = (error) => {
    map.setView([0,0], 3);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map)
    getDates()
};

const round = (val)=>{
    return Math.round(val * 10 ** 2)/10 ** 2
}

window.onload = init