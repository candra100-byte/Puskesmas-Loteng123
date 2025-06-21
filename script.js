// Data Storage
let patients = JSON.parse(localStorage.getItem('patients')) || [];
let medicalRecords = JSON.parse(localStorage.getItem('medicalRecords')) || [];
let satisfactionData = JSON.parse(localStorage.getItem('satisfactionData')) || [];
let activities = JSON.parse(localStorage.getItem('activities')) || [];
let currentUser = null;

// Performance monitoring
let performanceMetrics = {
    pageLoadTime: 0,
    errorCount: 0,
    lastError: null,
    userInteractions: 0
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    // Measure page load time
    performanceMetrics.pageLoadTime = performance.now();

    initializeApp();
    setInterval(updateDateTime, 1000);
    updateDateTime();

    // Setup error handling
    setupErrorHandling();

    // Setup auto-save
    setupAutoSave();

    // Setup connection monitoring
    setupConnectionMonitoring();

    console.log(`📊 Page loaded in ${performanceMetrics.pageLoadTime.toFixed(2)}ms`);
});

// Error handling setup
function setupErrorHandling() {
    window.addEventListener('error', function(event) {
        performanceMetrics.errorCount++;
        performanceMetrics.lastError = {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            timestamp: new Date().toISOString()
        };

        console.error('Application Error:', event.error);
        showErrorMessage('Terjadi kesalahan pada aplikasi. Tim teknis akan segera memperbaiki.');
    });

    window.addEventListener('unhandledrejection', function(event) {
        performanceMetrics.errorCount++;
        console.error('Unhandled Promise Rejection:', event.reason);
        showErrorMessage('Terjadi kesalahan pada proses data. Silakan coba lagi.');
    });
}

// Auto-save functionality
function setupAutoSave() {
    setInterval(() => {
        // Auto-save form data yang sedang diisi
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const formData = new FormData(form);
            const formObject = {};
            formData.forEach((value, key) => {
                if (value.trim()) {
                    formObject[key] = value;
                }
            });

            if (Object.keys(formObject).length > 0) {
                localStorage.setItem(`autosave_${form.id}`, JSON.stringify(formObject));
            }
        });
    }, 30000); // Auto-save setiap 30 detik
}

// Enhanced connection monitoring
function setupConnectionMonitoring() {
    let isOnline = navigator.onLine;
    let consecutiveFailures = 0;

    window.addEventListener('online', () => {
        if (!isOnline) {
            showSuccessMessage('Koneksi internet pulih. Data akan disinkronkan.');
            syncOfflineData();
            consecutiveFailures = 0;
        }
        isOnline = true;
    });

    window.addEventListener('offline', () => {
        showErrorMessage('Koneksi internet terputus. Mode offline aktif.');
        isOnline = false;
    });

    // Enhanced connectivity monitoring
    setInterval(async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('/ping', { 
                method: 'GET',
                signal: controller.signal,
                cache: 'no-cache'
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                if (consecutiveFailures > 0) {
                    showSuccessMessage('Koneksi server pulih normal.');
                    consecutiveFailures = 0;
                }
            } else {
                consecutiveFailures++;
                if (consecutiveFailures >= 3) {
                    showErrorMessage('Server mengalami gangguan. Tim teknis sedang memperbaiki.');
                }
            }
        } catch (error) {
            consecutiveFailures++;
            if (consecutiveFailures >= 2 && isOnline) {
                showErrorMessage('Koneksi tidak stabil. Periksa jaringan internet Anda.');
            }
        }
    }, 30000); // Check setiap 30 detik

    // Keep-alive ping to maintain server connection
    setInterval(async () => {
        try {
            await fetch('/keepalive', { method: 'GET', cache: 'no-cache' });
        } catch (error) {
            console.log('Keep-alive ping failed:', error.message);
        }
    }, 120000); // Ping setiap 2 menit
}

// Sync offline data
function syncOfflineData() {
    // Sinkronisasi data yang disimpan offline
    try {
        localStorage.setItem('patients', JSON.stringify(patients));
        localStorage.setItem('medicalRecords', JSON.stringify(medicalRecords));
        localStorage.setItem('satisfactionData', JSON.stringify(satisfactionData));
        addActivity('Data berhasil disinkronkan setelah koneksi pulih');
    } catch (error) {
        console.error('Error syncing offline data:', error);
    }
}

function initializeApp() {
    // Check if user is logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
    } else {
        showLoginModal();
    }

    // Initialize event listeners
    initializeEventListeners();

    // Load initial data
    loadDashboardData();
    loadPatientsTable();
    loadSatisfactionData();
}

function initializeEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Registration form
    document.getElementById('registrationForm').addEventListener('submit', handleRegistration);

    // Medical record form
    document.getElementById('medicalRecordForm').addEventListener('submit', handleMedicalRecord);

    // Satisfaction form
    document.getElementById('satisfactionForm').addEventListener('submit', handleSatisfaction);

    // Star ratings
    initializeStarRatings();
}

// User Management System
let systemUsers = JSON.parse(localStorage.getItem('systemUsers')) || {
    'admin': { type: 'admin', name: 'Administrator', password: 'admin123', canEdit: true },
    'dokter1': { type: 'dokter', name: 'Dr. Ahmad Hidayat', password: 'dokter123', canEdit: true },
    'dokter2': { type: 'dokter', name: 'Dr. Siti Nurhaliza', password: 'dokter123', canEdit: true },
    'dokter3': { type: 'dokter', name: 'Dr. Budi Santoso', password: 'dokter123', canEdit: true },
    'staf1': { type: 'staf', name: 'Siti Nurhaliza', password: 'staf123', canEdit: true },
    'staf2': { type: 'staf', name: 'Ahmad Rahman', password: 'staf123', canEdit: true },
    'pasien1': { type: 'pasien', name: 'Budi Santoso', password: 'pasien123', canEdit: false },
    'pasien2': { type: 'pasien', name: 'Dewi Sartika', password: 'pasien123', canEdit: false },
    'pasien3': { type: 'pasien', name: 'Muhammad Ali', password: 'pasien123', canEdit: false }
};

// Save initial users to localStorage
localStorage.setItem('systemUsers', JSON.stringify(systemUsers));

// Authentication Functions
function handleLogin(e) {
    e.preventDefault();

    const userType = document.getElementById('userType').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (systemUsers[username] && systemUsers[username].password === password && systemUsers[username].type === userType) {
        currentUser = {
            username: username,
            type: userType,
            name: systemUsers[username].name,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        addActivity(`Login: ${currentUser.name} (${userType})`);
        showMainApp();
    } else {
        alert('Username, password, atau tipe pengguna tidak valid!');
    }
}

function logout() {
    addActivity(`Logout: ${currentUser.name}`);
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLoginModal();
}

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('currentUser').textContent = currentUser.name;

    // Show/hide sections based on user type
    updateUIBasedOnUserType();
}

function updateUIBasedOnUserType() {
    const userType = currentUser.type;
    const navItems = document.querySelectorAll('.nav-item');

    // Show all sections for admin and staf
    if (userType === 'admin' || userType === 'staf') {
        navItems.forEach(item => item.style.display = 'block');
    } 
    // Limited access for dokter
    else if (userType === 'dokter') {
        navItems.forEach(item => {
            const href = item.getAttribute('onclick');
            if (href && (href.includes('dashboard') || href.includes('medical-records') || 
                        href.includes('patients') || href.includes('satisfaction') || 
                        href.includes('immunization') || href.includes('sms-gateway') || 
                        href.includes('user-management'))) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    // Very limited access for pasien
    else if (userType === 'pasien') {
        navItems.forEach(item => {
            const href = item.getAttribute('onclick');
            if (href && (href.includes('dashboard') || href.includes('satisfaction'))) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
}

// Navigation Functions
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionId).classList.add('active');

    // Add active class to nav item
    event.target.classList.add('active');

    // Load section-specific data
    loadSectionData(sectionId);
}

function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'registration':
            loadTodayRegistrations();
            break;
        case 'medical-records':
            break;
        case 'patients':
            loadPatientsTable();
            break;
        case 'satisfaction':
            loadSatisfactionData();
            break;
        case 'reports':
            break;
        case 'user-management':
            loadUserManagement();
            break;
    }
}

// Dashboard Functions
function loadDashboardData() {
    // Update statistics
    document.getElementById('totalPatients').textContent = patients.length;

    const today = new Date().toDateString();
    const todayVisits = medicalRecords.filter(record => 
        new Date(record.date).toDateString() === today
    ).length;
    document.getElementById('todayVisits').textContent = todayVisits;

    document.getElementById('activeDoctors').textContent = '3';

    const avgSatisfaction = calculateAverageSatisfaction();
    document.getElementById('avgSatisfaction').textContent = avgSatisfaction.toFixed(1);

    // Load recent activities
    loadRecentActivities();
}

function loadRecentActivities() {
    const activitiesContainer = document.getElementById('recentActivities');
    activitiesContainer.innerHTML = '';

    const recentActivities = activities.slice(-10).reverse();

    recentActivities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <i class="fas fa-clock"></i>
            <div>
                <strong>${activity.action}</strong>
                <br>
                <small>${formatDateTime(activity.timestamp)}</small>
            </div>
        `;
        activitiesContainer.appendChild(activityItem);
    });
}

function addActivity(action) {
    const activity = {
        action: action,
        timestamp: new Date().toISOString(),
        user: currentUser ? currentUser.name : 'System'
    };

    activities.push(activity);
    localStorage.setItem('activities', JSON.stringify(activities));
}

// Registration Functions
function handleRegistration(e) {
    e.preventDefault();

    const patient = {
        id: generateId(),
        name: document.getElementById('patientName').value,
        nik: document.getElementById('patientNIK').value,
        birthDate: document.getElementById('patientBirth').value,
        gender: document.getElementById('patientGender').value,
        address: document.getElementById('patientAddress').value,
        phone: document.getElementById('patientPhone').value,
        visitType: document.getElementById('visitType').value,
        registrationDate: new Date().toISOString(),
        status: 'registered'
    };

    patients.push(patient);
    localStorage.setItem('patients', JSON.stringify(patients));

    addActivity(`Pendaftaran pasien baru: ${patient.name}`);

    showSuccessMessage('Pasien berhasil didaftarkan!');
    document.getElementById('registrationForm').reset();
    loadTodayRegistrations();
    loadDashboardData();
}

function loadTodayRegistrations() {
    const container = document.getElementById('todayRegistrations');
    container.innerHTML = '';

    const today = new Date().toDateString();
    const todayPatients = patients.filter(patient => 
        new Date(patient.registrationDate).toDateString() === today
    );

    todayPatients.forEach(patient => {
        const item = document.createElement('div');
        item.className = 'registration-item';
        item.innerHTML = `
            <div>
                <strong>${patient.name}</strong> - ${patient.nik}
                <br>
                <small>${patient.visitType} | ${formatDateTime(patient.registrationDate)}</small>
            </div>
            <span class="badge ${patient.status === 'completed' ? 'badge-success' : 'badge-warning'}">
                ${patient.status === 'completed' ? 'Selesai' : 'Menunggu'}
            </span>
        `;
        container.appendChild(item);
    });
}

// Medical Records Functions
function searchMedicalRecords() {
    const searchTerm = document.getElementById('searchMedical').value.toLowerCase();
    const resultsContainer = document.getElementById('searchResults');

    if (!searchTerm) {
        resultsContainer.innerHTML = '<p>Masukkan kata kunci pencarian</p>';
        return;
    }

    const matchingPatients = patients.filter(patient => 
        patient.name.toLowerCase().includes(searchTerm) ||
        patient.nik.includes(searchTerm) ||
        patient.id.includes(searchTerm)
    );

    resultsContainer.innerHTML = '';

    if (matchingPatients.length === 0) {
        resultsContainer.innerHTML = '<p>Tidak ada pasien yang ditemukan</p>';
        return;
    }

    matchingPatients.forEach(patient => {
        const patientRecords = medicalRecords.filter(record => record.patientId === patient.id);

        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.onclick = () => selectPatientForMedicalRecord(patient);
        item.innerHTML = `
            <div>
                <strong>${patient.name}</strong> - NIK: ${patient.nik}
                <br>
                <small>Tanggal Lahir: ${formatDate(patient.birthDate)} | 
                Riwayat Kunjungan: ${patientRecords.length} kali</small>
            </div>
        `;
        resultsContainer.appendChild(item);
    });
}

function selectPatientForMedicalRecord(patient) {
    document.getElementById('medicalPatientId').value = patient.id;
    document.getElementById('medicalDate').value = getCurrentDateTime();
    document.getElementById('medicalForm').style.display = 'block';

    // Scroll to form
    document.getElementById('medicalForm').scrollIntoView({ behavior: 'smooth' });
}

function handleMedicalRecord(e) {
    e.preventDefault();

    const record = {
        id: generateId(),
        patientId: document.getElementById('medicalPatientId').value,
        date: document.getElementById('medicalDate').value,
        doctor: document.getElementById('medicalDoctor').value,
        complaints: document.getElementById('complaints').value,
        diagnosis: document.getElementById('diagnosis').value,
        treatment: document.getElementById('treatment').value,
        notes: document.getElementById('notes').value,
        status: 'in-progress',
        createdBy: currentUser.name,
        createdAt: new Date().toISOString()
    };

    medicalRecords.push(record);
    localStorage.setItem('medicalRecords', JSON.stringify(medicalRecords));

    const patient = patients.find(p => p.id === record.patientId);
    addActivity(`Rekam medis dibuat untuk: ${patient.name}`);

    showSuccessMessage('Rekam medis berhasil disimpan!');
    document.getElementById('medicalRecordForm').reset();
    document.getElementById('medicalForm').style.display = 'none';
    loadDashboardData();
}

function markAsCompleted() {
    const patientId = document.getElementById('medicalPatientId').value;

    if (!patientId) {
        alert('Pilih pasien terlebih dahulu!');
        return;
    }

    // Update patient status
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
        patient.status = 'completed';
        localStorage.setItem('patients', JSON.stringify(patients));
    }

    // Update latest medical record status
    const latestRecord = medicalRecords
        .filter(r => r.patientId === patientId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    if (latestRecord) {
        latestRecord.status = 'completed';
        localStorage.setItem('medicalRecords', JSON.stringify(medicalRecords));
    }

    addActivity(`Pemeriksaan selesai: ${patient.name}`);
    showSuccessMessage('Pemeriksaan ditandai sebagai selesai!');

    document.getElementById('medicalForm').style.display = 'none';
    loadTodayRegistrations();
}

// Patients Functions
function loadPatientsTable() {
    const tbody = document.getElementById('patientsTableBody');
    tbody.innerHTML = '';

    patients.forEach(patient => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${patient.id}</td>
            <td>${patient.name}</td>
            <td>${patient.nik}</td>
            <td>${formatDate(patient.birthDate)}</td>
            <td>${patient.address}</td>
            <td>${patient.phone}</td>
            <td>
                <button onclick="viewPatientHistory('${patient.id}')" class="btn-primary btn-sm">
                    <i class="fas fa-history"></i> Riwayat
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function viewPatientHistory(patientId) {
    const patient = patients.find(p => p.id === patientId);
    const records = medicalRecords.filter(r => r.patientId === patientId);

    let historyHtml = `
        <h3>Riwayat Medis: ${patient.name}</h3>
        <div class="patient-info">
            <p><strong>NIK:</strong> ${patient.nik}</p>
            <p><strong>Tanggal Lahir:</strong> ${formatDate(patient.birthDate)}</p>
            <p><strong>Alamat:</strong> ${patient.address}</p>
        </div>
        <h4>Riwayat Kunjungan:</h4>
    `;

    if (records.length === 0) {
        historyHtml += '<p>Belum ada riwayat kunjungan</p>';
    } else {
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        records.forEach(record => {
            historyHtml += `
                <div class="medical-record-item">
                    <p><strong>Tanggal:</strong> ${formatDateTime(record.date)}</p>
                    <p><strong>Dokter:</strong> ${record.doctor}</p>
                    <p><strong>Keluhan:</strong> ${record.complaints}</p>
                    <p><strong>Diagnosis:</strong> ${record.diagnosis}</p>
                    <p><strong>Pengobatan:</strong> ${record.treatment}</p>
                    ${record.notes ? `<p><strong>Catatan:</strong> ${record.notes}</p>` : ''}
                    <p><strong>Status:</strong> 
                        <span class="badge ${record.status === 'completed' ? 'badge-success' : 'badge-warning'}">
                            ${record.status === 'completed' ? 'Selesai' : 'Dalam Proses'}
                        </span>
                    </p>
                    <hr>
                </div>
            `;
        });
    }

    // Show in modal or new window
    const newWindow = window.open('', '_blank', 'width=800,height=600');
    newWindow.document.write(`
        <html>
            <head>
                <title>Riwayat Medis - ${patient.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .medical-record-item { margin: 15px 0; padding: 15px; background: #f9f9f9; border-radius: 5px; }
                    .badge { padding: 5px 10px; border-radius: 3px; color: white; font-size: 12px; }
                    .badge-success { background: #28a745; }
                    .badge-warning { background: #ffc107; color: #333; }
                    @media print { button { display: none; } }
                </style>
            </head>
            <body>
                ${historyHtml}
                <button onclick="window.print()">Cetak</button>
                <button onclick="window.close()">Tutup</button>
            </body>
        </html>
    `);
}

// Satisfaction Functions
function initializeStarRatings() {
    document.querySelectorAll('.stars').forEach(starsContainer => {
        const stars = starsContainer.querySelectorAll('i');

        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                const rating = index + 1;
                const ratingType = starsContainer.dataset.rating;

                // Update visual state
                stars.forEach((s, i) => {
                    if (i < rating) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });

                // Store rating
                starsContainer.dataset.value = rating;
            });

            star.addEventListener('mouseover', () => {
                stars.forEach((s, i) => {
                    if (i <= index) {
                        s.style.color = '#ffc107';
                    } else {
                        s.style.color = '#ddd';
                    }
                });
            });
        });

        starsContainer.addEventListener('mouseleave', () => {
            const currentRating = parseInt(starsContainer.dataset.value) || 0;
            stars.forEach((s, i) => {
                if (i < currentRating) {
                    s.style.color = '#ffc107';
                } else {
                    s.style.color = '#ddd';
                }
            });
        });
    });
}

function handleSatisfaction(e) {
    e.preventDefault();

    const speedRating = document.querySelector('[data-rating="speed"]').dataset.value || 0;
    const friendlinessRating = document.querySelector('[data-rating="friendliness"]').dataset.value || 0;
    const cleanlinessRating = document.querySelector('[data-rating="cleanliness"]').dataset.value || 0;

    if (!speedRating || !friendlinessRating || !cleanlinessRating) {
        alert('Harap berikan penilaian untuk semua kategori!');
        return;
    }

    const satisfaction = {
        id: generateId(),
        patientName: document.getElementById('satisfactionPatient').value,
        ratings: {
            speed: parseInt(speedRating),
            friendliness: parseInt(friendlinessRating),
            cleanliness: parseInt(cleanlinessRating)
        },
        comments: document.getElementById('satisfactionComments').value,
        date: new Date().toISOString(),
        submittedBy: currentUser.name
    };

    satisfaction.averageRating = (satisfaction.ratings.speed + 
                                 satisfaction.ratings.friendliness + 
                                 satisfaction.ratings.cleanliness) / 3;

    satisfactionData.push(satisfaction);
    localStorage.setItem('satisfactionData', JSON.stringify(satisfactionData));

    addActivity(`Penilaian kepuasan dari: ${satisfaction.patientName}`);

    showSuccessMessage('Terima kasih atas penilaian Anda!');
    document.getElementById('satisfactionForm').reset();

    // Reset star ratings
    document.querySelectorAll('.stars i').forEach(star => {
        star.classList.remove('active');
        star.style.color = '#ddd';
    });
    document.querySelectorAll('.stars').forEach(container => {
        container.dataset.value = '0';
    });

    loadSatisfactionData();
}

function loadSatisfactionData() {
    // Update statistics
    document.getElementById('satisfactionTotal').textContent = satisfactionData.length;

    const avgSatisfaction = calculateAverageSatisfaction();
    document.getElementById('satisfactionAverage').textContent = avgSatisfaction.toFixed(1);

    // Load satisfaction list
    const container = document.getElementById('satisfactionList');
    container.innerHTML = '';

    satisfactionData.slice(-10).reverse().forEach(item => {
        const satisfactionItem = document.createElement('div');
        satisfactionItem.className = 'satisfaction-item';
        satisfactionItem.innerHTML = `
            <div>
                <strong>${item.patientName}</strong>
                <div class="rating-display">
                    <span>Kecepatan: ${generateStars(item.ratings.speed)}</span>
                    <span>Keramahan: ${generateStars(item.ratings.friendliness)}</span>
                    <span>Kebersihan: ${generateStars(item.ratings.cleanliness)}</span>
                </div>
                <p><strong>Rata-rata:</strong> ${item.averageRating.toFixed(1)}/5</p>
                ${item.comments ? `<p><strong>Komentar:</strong> ${item.comments}</p>` : ''}
                <small>${formatDateTime(item.date)}</small>
            </div>
        `;
        container.appendChild(satisfactionItem);
    });
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star" style="color: #ffc107;"></i>';
        } else {
            stars += '<i class="fas fa-star" style="color: #ddd;"></i>';
        }
    }
    return stars;
}

function calculateAverageSatisfaction() {
    if (satisfactionData.length === 0) return 0;

    const total = satisfactionData.reduce((sum, item) => sum + item.averageRating, 0);
    return total / satisfactionData.length;
}

// Export Functions
function exportData(type) {
    let data, filename;

    switch(type) {
        case 'registration':
            data = patients;
            filename = 'data_pendaftaran.json';
            break;
        case 'medical-records':
            data = medicalRecords;
            filename = 'rekam_medis.json';
            break;
        case 'patients':
            data = patients;
            filename = 'data_pasien.json';
            break;
        case 'satisfaction':
            data = satisfactionData;
            filename = 'data_kepuasan.json';
            break;
        default:
            alert('Tipe data tidak valid');
            return;
    }

    // Convert to CSV for better compatibility
    const csv = convertToCSV(data, type);
    downloadFile(csv, filename.replace('.json', '.csv'), 'text/csv');

    addActivity(`Export data: ${type}`);
    showSuccessMessage('Data berhasil diexport!');
}

function convertToCSV(data, type) {
    if (data.length === 0) return '';

    let headers, rows;

    switch(type) {
        case 'registration':
        case 'patients':
            headers = ['ID', 'Nama', 'NIK', 'Tanggal Lahir', 'Jenis Kelamin', 'Alamat', 'Telepon', 'Jenis Kunjungan', 'Tanggal Daftar', 'Status'];
            rows = data.map(p => [
                p.id, p.name, p.nik, p.birthDate, p.gender, p.address, p.phone, p.visitType, p.registrationDate, p.status
            ]);
            break;
        case 'medical-records':
            headers = ['ID', 'ID Pasien', 'Tanggal', 'Dokter', 'Keluhan', 'Diagnosis', 'Pengobatan', 'Catatan', 'Status'];
            rows = data.map(r => [
                r.id, r.patientId, r.date, r.doctor, r.complaints, r.diagnosis, r.treatment, r.notes, r.status
            ]);
            break;
        case 'satisfaction':
            headers = ['ID', 'Nama Pasien', 'Rating Kecepatan', 'Rating Keramahan', 'Rating Kebersihan', 'Rata-rata', 'Komentar', 'Tanggal'];
            rows = data.map(s => [
                s.id, s.patientName, s.ratings.speed, s.ratings.friendliness, s.ratings.cleanliness, s.averageRating.toFixed(1), s.comments, s.date
            ]);
            break;
    }

    const csvContent = [headers.join(','), ...rows.map(row => row.map(field => `"${field}"`).join(','))].join('\n');
    return csvContent;
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Report Functions
function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const reportDate = document.getElementById('reportDate').value;

    if (!reportDate) {
        alert('Pilih tanggal untuk laporan!');
        return;
    }

    const reportContent = document.getElementById('reportContent');
    let html = '';

    const selectedDate = new Date(reportDate);
    let filteredData;

    switch(reportType) {
        case 'daily':
            filteredData = getDataByDate(selectedDate, 'day');
            html = generateDailyReport(filteredData, selectedDate);
            break;
        case 'monthly':
            filteredData = getDataByDate(selectedDate, 'month');
            html = generateMonthlyReport(filteredData, selectedDate);
            break;
        case 'yearly':
            filteredData = getDataByDate(selectedDate, 'year');
            html = generateYearlyReport(filteredData, selectedDate);
            break;
    }

    reportContent.innerHTML = html;
    addActivity(`Generate laporan ${reportType}: ${formatDate(reportDate)}`);
}

function getDataByDate(date, period) {
    const filterFunction = (itemDate) => {
        const item = new Date(itemDate);
        switch(period) {
            case 'day':
                return item.toDateString() === date.toDateString();
            case 'month':
                return item.getMonth() === date.getMonth() && item.getFullYear() === date.getFullYear();
            case 'year':
                return item.getFullYear() === date.getFullYear();
            default:
                return false;
        }
    };

    return {
        patients: patients.filter(p => filterFunction(p.registrationDate)),
        medicalRecords: medicalRecords.filter(r => filterFunction(r.date)),
        satisfaction: satisfactionData.filter(s => filterFunction(s.date))
    };
}

function generateDailyReport(data, date) {
    return `
        <h3>Laporan Harian - ${formatDate(date.toISOString())}</h3>
        <div class="report-stats">
            <div class="stat-item">
                <strong>Pendaftaran:</strong> ${data.patients.length} pasien
            </div>
            <div class="stat-item">
                <strong>Pemeriksaan:</strong> ${data.medicalRecords.length} kunjungan
            </div>
            <div class="stat-item">
                <strong>Penilaian Kepuasan:</strong> ${data.satisfaction.length} responden
            </div>
        </div>
        <button onclick="window.print()" class="btn-primary">
            <i class="fas fa-print"></i> Cetak Laporan
        </button>
    `;
}

function generateMonthlyReport(data, date) {
    const monthName = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    return `
        <h3>Laporan Bulanan - ${monthName}</h3>
        <div class="report-stats">
            <div class="stat-item">
                <strong>Total Pendaftaran:</strong> ${data.patients.length} pasien
            </div>
            <div class="stat-item">
                <strong>Total Pemeriksaan:</strong> ${data.medicalRecords.length} kunjungan
            </div>
            <div class="stat-item">
                <strong>Total Penilaian:</strong> ${data.satisfaction.length} responden
            </div>
            <div class="stat-item">
                <strong>Rata-rata Kepuasan:</strong> ${data.satisfaction.length > 0 ? 
                    (data.satisfaction.reduce((sum, s) => sum + s.averageRating, 0) / data.satisfaction.length).toFixed(1) : 0}/5
            </div>
        </div>
        <button onclick="window.print()" class="btn-primary">
            <i class="fas fa-print"></i> Cetak Laporan
        </button>
    `;
}

function generateYearlyReport(data, date) {
    return `
        <h3>Laporan Tahunan - ${date.getFullYear()}</h3>
        <div class="report-stats">
            <div class="stat-item">
                <strong>Total Pendaftaran:</strong> ${data.patients.length} pasien
            </div>
            <div class="stat-item">
                <strong>Total Pemeriksaan:</strong> ${data.medicalRecords.length} kunjungan
            </div>
            <div class="stat-item">
                <strong>Total Penilaian:</strong> ${data.satisfaction.length} responden
            </div>
            <div class="stat-item">
                <strong>Rata-rata Kepuasan:</strong> ${data.satisfaction.length > 0 ? 
                    (data.satisfaction.reduce((sum, s) => sum + s.averageRating, 0) / data.satisfaction.length).toFixed(1) : 0}/5
            </div>
        </div>
        <button onclick="window.print()" class="btn-primary">
            <i class="fas fa-print"></i> Cetak Laporan
        </button>
    `;
}

// User Management Functions
function loadUserManagement() {
    const userType = currentUser.type;
    const container = document.getElementById('userManagementContent');

    if (userType === 'admin') {
        // Admin dapat melihat semua pengguna
        loadAllUsersTable();
    } else if (userType === 'dokter' || userType === 'staf') {
        // Dokter dan staf hanya dapat mengedit profil sendiri
        loadUserProfile();
    }
}

function loadAllUsersTable() {
    const container = document.getElementById('userManagementContent');

    let html = `
        <div class="user-management-admin">
            <h3>Manajemen Pengguna - Admin</h3>
            <button onclick="showAddUserForm()" class="btn-primary">
                <i class="fas fa-user-plus"></i> Tambah Pengguna Baru
            </button>

            <div id="addUserForm" style="display: none;" class="add-user-form">
                <h4>Tambah Pengguna Baru</h4>
                <form id="newUserForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="newUsername">Username:</label>
                            <input type="text" id="newUsername" required>
                        </div>
                        <div class="form-group">
                            <label for="newUserType">Tipe Pengguna:</label>
                            <select id="newUserType" required>
                                <option value="">Pilih Tipe</option>
                                <option value="admin">Administrator</option>
                                <option value="dokter">Dokter</option>
                                <option value="staf">Staf</option>
                                <option value="pasien">Pasien</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="newName">Nama Lengkap:</label>
                            <input type="text" id="newName" required>
                        </div>
                        <div class="form-group">
                            <label for="newPassword">Password:</label>
                            <input type="password" id="newPassword" required>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Simpan Pengguna
                        </button>
                        <button type="button" onclick="cancelAddUser()" class="btn-secondary">
                            <i class="fas fa-times"></i> Batal
                        </button>
                    </div>
                </form>
            </div>

            <div class="users-table">
                <table>
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Nama</th>
                            <th>Tipe</th>
                            <th>Password</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    populateUsersTable();

    // Setup form handler
    document.getElementById('newUserForm').addEventListener('submit', handleAddUser);
}

function populateUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    Object.keys(systemUsers).forEach(username => {
        const user = systemUsers[username];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${username}</td>
            <td>${user.name}</td>
            <td>
                <span class="badge badge-${user.type === 'admin' ? 'danger' : user.type === 'dokter' ? 'primary' : user.type === 'staf' ? 'success' : 'warning'}">
                    ${user.type.toUpperCase()}
                </span>
            </td>
            <td>
                <span class="password-display" id="pwd_${username}">••••••••</span>
                <button onclick="togglePassword('${username}')" class="btn-sm btn-secondary">
                    <i class="fas fa-eye" id="eye_${username}"></i>
                </button>
            </td>
            <td>
                <button onclick="editUser('${username}')" class="btn-primary btn-sm">
                    <i class="fas fa-edit"></i> Edit
                </button>
                ${username !== currentUser.username ? `
                <button onclick="deleteUser('${username}')" class="btn-danger btn-sm">
                    <i class="fas fa-trash"></i> Hapus
                </button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadUserProfile() {
    const container = document.getElementById('userManagementContent');
    const user = systemUsers[currentUser.username];

    let html = `
        <div class="user-profile">
            <h3>Profil Pengguna</h3>
            <form id="profileForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="profileUsername">Username:</label>
                        <input type="text" id="profileUsername" value="${currentUser.username}" readonly>
                    </div>
                    <div class="form-group">
                        <label for="profileType">Tipe Pengguna:</label>
                        <input type="text" id="profileType" value="${user.type.toUpperCase()}" readonly>
                    </div>
                </div>
                <div class="form-group">
                    <label for="profileName">Nama Lengkap:</label>
                    <input type="text" id="profileName" value="${user.name}" required>
                </div>
                <div class="form-group">
                    <label for="currentPassword">Password Saat Ini:</label>
                    <input type="password" id="currentPassword" required>
                </div>
                <div class="form-group">
                    <label for="newPassword">Password Baru (kosongkan jika tidak ingin mengubah):</label>
                    <input type="password" id="newPassword">
                </div>
                <div class="form-group">
                    <label for="confirmPassword">Konfirmasi Password Baru:</label>
                    <input type="password" id="confirmPassword">
                </div>
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Simpan Perubahan
                </button>
            </form>
        </div>
    `;

    container.innerHTML = html;
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
}

function showAddUserForm() {
    document.getElementById('addUserForm').style.display = 'block';
    document.getElementById('newUsername').focus();
}

function cancelAddUser() {
    document.getElementById('addUserForm').style.display = 'none';
    document.getElementById('newUserForm').reset();
}

function handleAddUser(e) {
    e.preventDefault();

    const username = document.getElementById('newUsername').value;
    const userType = document.getElementById('newUserType').value;
    const name = document.getElementById('newName').value;
    const password = document.getElementById('newPassword').value;

    if (systemUsers[username]) {
        alert('Username sudah ada! Pilih username lain.');
        return;
    }

    systemUsers[username] = {
        type: userType,
        name: name,
        password: password,
        canEdit: userType !== 'pasien'
    };

    localStorage.setItem('systemUsers', JSON.stringify(systemUsers));
    addActivity(`Admin menambah pengguna baru: ${name} (${userType})`);

    showSuccessMessage('Pengguna baru berhasil ditambahkan!');
    cancelAddUser();
    populateUsersTable();
}

function togglePassword(username) {
    const passwordDisplay = document.getElementById(`pwd_${username}`);
    const eyeIcon = document.getElementById(`eye_${username}`);

    if (passwordDisplay.textContent === '••••••••') {
        passwordDisplay.textContent = systemUsers[username].password;
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordDisplay.textContent = '••••••••';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

function editUser(username) {
    const user = systemUsers[username];
    const newName = prompt('Masukkan nama baru:', user.name);

    if (newName && newName.trim()) {
        const newPassword = prompt('Masukkan password baru (kosongkan jika tidak ingin mengubah):');

        systemUsers[username].name = newName.trim();
        if (newPassword && newPassword.trim()) {
            systemUsers[username].password = newPassword;
        }

        localStorage.setItem('systemUsers', JSON.stringify(systemUsers));
        addActivity(`Admin mengubah data pengguna: ${newName}`);

        showSuccessMessage('Data pengguna berhasil diubah!');
        populateUsersTable();
    }
}

function deleteUser(username) {
    if (confirm(`Apakah Anda yakin ingin menghapus pengguna '${username}'?`)) {
        const userName = systemUsers[username].name;
        delete systemUsers[username];

        localStorage.setItem('systemUsers', JSON.stringify(systemUsers));
        addActivity(`Admin menghapus pengguna: ${userName}`);

        showSuccessMessage('Pengguna berhasil dihapus!');
        populateUsersTable();
    }
}

function handleProfileUpdate(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newName = document.getElementById('profileName').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Verify current password
    if (systemUsers[currentUser.username].password !== currentPassword) {
        alert('Password saat ini tidak benar!');
        return;
    }

    // Check new password confirmation if provided
    if (newPassword && newPassword !== confirmPassword) {
        alert('Konfirmasi password tidak cocok!');
        return;
    }

    // Update user data
    systemUsers[currentUser.username].name = newName;
    if (newPassword) {
        systemUsers[currentUser.username].password = newPassword;
    }

    // Update current user session
    currentUser.name = newName;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    document.getElementById('currentUser').textContent = newName;

    localStorage.setItem('systemUsers', JSON.stringify(systemUsers));
    addActivity(`${currentUser.name} mengubah profil`);

    showSuccessMessage('Profil berhasil diperbarui!');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

// Settings Functions
function backupData() {
    const allData = {
        patients: patients,
        medicalRecords: medicalRecords,
        satisfactionData: satisfactionData,
        activities: activities,
        backupDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(allData, null, 2);
    downloadFile(dataStr, `puskesmas_backup_${formatDate(new Date().toISOString()).replace(/\//g, '-')}.json`, 'application/json');

    addActivity('Backup database');
    showSuccessMessage('Backup berhasil dibuat!');
}

function restoreData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);

                    if (data.patients && data.medicalRecords && data.satisfactionData) {
                        patients = data.patients;
                        medicalRecords = data.medicalRecords;
                        satisfactionData = data.satisfactionData;
                        activities = data.activities || [];

                        localStorage.setItem('patients', JSON.stringify(patients));
                        localStorage.setItem('medicalRecords', JSON.stringify(medicalRecords));
                        localStorage.setItem('satisfactionData', JSON.stringify(satisfactionData));
                        localStorage.setItem('activities', JSON.stringify(activities));

                        addActivity('Restore database');
                        showSuccessMessage('Data berhasil direstore!');

                        // Refresh all displays
                        loadDashboardData();
                        loadPatientsTable();
                        loadSatisfactionData();
                    } else {
                        alert('Format file backup tidak valid!');
                    }
                } catch (error) {
                    alert('Error membaca file backup: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// Utility Functions
function generateId() {
    return 'ID' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID');
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID') + ' ' + date.toLocaleTimeString('id-ID');
}

function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function updateDateTime() {
    const now = new Date();
    const dateTimeString = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = dateTimeString;
    }
}

function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        document.body.removeChild(messageDiv);
    }, 3000);
}

function showErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'error-message';
    messageDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        document.body.removeChild(messageDiv);
    }, 3000);
}

// Initialize sample data if empty
function initializeSampleData() {
    if (patients.length === 0) {
        const samplePatients = [
            {
                id: generateId(),
                name: 'Ahmad Wijaya',
                nik: '5203010101990001',
                birthDate: '1990-01-01',
                gender: 'L',
                address: 'Jl. Raya Praya No. 123, Lombok Tengah',
                phone: '081234567890',
                visitType: 'baru',
                registrationDate: new Date().toISOString(),
                status: 'registered'
            },
            {
                id: generateId(),
                name: 'Siti Aminah',
                nik: '5203012912850002',
                birthDate: '1985-12-29',
                gender: 'P',
                address: 'Jl. Pemuda No. 45, Praya',
                phone: '081234567891',
                visitType: 'lama',
                registrationDate: new Date().toISOString(),
                status: 'completed'
            }
        ];

        patients = samplePatients;
        localStorage.setItem('patients', JSON.stringify(patients));
    }
}

// Automatic backup system
function setupAutomaticBackup() {
    setInterval(() => {
        try {
            const backupData = {
                patients: patients,
                medicalRecords: medicalRecords,
                satisfactionData: satisfactionData,
                activities: activities,
                backupDate: new Date().toISOString(),
                version: '1.0.0'
            };

            localStorage.setItem('auto_backup', JSON.stringify(backupData));
            console.log('✅ Auto backup completed at', new Date().toISOString());
        } catch (error) {
            console.error('❌ Auto backup failed:', error);
        }
    }, 3600000); // Backup setiap 1 jam
}

// Data validation
function validateData() {
    let validationErrors = [];

    // Validate patients data
    patients.forEach((patient, index) => {
        if (!patient.id || !patient.name || !patient.nik) {
            validationErrors.push(`Patient ${index}: Missing required fields`);
        }
        if (patient.nik && patient.nik.length !== 16) {
            validationErrors.push(`Patient ${patient.name}: Invalid NIK format`);
        }
    });

    // Validate medical records
    medicalRecords.forEach((record, index) => {
        if (!record.patientId || !record.diagnosis) {
            validationErrors.push(`Medical record ${index}: Missing required fields`);
        }
    });

    if (validationErrors.length > 0) {
        console.warn('Data validation issues:', validationErrors);
        addActivity(`Data validation: ${validationErrors.length} issues found`);
    }

    return validationErrors;
}

// Performance monitoring function
function getPerformanceReport() {
    return {
        pageLoadTime: performanceMetrics.pageLoadTime,
        errorCount: performanceMetrics.errorCount,
        lastError: performanceMetrics.lastError,
        userInteractions: performanceMetrics.userInteractions,
        dataIntegrity: validateData().length === 0,
        totalPatients: patients.length,
        totalRecords: medicalRecords.length,
        storageUsed: JSON.stringify({patients, medicalRecords, satisfactionData}).length,
        timestamp: new Date().toISOString()
    };
}

// Initialize systems
initializeSampleData();
setupAutomaticBackup();

// Run initial data validation
setTimeout(() => {
    const errors = validateData();
    if (errors.length === 0) {
        console.log('✅ Data validation passed');
    }
}, 5000);