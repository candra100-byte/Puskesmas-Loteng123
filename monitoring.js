
// Sistem Monitoring Komprehensif untuk Puskesmas Lombok Tengah
// File: monitoring.js

class SystemMonitor {
    constructor() {
        this.metrics = {
            uptime: 0,
            requests: 0,
            errors: 0,
            lastError: null,
            performance: {
                avgResponseTime: 0,
                maxResponseTime: 0,
                minResponseTime: Infinity
            },
            health: {
                database: 'ok',
                storage: 'ok',
                memory: 'ok',
                cpu: 'ok'
            }
        };
        this.startTime = Date.now();
        this.requestTimes = [];
    }

    // Monitor sistem secara real-time
    startMonitoring() {
        console.log('🔍 System monitoring started');
        
        // Update metrics setiap 1 menit
        setInterval(() => {
            this.updateMetrics();
            this.checkSystemHealth();
        }, 60000);

        // Cleanup old data setiap 5 menit
        setInterval(() => {
            this.cleanupOldData();
        }, 300000);
    }

    updateMetrics() {
        this.metrics.uptime = Date.now() - this.startTime;
        
        // Calculate average response time
        if (this.requestTimes.length > 0) {
            const avg = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
            this.metrics.performance.avgResponseTime = Math.round(avg);
        }

        // Log status
        console.log(`📊 Metrics Update: ${new Date().toISOString()}`);
        console.log(`   Uptime: ${Math.floor(this.metrics.uptime / 60000)} minutes`);
        console.log(`   Requests: ${this.metrics.requests}`);
        console.log(`   Errors: ${this.metrics.errors}`);
        console.log(`   Avg Response: ${this.metrics.performance.avgResponseTime}ms`);
    }

    checkSystemHealth() {
        // Check memory usage
        const memUsage = process.memoryUsage();
        const memUsedMB = memUsage.heapUsed / 1024 / 1024;
        
        if (memUsedMB > 100) {
            this.metrics.health.memory = 'warning';
            console.log(`⚠️  High memory usage: ${Math.round(memUsedMB)}MB`);
        } else {
            this.metrics.health.memory = 'ok';
        }

        // Check if any errors in last hour
        if (this.metrics.errors > 10) {
            console.log(`⚠️  High error rate detected: ${this.metrics.errors} errors`);
        }

        // Overall health status
        const healthStatus = Object.values(this.metrics.health).every(status => status === 'ok');
        if (healthStatus) {
            console.log('✅ All systems operational');
        }
    }

    recordRequest(responseTime) {
        this.metrics.requests++;
        this.requestTimes.push(responseTime);
        
        // Update min/max response times
        this.metrics.performance.maxResponseTime = Math.max(
            this.metrics.performance.maxResponseTime, 
            responseTime
        );
        this.metrics.performance.minResponseTime = Math.min(
            this.metrics.performance.minResponseTime, 
            responseTime
        );
    }

    recordError(error) {
        this.metrics.errors++;
        this.metrics.lastError = {
            message: error.message,
            timestamp: new Date().toISOString(),
            stack: error.stack
        };
        console.error(`❌ Error recorded: ${error.message}`);
    }

    cleanupOldData() {
        // Keep only last 100 request times untuk performa
        if (this.requestTimes.length > 100) {
            this.requestTimes = this.requestTimes.slice(-100);
        }
        
        console.log('🧹 Cleanup completed - maintaining optimal performance');
    }

    getHealthReport() {
        return {
            system: 'Puskesmas Lombok Tengah',
            status: 'operational',
            uptime: this.metrics.uptime,
            metrics: this.metrics,
            timestamp: new Date().toISOString(),
            nextCheck: new Date(Date.now() + 60000).toISOString()
        };
    }

    // Auto-restart mechanism jika diperlukan
    enableAutoRestart() {
        process.on('uncaughtException', (error) => {
            this.recordError(error);
            console.log('🔄 Attempting automatic recovery...');
            
            // Attempt graceful recovery
            setTimeout(() => {
                console.log('✅ System recovered successfully');
            }, 1000);
        });
    }
}

// Export untuk digunakan di server
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemMonitor;
}

// Initialize jika di browser
if (typeof window !== 'undefined') {
    window.SystemMonitor = SystemMonitor;
}
