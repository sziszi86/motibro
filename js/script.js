document.getElementById("save-entry").addEventListener("click", function() {
    const date = document.getElementById("date").value;
    const startTime = document.getElementById("start-time").value;
    const endTime = document.getElementById("end-time").value;
    const description = document.getElementById("description").value;
    const tag = document.getElementById("tag").value;

    if (!date || !startTime || !endTime || !description) {
        alert("Minden mezőt ki kell tölteni!");
        return;
    }

    const entry = { date, startTime, endTime, description, tag };
    saveEntry(entry);
});

function saveEntry(entry) {
    const entries = JSON.parse(localStorage.getItem("entries")) || [];
    entries.push(entry);
    localStorage.setItem("entries", JSON.stringify(entries));
    loadEntries();
    alert("Bejegyzés sikeresen mentve!");
}

function loadEntries() {
    const entries = JSON.parse(localStorage.getItem("entries")) || [];
    displayEntries(entries);
    generateSummaryChart(entries);
    updateTagFilter(entries);
}

function displayEntries(entries) {
    const entryList = document.getElementById("entry-list");
    entryList.innerHTML = `
        <table class="min-w-full bg-white border">
            <thead>
                <tr>
                    <th class="py-2 px-4 border-b">Dátum</th>
                    <th class="py-2 px-4 border-b">Munkaidő</th>
                    <th class="py-2 px-4 border-b">Leírás</th>
                    <th class="py-2 px-4 border-b">Címke</th>
                    <th class="py-2 px-4 border-b">Műveletek</th>
                </tr>
            </thead>
            <tbody>
                ${entries.map((entry, index) => `
                    <tr>
                        <td class="py-2 px-4 border-b">${entry.date}</td>
                        <td class="py-2 px-4 border-b">${entry.startTime} - ${entry.endTime}</td>
                        <td class="py-2 px-4 border-b">${entry.description}</td>
                        <td class="py-2 px-4 border-b">${entry.tag}</td>
                        <td class="py-2 px-4 border-b text-center">
                            <button onclick="editEntry(${index})" class="text-blue-500 hover:text-blue-700"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteEntry(${index})" class="text-red-500 hover:text-red-700"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function editEntry(index) {
    const entries = JSON.parse(localStorage.getItem("entries")) || [];
    const entry = entries[index];

    const entryDiv = document.getElementById("entry-list");
    entryDiv.innerHTML = `
        <input type="date" value="${entry.date}" onchange="updateEntry(${index}, 'date', this.value)" class="input-field"/>
        <input type="time" value="${entry.startTime}" onchange="updateEntry(${index}, 'startTime', this.value)" class="input-field"/> - 
        <input type="time" value="${entry.endTime}" onchange="updateEntry(${index}, 'endTime', this.value)" class="input-field"/>
        <input type="text" value="${entry.description}" onchange="updateEntry(${index}, 'description', this.value)" class="input-field"/>
        <input type="text" value="${entry.tag}" onchange="updateEntry(${index}, 'tag', this.value)" class="input-field"/>
        <button onclick="loadEntries()" class="btn-primary mt-4">Vissza</button>
    `;
}

function updateEntry(index, field, value) {
    const entries = JSON.parse(localStorage.getItem("entries")) || [];
    entries[index][field] = value;
    localStorage.setItem("entries", JSON.stringify(entries));
    loadEntries();
}

function deleteEntry(index) {
    const entries = JSON.parse(localStorage.getItem("entries")) || [];
    entries.splice(index, 1);
    localStorage.setItem("entries", JSON.stringify(entries));
    loadEntries();
}

function updateDateInput() {
    const view = document.getElementById("view-selector").value;
    document.getElementById("date-filter").classList.add("hidden");
    document.getElementById("month-filter-group").classList.add("hidden");

    if (view === "daily") {
        document.getElementById("date-filter").classList.remove("hidden");
    } else if (view === "weekly") {
        // Heti nézet: nincs külön bemeneti mező
    } else if (view === "monthly") {
        document.getElementById("month-filter-group").classList.remove("hidden");
        populateYearFilter();
    }
}

function populateYearFilter() {
    const yearFilter = document.getElementById("year-filter");
    const currentYear = new Date().getFullYear();
    yearFilter.innerHTML = "";
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i;
        yearFilter.appendChild(option);
    }
}

function filterEntries() {
    const view = document.getElementById("view-selector").value;
    const tagFilter = document.getElementById("tag-filter").value;
    const selectedDate = new Date(document.getElementById("date-filter").value);
    const selectedYear = document.getElementById("year-filter").value;
    const selectedMonth = document.getElementById("month-filter").value;

    const entries = JSON.parse(localStorage.getItem("entries")) || [];
    let filteredEntries = entries;

    if (tagFilter) {
        filteredEntries = filteredEntries.filter(entry => entry.tag.toLowerCase() === tagFilter.toLowerCase());
    }

    if (view === "daily" && selectedDate) {
        filteredEntries = filteredEntries.filter(entry => dateFns.isSameDay(new Date(entry.date), selectedDate));
    } else if (view === "weekly") {
        const currentWeekStart = dateFns.startOfWeek(new Date(), { weekStartsOn: 1 });
        filteredEntries = filteredEntries.filter(entry => dateFns.isSameWeek(new Date(entry.date), currentWeekStart, { weekStartsOn: 1 }));
    } else if (view === "monthly" && selectedYear && selectedMonth) {
        filteredEntries = filteredEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.getFullYear() === parseInt(selectedYear) && entryDate.getMonth() === parseInt(selectedMonth);
        });
    }

    displayEntries(filteredEntries);
    generateSummaryChart(filteredEntries);
}

function generateSummaryChart(entries) {
    const labels = [];
    const data = [];

    entries.forEach(entry => {
        const duration = dateFns.differenceInMinutes(new Date(`1970-01-01T${entry.endTime}`), new Date(`1970-01-01T${entry.startTime}`));
        if (!labels.includes(entry.date)) {
            labels.push(entry.date);
            data.push(duration);
        } else {
            data[labels.indexOf(entry.date)] += duration;
        }
    });

    const ctx = document.getElementById("summary-chart").getContext("2d");

    if (window.summaryChart) {
        window.summaryChart.destroy();
    }

    window.summaryChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Munkaidő (percben)",
                data: data,
                backgroundColor: "rgba(59, 130, 246, 0.6)",
                borderColor: "rgba(59, 130, 246, 1)",
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateTagFilter(entries) {
    const tagFilter = document.getElementById("tag-filter");
    const uniqueTags = [...new Set(entries.map(entry => entry.tag).filter(tag => tag))];
    tagFilter.innerHTML = '<option value="">Összes címke</option>';
    uniqueTags.forEach(tag => {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
    });
}

loadEntries();
