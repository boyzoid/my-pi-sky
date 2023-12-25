let map = L.map('map')
let dates = []
const init = () => {
    navigator.geolocation.getCurrentPosition(locationSuccessCallback, locationErrorCallback, {enableHighAccuracy:true});
    getDates()
}

const getDates = async () => {
    const response = await fetch('/api/dates')
    const data = await response.json()
    dates = data.dates
    initCalendar()
}

const initCalendar = () => {
    const elem = document.querySelector('.date');
    const firstDate = dates[dates.length-1]
    const datepicker = new Datepicker(elem, {
        type: "inline",
        maxDate: new Date(),
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
    map.setView([0,0], 3);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map)
    getDates()
};

window.onload = init