let map = L.map('map')
let dates = []
let replicaStatus = ''
const init = () => {
    navigator.geolocation.getCurrentPosition(locationSuccessCallback, locationErrorCallback, {enableHighAccuracy:true});
    const container = document.querySelector('#trips');
    container.addEventListener('click', async (e) => {

        if (e.target.classList.contains('trip-link')) {
            await getTrip(e.target.getAttribute('data-id'))
        }
        else if (e.target.classList.contains('fa-trash')){
            await deleteTrip(e.target.parentElement)
        }
    });
}

const getTzOffset = () =>{
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const getDates = async () => {
    const response = await fetch('/api/dates', {headers: new Headers({'tz': getTzOffset()})})
    const data = await response.json()
    dates = data.dates
    initCalendar()
}

const initCalendar = () => {
    const elem = document.querySelector('#date')
    const lastDate = new Date (dates[dates.length-1])
    const firstDate = new Date(dates[0])
    const datepicker = new Datepicker(elem, {
        type: "inline",
        maxDate: lastDate,
        minDate: firstDate,
        datesDisabled: isDateDisabled,
        buttonClass: 'btn'
    });
    datepicker.element.addEventListener('changeDate',getTrips)
}

const isDateDisabled = (date) => {
    const disabled = !dates.find((element) =>{
        const el = new Date(element)
        return el.getFullYear() === date.getFullYear() && el.getMonth() === date.getMonth() && el.getDate() === date.getDate()
    })
    return disabled
}

const getTrips = async (e) =>{
    document.querySelector('#details').innerHTML = ''
    const year = e.detail.date.getFullYear()
    const month = e.detail.date.getMonth() + 1
    const day = e.detail.date.getDate()
    const response = await fetch(`/api/trips/${year}/${month}/${day}`, {headers: new Headers({'tz': getTzOffset()})})
    const data = await response.json()
    showTrips(data.trips)
}

const getTrip = async (id) => {
    clearMap()
    const response = await fetch(`/api/trip/${id}`)
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
            duration: 6000
        })
    map.fitBounds(polyLine.getBounds())
    polyLine.addTo(map)
    data.distanceK = round(GPS.TotalDistance(data.points))
    data.distanceM = round(data.distanceK * 0.6213711922)
    showTrip(data)
}

const deleteTrip = async (el) => {
    const id = el.getAttribute('data-id')
    const response = await fetch(`/api/delete/${id}`)
    const data = await response.json()
    if(data.success){
        el.parentElement.remove()
    }

}

const showTrips = (trips) =>{
    const elem = document.querySelector('#trips')
    let tripsStr = ''

    for (const trip of trips){
        const newTrip = `<li><a href="#" class="trip-del link-danger" data-id="${trip.id}"><i class="fas fa-trash"></i></a> <a href="#" data-id="${trip.id}" class="trip-link">${trip.tripStart}</a></li>`
        tripsStr += newTrip
    }
    elem.innerHTML = `<div class="card p-2 m-2"><div class="text-center"><h5>Trips</h5></div><div class="text-left"><ol>${tripsStr}</ol></div> </div>`
}

const showTrip = (data) => {
    const elem = document.querySelector('#details')
    elem.innerHTML = ''
    const str = `<div class="text-center card p-2 m-2">
                    <h4 class="fw-bold">Avg. Speed</h4> 
                    <h5>${data.avgSpeedK} kph</h5>
                    <h4 class="fw-bold">Distance</h4> 
                    <h5>${data.distanceK} km</h5>
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