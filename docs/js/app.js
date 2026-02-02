// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCQrHeB1i1RGCIX7mo78LOICreWr8IXVRQ",
    authDomain: "birthday-airline.firebaseapp.com",
    databaseURL: "https://birthday-airline-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "birthday-airline",
    storageBucket: "birthday-airline.appspot.com",
    messagingSenderId: "232218864966",
    appId: "1:232218864966:web:c435e49b62027fc08c4947",
    measurementId: "G-WHS2HRQQ46"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

// DOM Elements
const monthSelect = document.getElementById('select-month');
const dateSelect = document.getElementById('select-date');
const tableBody = document.querySelector('#AirlineTable tbody');
const searchButton = document.getElementById('search-button');
const resultMessage = document.getElementById('result-message');
const resultsSection = document.getElementById('results-section');

// Initialize select options
function initializeSelects() {
    // Month options (1-12)
    for (let month = 1; month <= 12; month++) {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = `${month}月`;
        if (month === 12) option.selected = true;
        monthSelect.appendChild(option);
    }

    // Date options (01-31)
    for (let day = 1; day <= 31; day++) {
        const option = document.createElement('option');
        option.value = String(day).padStart(2, '0');
        option.textContent = `${day}日`;
        if (day === 31) option.selected = true;
        dateSelect.appendChild(option);
    }
}

// Show loading state
function setLoading(isLoading) {
    searchButton.disabled = isLoading;
    searchButton.innerHTML = isLoading
        ? '<span class="loading-spinner"></span>検索中...'
        : '<i class="material-icons">flight_takeoff</i>検索する';
}

// Show message
function showMessage(text, type = 'success') {
    if (!text) {
        resultMessage.style.display = 'none';
        return;
    }

    resultMessage.textContent = text;
    resultMessage.className = `result-message mb-4 ${type} fade-in`;
    resultMessage.style.display = 'block';
}

// Create table row with animation
function createFlightRow(flight, index) {
    const { codeName, airlineName, departurePlace, departureCode, arrivalPlace, arrivalCode } = flight;

    const tr = document.createElement('tr');
    tr.className = 'fade-in';
    tr.style.animationDelay = `${index * 0.03}s`;
    tr.innerHTML = `
        <td class="font-medium text-rose-600">${escapeHtml(codeName)}</td>
        <td>${escapeHtml(airlineName)}</td>
        <td>${escapeHtml(departurePlace)}</td>
        <td class="hidden lg:table-cell text-gray-500">${escapeHtml(departureCode)}</td>
        <td>${escapeHtml(arrivalPlace)}</td>
        <td class="hidden lg:table-cell text-gray-500">${escapeHtml(arrivalCode)}</td>
    `;

    // Add click handler for modal
    tr.addEventListener('click', () => {
        FlightModal.open(flight);
    });

    return tr;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Search flights
async function searchFlights() {
    const month = monthSelect.value;
    const date = dateSelect.value;
    const birthday = month + date;

    setLoading(true);
    showMessage('');
    tableBody.innerHTML = '';
    resultsSection.style.display = 'none';

    try {
        const db = firebase.database();
        const snapshot = await db.ref(birthday).once('value');

        const flights = [];
        snapshot.forEach((childSnapshot) => {
            flights.push({
                codeName: childSnapshot.key,
                arrivalCode: childSnapshot.child('A_code').val(),
                arrivalPlace: childSnapshot.child('A_place').val(),
                airlineName: childSnapshot.child('AirName').val(),
                departureCode: childSnapshot.child('D_code').val(),
                departurePlace: childSnapshot.child('D_place').val()
            });
        });

        if (flights.length === 0) {
            showMessage(`${month}月${parseInt(date)}日のフライトは見つかりませんでした。`, 'empty');
            resultsSection.style.display = 'none';
        } else {
            showMessage(`${month}月${parseInt(date)}日のフライトが ${flights.length}件 見つかりました！`, 'success');
            resultsSection.style.display = 'block';
            resultsSection.className = 'card overflow-hidden mb-6 fade-in';

            flights.forEach((flight, index) => {
                tableBody.appendChild(createFlightRow(flight, index));
            });
        }
    } catch (error) {
        console.error('Search error:', error);
        showMessage('検索中にエラーが発生しました。しばらくしてからお試しください。', 'error');
        resultsSection.style.display = 'none';
    } finally {
        setLoading(false);
    }
}

// Event listeners
searchButton.addEventListener('click', searchFlights);

// Allow Enter key to search
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !searchButton.disabled) {
        searchFlights();
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeSelects();
    FlightModal.init();
});
