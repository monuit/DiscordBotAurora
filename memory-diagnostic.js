// Memory Diagnostic Script
console.log('🔍 Memory Usage Diagnostic');
console.log('==============================');

function formatBytes(bytes) {
    return Math.round(bytes / 1024 / 1024 * 100) / 100 + ' MB';
}

function checkMemoryUsage() {
    const usage = process.memoryUsage();
    
    console.log('\n📊 Current Memory Usage:');
    console.log(`  Heap Used: ${formatBytes(usage.heapUsed)}`);
    console.log(`  Heap Total: ${formatBytes(usage.heapTotal)}`);
    console.log(`  External: ${formatBytes(usage.external)}`);
    console.log(`  RSS: ${formatBytes(usage.rss)}`);
    console.log(`  Array Buffers: ${formatBytes(usage.arrayBuffers)}`);
    
    // Calculate percentage if we know the system memory
    // This is a rough estimate based on typical Docker/VPS limits
    const systemMemoryMB = 1024; // Assume 1GB system for example
    const usagePercentage = Math.round((usage.rss / 1024 / 1024) / systemMemoryMB * 100);
    
    console.log(`\n📈 Usage Analysis:`);
    console.log(`  Estimated System Usage: ${usagePercentage}%`);
    
    if (usagePercentage > 90) {
        console.log('  🚨 CRITICAL: Memory usage extremely high!');
    } else if (usagePercentage > 80) {
        console.log('  ⚠️  WARNING: Memory usage high');
    } else if (usagePercentage > 70) {
        console.log('  🟡 CAUTION: Memory usage elevated');
    } else {
        console.log('  ✅ NORMAL: Memory usage acceptable');
    }
    
    return usage;
}

// Check for potential memory leaks
function checkPotentialLeaks() {
    console.log('\n🔍 Checking for potential memory issues...');
    
    // Check global object pollution
    const globalKeys = Object.keys(global);
    console.log(`  Global object keys: ${globalKeys.length}`);
    if (globalKeys.length > 100) {
        console.log('  ⚠️  Warning: Many global variables detected');
    }
    
    // Check process listeners
    const processListeners = process.listenerCount('uncaughtException') + 
                           process.listenerCount('unhandledRejection') +
                           process.listenerCount('exit');
    console.log(`  Process listeners: ${processListeners}`);
    
    // Force garbage collection if available
    if (global.gc) {
        console.log('  🗑️  Running garbage collection...');
        const beforeGC = process.memoryUsage();
        global.gc();
        const afterGC = process.memoryUsage();
        const freed = beforeGC.heapUsed - afterGC.heapUsed;
        console.log(`  📉 Memory freed: ${formatBytes(freed)}`);
    } else {
        console.log('  ℹ️  Garbage collection not available (run with --expose-gc)');
    }
}

// Run initial check
checkMemoryUsage();
checkPotentialLeaks();

// Monitor memory usage over time
let checks = 0;
const maxChecks = 5;
const interval = setInterval(() => {
    checks++;
    console.log(`\n--- Check ${checks}/${maxChecks} (${new Date().toLocaleTimeString()}) ---`);
    checkMemoryUsage();
    
    if (checks >= maxChecks) {
        clearInterval(interval);
        console.log('\n✅ Memory diagnostic complete');
        console.log('\n💡 Recommendations:');
        console.log('  1. If memory usage is consistently high, consider using the emergency stop command');
        console.log('  2. Monitor for memory leaks by running this script periodically');
        console.log('  3. Use /emergencystop action:status to check bot emergency status');
        console.log('  4. Use /emergencystop action:execute confirmation:EMERGENCY_STOP_CONFIRMED to emergency stop all operations');
        process.exit(0);
    }
}, 2000);
