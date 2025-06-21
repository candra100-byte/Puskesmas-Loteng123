const express = require('express');
const path = require('path');
const SystemMonitor = require('./monitoring.js');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize monitoring system
const monitor = new SystemMonitor();
monitor.startMonitoring();
monitor.enableAutoRestart();

// Enhanced middleware dengan monitoring
app.use((req, res, next) => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
    
    // Record request completion
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        monitor.recordRequest(responseTime);
        
        if (responseTime > 1000) {
            console.log(`⚠️  Slow request detected: ${responseTime}ms for ${req.url}`);
        }
    });
    
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/health', (req, res) => {
    const healthData = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        service: 'Puskesmas Lombok Tengah System',
        version: '1.0.0'
    };
    res.json(healthData);
});

// API status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        system: 'Puskesmas Lombok Tengah',
        status: 'Online',
        availability: '24/7',
        features: [
            'Patient Registration',
            'Medical Records',
            'Patient Satisfaction Survey',
            'Reports Generation',
            'Data Export'
        ],
        lastUpdate: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// Uptime endpoint untuk monitoring eksternal
app.get('/uptime', (req, res) => {
    const uptime = process.uptime();
    res.json({
        uptime: uptime,
        uptimeHuman: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        status: 'active',
        lastCheck: new Date().toISOString()
    });
});

// Ping endpoint untuk keep-alive services
app.get('/ping', (req, res) => {
    res.json({ 
        pong: true, 
        timestamp: new Date().toISOString(),
        server: 'Puskesmas-LT-Server',
        status: 'responding'
    });
});

// Force keep-alive endpoint
app.get('/keepalive', (req, res) => {
    res.json({
        message: 'Service is active and maintained 24/7',
        timestamp: new Date().toISOString(),
        nextCheck: new Date(Date.now() + 120000).toISOString()
    });
});

// Route untuk index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${new Date().toISOString()}:`, err);
    res.status(500).json({
        error: 'Terjadi kesalahan pada server',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Halaman tidak ditemukan',
        requestedUrl: req.url,
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Server shutting down gracefully...');
    process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏥 Server Puskesmas berjalan di http://0.0.0.0:${PORT}`);
    console.log(`⚡ Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`📊 API status: http://0.0.0.0:${PORT}/api/status`);
    console.log('✅ Aplikasi Puskesmas siap digunakan!');
});

// Enhanced monitoring dan keep-alive system
const monitoringInterval = setInterval(() => {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    // Log status sistem
    console.log(`✅ System Status - ${timestamp}`);
    console.log(`⏱️  Uptime: ${Math.floor(uptime / 60)} minutes`);
    console.log(`💾 Memory: ${Math.round(memory.heapUsed / 1024 / 1024)}MB used`);
    
    // Health check internal
    const healthStatus = {
        status: 'healthy',
        uptime: uptime,
        memory: memory,
        timestamp: timestamp,
        pid: process.pid
    };
    
    // Simulasi ping untuk menjaga koneksi aktif
    if (uptime > 0) {
        console.log(`🌐 Service available at all ports`);
    }
}, 120000); // Monitor setiap 2 menit

// Graceful shutdown dengan cleanup
process.on('SIGTERM', () => {
    console.log('🔄 Received SIGTERM - performing graceful shutdown...');
    clearInterval(monitoringInterval);
    setTimeout(() => process.exit(0), 1000);
});

process.on('SIGINT', () => {
    console.log('🔄 Received SIGINT - performing graceful shutdown...');
    clearInterval(monitoringInterval);
    setTimeout(() => process.exit(0), 1000);
});

// Prevent crashes
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.log('🔄 Attempting to continue service...');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    console.log('🔄 Attempting to continue service...');
});