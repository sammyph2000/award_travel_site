var signInSection = document.querySelector('.please-sign-in');
var isUserSignedIn = localStorage.getItem('awardTravelToken') !== null;
console.log("UserStatus:", isUserSignedIn)
document.addEventListener('DOMContentLoaded', function() {
signInSection.style.setProperty('display', 'none', 'important');
var currentURL = encodeURIComponent(window.location.href);
var signUpButton = document.getElementById('hotel-ltd-sign-up');
if (signUpButton) {signUpButton.href = `/signup?ref=hotels_search&redirect=${currentURL}`;}
var signInButton = document.getElementById('sign-in-button');
if (signInButton) {signInButton.href = `/login?redirect=${currentURL}`;}

var hotelData = [];
var destination = getQueryParam('destination');
var checkIn = getQueryParam('check_in');
var checkOut = getQueryParam('check_out');
var noGuests = getQueryParam('no_guests');
initializeParameters(destination, checkIn, checkOut, noGuests);
var apiUrl = constructApiUrl(destination, checkIn, checkOut, noGuests);
fetchHotelDataWithRetry(apiUrl, 5);

updateDateRangePicker(checkIn, checkOut);

document.getElementById('filter-button').addEventListener('click', function() {
applyFilters();

if (!isUserSignedIn && hotelData.length > 5) {
signInSection.style.display = 'hidden';
var container = document.getElementById('results-container');
container.insertBefore(signInSection, container.children[5]);
signInSection.style.display = 'flex';}});

function getQueryParam(param) {
var urlParams = new URLSearchParams(window.location.search);
return urlParams.get(param);
}

function initializeParameters(destination, checkIn, checkOut, noGuests) {
if (document.getElementById('destination')) {
document.getElementById('destination').value = destination;
}
if (document.querySelector('.check-in')) {
document.querySelector('.check-in').value = checkIn;}
if (document.querySelector('.check-out')) {
document.querySelector('.check-out').value = checkOut;}

if (document.getElementById('no_guests')) {
document.getElementById('no_guests').value = noGuests;
}
}

function updateDateRangePicker(checkIn, checkOut) {
var startDate = moment(checkIn, "MM/DD/YYYY");
var endDate = moment(checkOut, "MM/DD/YYYY");

$('input[ms-code-input="date-range"]').daterangepicker({
startDate: startDate,
endDate: endDate,
});
}

function constructApiUrl(destination, checkIn, checkOut, noGuests) {
return `https://api.awardtravel.co/search_hotels?destination=${encodeURIComponent(destination)}&check_in_date=${encodeURIComponent(checkIn)}&check_out_date=${encodeURIComponent(checkOut)}&no_guests=${encodeURIComponent(noGuests)}`;}

function fetchHotelDataWithRetry(apiUrl, retries) {
fetchHotelData(apiUrl).catch(error => {
if (retries > 0) {
setTimeout(() => {
fetchHotelDataWithRetry(apiUrl, retries - 1);
}, 10000);
} else {
console.error('Error fetching data after retries:', error);
hidePreLoader();}});}

function fetchHotelData(apiUrl) {
return new Promise((resolve, reject) => {
var token = localStorage.getItem('awardTravelToken');
var headers = {};
if (token) {
headers['Authorization'] = token;}
fetch(apiUrl, {
headers: headers})
.then(response => {
if (response.ok) {
return response.json();
} else {
throw new Error('API response not 200');}})
.then(data => {
hotelData = data;
console.log('API Response:', data);
createHotelCards(hotelData);
hidePreLoader();
resolve(data);})
.catch(error => {
console.error('Error fetching data:', error);
reject(error);});});}
function hidePreLoader() {
var preLoader = document.getElementById('pre-loader');
if (preLoader) {
preLoader.style.display = 'none';}}

function applyFilters() {
var brandFilters = {
marriott: document.getElementById('marriott').checked,
hyatt: document.getElementById('hyatt').checked,
hilton: document.getElementById('hilton').checked,
ihg: document.getElementById('ihg').checked
};

var specialFilters = {
amex_mr: document.getElementById('amex-mr').checked,
chase_ur: document.getElementById('chase-ur').checked,
bilt: document.getElementById('bilt').checked
};

var pointFilters = {
marriott_35k: document.getElementById('marriott-35k').checked,
marriott_50k: document.getElementById('marriott-50k').checked,
marriott_85k: document.getElementById('marriott-85k').checked,
woh1_4: document.getElementById('woh1-4').checked,
woh1_7: document.getElementById('woh1-7').checked,
hh_fnc: document.getElementById('hh-fnc').checked
};

var filteredHotels = hotelData.filter(function(hotel) {
return applyBrandSpecialAndPointFilters(hotel, brandFilters, specialFilters, pointFilters);
});

createHotelCards(filteredHotels);
}

function applyBrandSpecialAndPointFilters(hotel, brandFilters, specialFilters, pointFilters) {
if (pointFilters.marriott_35k && hotel.parent_co === 'marriott' && hotel.prices.points.avg_cost_per_night <= 35000) {
return true;
}
if (pointFilters.marriott_50k && hotel.parent_co === 'marriott' && hotel.prices.points.avg_cost_per_night <= 50000) {
return true;
}
if (pointFilters.marriott_85k && hotel.parent_co === 'marriott' && hotel.prices.points.avg_cost_per_night <= 85000) {
return true;
}
if (pointFilters.woh1_4 && hotel.parent_co === 'hyatt' && hotel.prices.points.avg_cost_per_night <= 15000) {
return true;
}
if (pointFilters.woh1_7 && hotel.parent_co === 'hyatt' && hotel.prices.points.avg_cost_per_night <= 30000) {
return true;
}
if (pointFilters.hh_fnc && hotel.parent_co === 'hilton') {
return true;
}
if (applySpecialFilters(hotel, specialFilters)) {
return true;
}
if (isAnyBrandFilterChecked(brandFilters)) {
return brandFilters[hotel.parent_co];
}
return isNoFilterChecked(brandFilters, specialFilters, pointFilters);
}

function applySpecialFilters(hotel, specialFilters) {
if (specialFilters.amex_mr && (hotel.parent_co === 'marriott' || hotel.parent_co === 'hilton')) {
return true;
}
if (specialFilters.chase_ur && (hotel.parent_co === 'hyatt' || hotel.parent_co === 'ihg')) {
return true;
}
if (specialFilters.bilt && (hotel.parent_co === 'hyatt' || hotel.parent_co === 'marriott' || hotel.parent_co === 'ihg')) {
return true;
}
return false;
}

function isAnyBrandFilterChecked(brandFilters) {
return Object.values(brandFilters).some(function(isChecked) {
return isChecked;
});
}

function isNoFilterChecked(brandFilters, specialFilters, pointFilters) {
return !isAnyBrandFilterChecked(brandFilters) && !Object.values(specialFilters).some(function(isChecked) {
return isChecked;
}) && !Object.values(pointFilters).some(function(isChecked) {
return isChecked;
});
}

function createHotelCards(hotelData) {
var container = document.getElementById('results-container');
var templateCard = document.querySelector('.hotel-result-card');

container.innerHTML = '';

hotelData.forEach(function(hotel, index) {
var cardClone = templateCard.cloneNode(true);

var hotelNameElement = cardClone.querySelector('.hotel-name');
if (hotelNameElement) {
hotelNameElement.textContent = hotel.hotel_name || 'N/A';
}

var pointsAmountElement = cardClone.querySelector('.points-amount');
if (pointsAmountElement && hotel.prices && hotel.prices.points && hotel.prices.points.avg_cost_per_night != null) {
var roundedPoints = Math.ceil(hotel.prices.points.avg_cost_per_night);
pointsAmountElement.textContent = roundedPoints.toLocaleString();
} else if (pointsAmountElement) {
pointsAmountElement.textContent = 'N/A';
}

var cashAmountElement = cardClone.querySelector('.cash-per-night');
if (cashAmountElement && hotel.prices && hotel.prices.cash && hotel.prices.cash.cash_per_night != null) {
cashAmountElement.textContent = hotel.prices.cash.cash_per_night.toLocaleString();
} else if (cashAmountElement) {
cashAmountElement.textContent = 'N/A';
}

var hotelImageElement = cardClone.querySelector('.hotel-image-from-api');
if (hotelImageElement) {
hotelImageElement.src = (hotel.image_urls && hotel.image_urls.length > 0) ? hotel.image_urls[0] : 'path/to/default/image.jpg'; 
}

var bookNowButton = cardClone.querySelector('#book-now');
if (bookNowButton) {
bookNowButton.href = `https://awardtravel.co/travel/hotel-booking?hotel_id=${hotel.hotel_id}&check_in_date=${encodeURIComponent(checkIn)}&check_out_date=${encodeURIComponent(checkOut)}&no_guests=${encodeURIComponent(noGuests)}&parent_company=${encodeURIComponent(hotel.parent_co)}`;
}

var currencyElement = cardClone.querySelector('#currency');
if (currencyElement && hotel.parent_co) {
var capitalizedParentCo = hotel.parent_co.split(' ').map(function(word) {
return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}).join(' ');
currencyElement.textContent = capitalizedParentCo;
} else if (currencyElement) {
currencyElement.textContent = '';
}
            
if (index >= 5 && !isUserSignedIn) {
cardClone.classList.add('blurred');
}

container.appendChild(cardClone);
});

if (!isUserSignedIn && hotelData.length > 5) {
var fifthCard = container.children[4];
if (fifthCard) {
fifthCard.insertAdjacentElement('afterend', signInSection);
}
}
}
});

window.addEventListener('scroll', function() {
if (!isUserSignedIn) {
var hotelDataLength = document.querySelectorAll('.hotel-result-card').length;
if (hotelDataLength > 5) {
var fifthElementPosition = document.querySelector('.hotel-result-card:nth-child(5)').getBoundingClientRect().top;
var offset = -2000;
if (window.scrollY > fifthElementPosition - offset) {
signInSection.style.display = 'block';
} else {
signInSection.style.display = 'none';
}
}
}
});


document.getElementById('submit-button').addEventListener('click', function() {
var destination = document.getElementById('destination').value;
var checkInInput = document.querySelector('.check-in').value;
var checkOutInput = document.querySelector('.check-out').value;
var noGuests = document.getElementById('no_guests').value;

var url = 'https://www.awardtravel.co/travel/hotel-results?destination=' + encodeURIComponent(destination) +
'&check_in=' + checkInInput +
'&check_out=' + checkOutInput +
'&no_guests=' + encodeURIComponent(noGuests);

window.location.href = url;
});

function formatDate(dateString) {
var parts = dateString.split('/');
return parts[2] + '-' + parts[0].padStart(2, '0') + '-' + parts[1].padStart(2, '0');
}

document.getElementById('submit-button').addEventListener('click', function() {
var destination = document.getElementById('destination').value;
var checkInInput = document.querySelector('.check-in').value;
var checkOutInput = document.querySelector('.check-out').value;
var noGuests = document.getElementById('no_guests').value;

var today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
today.setHours(0, 0, 0, 0); 

var checkInDate = new Date(checkInInput);
var checkOutDate = new Date(checkOutInput);

if (checkInDate <= today) {
alert("Check-In date must be after today's date.");
return; 
}

if (checkOutDate <= checkInDate) {
alert("Check-Out date must be after the Check-In date.");
return; 
}

var url = 'https://www.awardtravel.co/travel/hotel-results?destination=' + encodeURIComponent(destination) +
'&check_in=' + checkInInput +
'&check_out=' + checkOutInput +
'&no_guests=' + encodeURIComponent(noGuests);

window.location.href = url;
});
