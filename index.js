'use strict';

//avoid confusing warnings in REPL
const google = window.google;
const $ = window.$;

const SEARCH_FORM = $('#place-search-form');
const SEARCH_BUTTON = $('#search-button');
const RESULTS_CONTAINER = $('#results');
const weatherContainer = $('#weatherStats');
const INPUT_BOX = $('#city-search');
const RESET_BUTTON = $('#form-reset');
const NPS_URL =
	'https://developer.nps.gov/api/v1/parks?fields=images&api_key=idCayZGypzTFw9aI7voypIy6i5nAFrZP701lmmzr';
const DARKSKY_URL =
	'https://cors-anywhere.herokuapp.com/https://api.darksky.net/forecast/2bdfeee372bf13b395b2bb05d7d33de6';

//prevents from being submitted
const SELECTION = {
	stateObj: null,
	placeObj: null,
};

function clearResults(weatherHTML, parksHTML) {
	weatherContainer.html(weatherHTML);
	RESULTS_CONTAINER.html(parksHTML);
}

function startSearch() {
	//start with a disabled button
	SEARCH_BUTTON.attr('disabled', true);

	//setup form reset handler
	//don't prevent default, let it clear the input
	RESET_BUTTON.on('click', ev => {
		clearResults('', '');

		//reset selection state to empty
		SELECTION.stateObj = null;
		SELECTION.placeObj = null;

		//prevent submit on an empty form
		SEARCH_BUTTON.attr('disabled', true);
	});

	$('#place-search-form').on('submit', ev => {
		event.preventDefault();
	});

	var autocomplete = new google.maps.places.Autocomplete(INPUT_BOX[0]);

	// sets up event handler
	autocomplete.addListener('place_changed', function() {
		var placeObj = autocomplete.getPlace();
		SELECTION.placeObj = placeObj;

		const compsArr = placeObj.address_components;

		//find out state CODE
		const stateObj = compsArr.find(component => {
			return component.types.indexOf('administrative_area_level_1') !== -1;
		});

		SELECTION.stateObj = stateObj;
		SEARCH_BUTTON.attr('disabled', false);

		//trigger API fetching on [ENTER]
		getLocation(stateObj, placeObj);
	});

	//trigger API fetching on button click
	$('#search-button').on('click', function() {
		event.preventDefault();
		getLocation(SELECTION.stateObj, SELECTION.placeObj);
	});

	function getLocation(stateObj, placeObj) {
		if (!(stateObj && placeObj)) {
			alert('Please select a place!');
			return;
		}

		clearResults('Loading weather...', 'Loading parks...');

		if (stateObj) {
			// we found the state in placeObj.address_components, get its code
			const stateCode = stateObj.short_name;

			//trigger the NPS API fetch
			getNPSData({ stateCode: stateCode }, renderResultsHTML);

			//get weather data
			const lat = placeObj.geometry.location.lat();
			const long = placeObj.geometry.location.lng();

			function handleWeather(weatherApiData) {
				const weather = weatherApiData.daily.data.map(renderWeatherHTML);
				
				weatherContainer.html(`
				    <div class="weatherForecastContainer">
				    ${weather.join('<!-- day box -->')}
				    </div>
			  `);

				var icons = new Skycons({ color: 'white' }),
					weather_list = [
						'clear-day',
						'clear-night',
						'partly-cloudy-day',
						'partly-cloudy-night',
						'cloudy',
						'rain',
						'sleet',
						'snow',
						'wind',
						'fog',
					];

				for (var i = weather_list.length; i--; ) {
					var weatherType = weather_list[i],
						elements = document.getElementsByClassName(weatherType);
					for (var e = elements.length; e--; ) {
						icons.set(elements[e], weatherType);
					}
				}

				icons.play();
			}

			getWeatherData(lat, long, handleWeather);
		} else {
			//TODO display a 'Place not found' message
		}
	}
}

function renderWeatherHTML(arrayItem) {
	var d = new Date(0);
	d.setUTCSeconds(arrayItem.time);

	return (
	`
		<div class="weatherDayColumn">
    		<div class="weatherInnerBox">
    		
    		<h3>${getWeekday(d)}:</h3>
    		
            <p>
            <canvas class="weatherIcon ${arrayItem.icon}" width="64" height="64"></canvas>
            ${arrayItem.summary} <br>
      High: ${arrayItem.apparentTemperatureHigh}&deg Low: ${arrayItem.apparentTemperatureLow}&deg
            </p>
            
            </div>    
     </div> `
	);
}

function getWeekday(dateInput) {
	switch (dateInput.getDay()) {
		case 0:
			return 'Sunday';
		case 1:
			return 'Monday';
		case 2:
			return 'Tuesday';
		case 3:
			return 'Wednesday';
		case 4:
			return 'Thursday';
		case 5:
			return 'Friday';
		case 6:
			return 'Saturday';
	}
}

function getWeatherData(lat, long, callback) {
	$.getJSON(`${DARKSKY_URL}/${lat},${long}`, callback);
}

function getNPSData(params, callback) {
	$.getJSON(NPS_URL, params, callback);
}

function renderResultsHTML(apiData) {
	const resultsHTML = apiData.data.map(renderResult);
	RESULTS_CONTAINER.html(resultsHTML);
}

function renderResult(result) {
	const images = result.images;
	let imagesHTMLStr = '';
	if (images.length > 0) {
		result.images.forEach(image => {
			imagesHTMLStr += `
      <a 
      href="${image.url}" 
      data-lightbox="lightbox-${result.id}">
      <img class="park-preview-image" src="${image.url}" ></img>
      </a>
      `;
		});
	}
	return `
    <div class="parkNames">
      <h3>${result.fullName}</h3>
      <button class="moreInfo" onclick="moreInfoButtonClick(\'${result.id}\')">More info</button>
    </div>
    <div class="parkInfo" id="${result.id}">
    <p>${result.description}</p>
      ${imagesHTMLStr}
      </div>
    `;
}

function moreInfoButtonClick(id) {
	$('#' + id).toggle();
}

function moreInfo(id) {
	$('.parkNames').on('click', '.moreInfo', function(e) {
		e.preventDefault();
		$('.parkInfo').show();
	});
}

function handleSearch() {
	$('#state-list').on('change', ev => {
		const abbrev = $('#state-list').val();
		RESULTS_CONTAINER.html(`Please wait...`);
		getNPSData({ stateCode: abbrev }, renderResultsHTML);
	});
}

startSearch();
handleSearch();
