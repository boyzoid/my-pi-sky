let map = L.map('map')
let dates = []
let replicaStatus = ''
const init = () => {
    navigator.geolocation.getCurrentPosition(locationSuccessCallback, locationErrorCallback, {enableHighAccuracy:true});
    getReplicaStatus()
    setInterval(getReplicaStatus, 5000)
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
            speed: (data.avgSpeedK * 200)
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
    const str = `<div class="text-center card p-2 m-2">
                    <h3 class="fw-bold">Avg. Speed</h3> 
                    <h4>${data.avgSpeedK} kph<br/>${data.avgSpeedM} mph<h3>
                    <h3 class="fw-bold">Distance</h3> 
                    <h4>${data.distanceK} km<br/>${data.distanceM} mi</h4>
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

const getReplicaStatus = async () =>{
    const response = await fetch('/api/replica-status')
    const channel = await response.json()
    const elem = document.querySelector('#replica')
    let state = 'alert-primary'
    const replicaState = {
        UPDATING:{
            string: "Updating",
            class: "alert-warning"
        },
        INACTIVE:{
            string: "Disabled",
            class: "alert-light"
        },
        ACTIVE:{
            string: "Active",
            class: "alert-success"
        },
        NEEDS_ATTENTION:{
            string: "Needs Attention",
            class: "alert-danger"
        }
    }
    elem.innerHTML = ''
    const str = `<div class="text-center card p-2 m-2">
                    <h4>Replication State</h4> 
                    <div class="alert ${replicaState[channel.state] ? replicaState[channel.state].class : 'alert-primary'}">${replicaState[channel.state] ? replicaState[channel.state].string : 'Unknown'}</div>
                </div>`
    elem.innerHTML = str
}

window.onload = init