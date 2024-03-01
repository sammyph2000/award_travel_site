var signInSection = document.querySelector('.please-sign-in');
var isUserSignedIn = localStorage.getItem('awardTravelToken') !== null;
console.log("UserStatus:", isUserSignedIn);
var isAlertButtonListenerAdded = false;
var map;
var mapInitialized = false;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 10,
        center: {lat: -34.397, lng: 150.644}
    });
    mapInitialized = true;
}


document.addEventListener('DOMContentLoaded', function() {
    signInSection.style.setProperty('display', 'none', 'important');
    var currentURL = encodeURIComponent(window.location.href);
    var signUpButton = document.getElementById('hotel-ltd-sign-up');
    if (signUpButton) {
        signUpButton.href = `/signup?ref=hotels_search&redirect=${currentURL}`;
    }
    var signInButton = document.getElementById('sign-in-button');
    if (signInButton) {
        signInButton.href = `/login?redirect=${currentURL}`;
    }

    var hotelData = [];
    var destination = getQueryParam('destination');
    var checkIn = getQueryParam('check_in');
    var checkOut = getQueryParam('check_out');
    var noGuests = getQueryParam('no_guests');
    initializeParameters(destination, checkIn, checkOut, noGuests);
    var apiUrl = constructApiUrl(destination, checkIn, checkOut, noGuests);
    fetchHotelDataWithRetry(apiUrl, 5);

    document.getElementById('filter-button').addEventListener('click', function() {
        applyFilters();

        if (!isUserSignedIn && hotelData.length > 5) {
            signInSection.style.display = 'none';
            var container = document.getElementById('results-container');
            container.insertBefore(signInSection, container.children[5]);
            signInSection.style.display = 'flex';
        }
    });

    function centerMapOnDestination(destination) {
        if (!mapInitialized) {
            console.log("Map not initialized. Retrying...");
            setTimeout(() => centerMapOnDestination(destination), 500); // Retry after a delay
            return;
        }
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 'address': destination }, function(results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
                map.setCenter(results[0].geometry.location);
            } else {
                console.error('Could not find location: ' + destination);
            }
        });
    }

    function plotHotelLocations(hotelData) {
        var infoWindow = new google.maps.InfoWindow(); // Reuse InfoWindow instance for efficiency
    
        map.addListener('click', function() {
            infoWindow.close(); // Close infoWindow when map is clicked
        });
    
        hotelData.forEach(function(hotel) {
            var coords = hotel.coordinates.split(', ');
            var latLng = new google.maps.LatLng(parseFloat(coords[0]), parseFloat(coords[1]));
            var markerColor = getMarkerColor(hotel.parent_co); // Determine color based on parent_co
    
            var marker = new google.maps.Marker({
                position: latLng,
                map: map,
                title: hotel.hotel_name,
                opacity: 0.9, // Marker opacity set to 90%
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: markerColor,
                    fillOpacity: 0.9,
                    scale: 8,
                    strokeColor: 'black',
                    strokeWeight: 1,
                }
            });
    
            var contentString = getContentString(hotel); // Construct content string
    
            marker.addListener('click', function() {
                infoWindow.setContent(contentString);
                infoWindow.open(map, marker);
            });
        });
    
        // Adjust map options for zoom control
        map.setOptions({
            gestureHandling: 'cooperative', // Allows map zooming with Ctrl/Cmd + scroll
        });
    }
    
    // Function to return marker color based on parent_co
    function getMarkerColor(parent_co) {
        var markerColors = {
            marriott: "orange",
            hyatt: "royalblue",
            ihg: "grey",
            hilton: "darkblue"
        };
        return markerColors[parent_co] || "red"; // Default color
    }
    
    // Function to construct content string for InfoWindow
    function getContentString(hotel) {
        var cashPrice = hotel.prices.cash?.cash_per_night ? `$${hotel.prices.cash.cash_per_night.toFixed(2)}` : 'Unknown';
        var pointsPrice = hotel.prices.points?.avg_cost_per_night ? `${hotel.prices.points.avg_cost_per_night.toLocaleString()} points` : 'Unknown';
        var parentCoTitleCase = hotel.parent_co.charAt(0).toUpperCase() + hotel.parent_co.slice(1).toLowerCase();
        var bookNowUrl = `https://awardtravel.co/travel/hotel-booking?hotel_id=${hotel.hotel_id}&check_in_date=${getQueryParam('check_in')}&check_out_date=${getQueryParam('check_out')}&no_guests=${getQueryParam('no_guests')}&parent_company=${hotel.parent_co}`;
    
        return `<div style="display: flex; align-items: stretch; box-shadow: none; border-radius: 20px; overflow: hidden;">
                    <img src="${hotel.image_urls[0]}" style="width: 50%; height: auto; object-fit: cover; object-position: center;">
                    <div style="padding: 10px; display: flex; flex-direction: column; justify-content: space-between; background-color: #fff; width: 50%;">
                        <h4 style="margin: 0; font-size: 14px; font-weight: bold;">${hotel.hotel_name}</h4>
                        <p style="margin: 5px 0; font-size: 12px; font-weight: bold;">${parentCoTitleCase}</p>
                        <p style="margin: 5px 0; font-size: 12px;"><strong>Cash Per Night:</strong> ${cashPrice}</p>
                        <p style="margin: 5px 0; font-size: 12px;"><strong>Points Per Night:</strong> ${pointsPrice}</p>
                        <a href="${bookNowUrl}" style="background-color: #3bdb6b; color: black; text-align: center; padding: 5px 10px; border-radius: 12px; font-weight: 500; font-size: 18px; text-decoration: none; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">Book Now</a>
                    </div>
                </div>`;
    }

    map.setOptions({
        scrollwheel: true, // Re-enable scrollwheel zoom with Ctrl/Cmd key press
        zoomControl: true, // Keep zoom control UI enabled
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER
        },
    });
    
    
    
    
    
    

    function getQueryParam(param) {
        var urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    function initializeParameters(destination, checkIn, checkOut, noGuests) {
        if (document.getElementById('destination')) {
            document.getElementById('destination').value = destination;
        }

        if (document.querySelector('.check-in')) {
            document.querySelector('.check-in').value = checkIn;
        }

        if (document.querySelector('.check-out')) {
            document.querySelector('.check-out').value = checkOut;
        }

        if (document.getElementById('no_guests')) {
            document.getElementById('no_guests').value = noGuests;
        }

        centerMapOnDestination(destination)
    }

    function constructApiUrl(destination, checkIn, checkOut, noGuests) {
        return `https://api.awardtravel.co/search_hotels?destination=${encodeURIComponent(destination)}&check_in_date=${encodeURIComponent(checkIn)}&check_out_date=${encodeURIComponent(checkOut)}&no_guests=${encodeURIComponent(noGuests)}`;
    }

    function fetchHotelDataWithRetry(apiUrl, retries) {
        fetchHotelData(apiUrl).catch(error => {
            if (retries > 0) {
                setTimeout(() => {
                    fetchHotelDataWithRetry(apiUrl, retries - 1);
                }, 10000);
            } else {
                console.error('Error fetching data after retries:', error);
                hidePreLoader();
            }
        });
    }

    function fetchHotelData(apiUrl) {
        return new Promise((resolve, reject) => {
            var token = localStorage.getItem('awardTravelToken');
            var headers = {};
            if (token) {
                headers['Authorization'] = token;
            }
            fetch(apiUrl, { headers: headers })
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    } else {
                        throw new Error('API response not 200');
                    }
                })
                .then(data => {
                    hotelData = data;
                    console.log('API Response:', data);
                    createHotelCards(hotelData);
                    
                    if(mapInitialized) {
                        plotHotelLocations(hotelData);
                    } else {
                        console.log("Map not yet initialized. Waiting...");
                        var mapInitCheckInterval = setInterval(() => {
                            if(mapInitialized) {
                                clearInterval(mapInitCheckInterval);
                                plotHotelLocations(hotelData);
                            }
                        }, 100);
                    }
                    
                    hidePreLoader();
                    resolve(data);
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                    reject(error);
                });
        });
    }

    function hidePreLoader() {
        var preLoader = document.getElementById('pre-loader');
        if (preLoader) {
            preLoader.style.display = 'none';
        }
    }

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
        // Check if any of the point filters apply
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

        // Check if any of the special filters apply
        if (applySpecialFilters(hotel, specialFilters)) {
            return true;
        }

        // Check if any of the brand filters apply
        if (isAnyBrandFilterChecked(brandFilters)) {
            return brandFilters[hotel.parent_co];
        }

        return isNoFilterChecked(brandFilters, specialFilters, pointFilters);
    }

    function applySpecialFilters(hotel, specialFilters) {
        const transferPartners = {
            "amex_mr": ["marriott", "hilton", "choice"],
            "chase_ur": ["ihg", "marriott", "hyatt"],
            "cap_one": ["wyndham", "accor"],
            "citi_typ": ["accor", "choice", "wyndham"],
            "bilt": ["marriott", "ihg", "hyatt"]
        };
    
        return Object.entries(specialFilters).some(([filterKey, isChecked]) => {
            if (isChecked) {
                const normalizedFilterKey = filterKey.replace('-', '_');
                return transferPartners[normalizedFilterKey] && transferPartners[normalizedFilterKey].includes(hotel.parent_co);
            }
            return false;
        });
    }

    function isAnyBrandFilterChecked(brandFilters) {
        return Object.values(brandFilters).some(isChecked => isChecked);
    }

    function isNoFilterChecked(brandFilters, specialFilters, pointFilters) {
        return !isAnyBrandFilterChecked(brandFilters) &&
               !Object.values(specialFilters).some(isChecked => isChecked) &&
               !Object.values(pointFilters).some(isChecked => isChecked);
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

            // Conditional display of affiliations
            var affiliations = hotel.affiliations;
            if (affiliations) {
                if (affiliations.is_AT_collection) {
                    var atHotelElements = cardClone.querySelectorAll('.AT_hotels_collection');
                    atHotelElements.forEach(function(elem) { elem.style.display = 'flex'; });
                }
                if (affiliations.is_FHR) {
                    var fhrElements = cardClone.querySelectorAll('.fhr');
                    fhrElements.forEach(function(elem) { elem.style.display = 'flex'; });
                }
                if (affiliations.is_THC) {
                    var thcElements = cardClone.querySelectorAll('.thc');
                    thcElements.forEach(function(elem) { elem.style.display = 'flex'; });
                }
                if (affiliations.is_LHR) {
                    var lhrElements = cardClone.querySelectorAll('.lhr');
                    lhrElements.forEach(function(elem) { elem.style.display = 'flex'; });
                }
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

            var bellIcon = cardClone.querySelector('.bell-alerts'); // Assuming each card has a bell icon
            if (isUserSignedIn) {
                bellIcon.style.cursor = 'pointer';
                bellIcon.style.opacity = '1';
                bellIcon.removeAttribute('title'); // Remove tooltip if user is signed in
            } else {
                bellIcon.style.opacity = '0.5';
                bellIcon.style.cursor = 'none';
                bellIcon.setAttribute('title', 'Please Sign In to Set Alerts'); // Add tooltip
            }
    
            // Step 3: Add Click Event Listener to Bell Icons
            bellIcon.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent the default action
                if (!isUserSignedIn) {
                    alert('Please Sign In to Set Alerts');
                    return; // Stop further execution if the user is not signed in
                }
    
                // Display the alerts modal
                var alertsParentDiv = document.querySelector('.alerts-parent-div');
                alertsParentDiv.style.display = 'flex';
    
                // Pre-fill the modal with hotel data
                document.getElementById('alerts-hotel-name').textContent = hotel.hotel_name || 'N/A';
                document.getElementById('alerts-check-in-date').textContent = getQueryParam('check_in') || 'YYYY-MM-DD';
                document.getElementById('alerts-check-out-date').textContent = getQueryParam('check_out') || 'YYYY-MM-DD';
                document.getElementById('alerts-no-guests').textContent = getQueryParam('no_guests') || '1';
                document.getElementById('parent-co').textContent = hotel.parent_co || 'N/A';
                document.getElementById('property-id').textContent = hotel.hotel_id || 'N/A';
            });

    // Add this right after the bell icon click event setup
    document.body.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'set-alert-button') {
            if (!isUserSignedIn) {
                alert('Please Sign In to Set Alerts');
                return;
            }
            
            // Prevent further execution if the button is already processing a request
            if (e.target.dataset.processing === "true") {
                console.log("Alert creation in progress...");
                return;
            }
            
            e.preventDefault();
            e.target.dataset.processing = "true"; // Mark the button as processing

            var token = localStorage.getItem('awardTravelToken');
            if (!token) {
                alert('You must be signed in to set an alert.');
                e.target.dataset.processing = "false"; // Reset processing status if not signed in
                return;
            }

        // Retrieve values from the modal
        var pointsPrice = document.getElementById('alerts-points-price').value;
        var cashPrice = document.getElementById('alerts-cash-price').value;
        var alertPrice = pointsPrice || cashPrice;
        var isAward = !!pointsPrice; // isAward is true if pointsPrice has a value, false otherwise

        var checkInDate = document.getElementById('alerts-check-in-date').textContent;
        var checkOutDate = document.getElementById('alerts-check-out-date').textContent;
        var noGuests = document.getElementById('alerts-no-guests').textContent;
        var parentCo = document.getElementById('parent-co').textContent;
        var propertyId = document.getElementById('property-id').textContent;

        var requestBody = {
            alert_type: "hotel",
            alert_price: alertPrice,
            date: checkInDate,
            check_out_date: checkOutDate,
            no_guests: noGuests,
            property_id: propertyId,
            parent_company: parentCo,
            is_award: isAward,
            destination: destination
        };

        fetch('https://api.awardtravel.co/create_alert', {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => {
            if (response.ok) {
                alert('Success! Alert Created Successfully');
                document.getElementById('alerts-parent-div').style.display = 'none';
            } else {
                alert('Failed to create alert. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error creating alert. Please try again.');
        })
        .finally(() => {
            e.target.setAttribute('data-processing', "false");
        });
    }
    });
    
            container.appendChild(cardClone);
        });
    
        if (!isUserSignedIn && hotelData.length > 5) {
            var fifthCard = container.children[4];
            if (fifthCard) {
                fifthCard.insertAdjacentElement('afterend', signInSection);
            }
        }
    }
    
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
});