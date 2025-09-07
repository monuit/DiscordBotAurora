const fs = require('fs');
const path = require('path');

console.log('🔍 Aurora Bot Deployment Verification');
console.log('=====================================\n');

// Check essential files
const essentialFiles = [
    'index.js',
    'spicy-flix.js', 
    'deploySlash.js',
    'package.json',
    '.env.example',
    'README.md'
];

console.log('✅ Essential Files Check:');
essentialFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// Check essential directories
const essentialDirs = [
    'commands',
    'events', 
    'Functions',
    'handlers',
    'settings',
    'utils',
    'config'
];

console.log('\n✅ Essential Directories Check:');
essentialDirs.forEach(dir => {
    const exists = fs.existsSync(dir);
    console.log(`   ${exists ? '✅' : '❌'} ${dir}/`);
});

// Check for unwanted files
const unwantedPatterns = [
    /^fix-.*\.js$/,
    /^test-.*\.js$/,
    /^batch-.*\.js$/,
    /^clear-.*\.js$/,
    /^check-.*\.js$/,
    /\.zip$/,
    /\.tmp$/,
    /\.bak$/,
    /\.old$/
];

console.log('\n🧹 Cleanup Verification:');
const files = fs.readdirSync('.');
const unwantedFiles = files.filter(file => 
    unwantedPatterns.some(pattern => pattern.test(file))
);

if (unwantedFiles.length === 0) {
    console.log('   ✅ No unwanted files found');
} else {
    console.log('   ❌ Found unwanted files:');
    unwantedFiles.forEach(file => console.log(`      - ${file}`));
}

// Check package.json
console.log('\n📦 Package Information:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`   Name: ${packageJson.name}`);
    console.log(`   Version: ${packageJson.version}`);
    console.log(`   Main: ${packageJson.main}`);
    console.log(`   Dependencies: ${Object.keys(packageJson.dependencies || {}).length}`);
} catch (error) {
    console.log('   ❌ Error reading package.json');
}

// Check for .env template
console.log('\n🔐 Environment Configuration:');
const envExample = fs.existsSync('.env.example');
const envActual = fs.existsSync('.env');
console.log(`   ✅ .env.example: ${envExample ? 'Present' : 'Missing'}`);
console.log(`   ${envActual ? '⚠️' : '✅'} .env: ${envActual ? 'Present (will not be deployed)' : 'Not present (good for deployment)'}`);

// Size check
console.log('\n📊 Directory Size:');
function getDirectorySize(dirPath) {
    let totalSize = 0;
    
    function calculateSize(currentPath) {
        const stats = fs.statSync(currentPath);
        if (stats.isFile()) {
            totalSize += stats.size;
        } else if (stats.isDirectory()) {
            const files = fs.readdirSync(currentPath);
            files.forEach(file => {
                calculateSize(path.join(currentPath, file));
            });
        }
    }
    
    calculateSize(dirPath);
    return totalSize;
}

const totalSize = getDirectorySize('.');
const sizeInMB = (totalSize / 1024 / 1024).toFixed(2);
console.log(`   Total size: ${sizeInMB} MB`);

// Final recommendation
console.log('\n🎯 Deployment Status:');
const criticalIssues = !essentialFiles.every(f => fs.existsSync(f)) || 
                      !essentialDirs.every(d => fs.existsSync(d)) ||
                      unwantedFiles.length > 0;

if (criticalIssues) {
    console.log('   ❌ Not ready for deployment - resolve issues above');
} else {
    console.log('   ✅ Ready for SSH server deployment!');
    console.log('   📋 Next steps:');
    console.log('      1. Upload to SSH server');
    console.log('      2. Run: npm install');
    console.log('      3. Configure .env file');
    console.log('      4. Deploy commands: node deploySlash.js guild YOUR_GUILD_ID');
    console.log('      5. Start with PM2: pm2 start index.js --name "aurora-bot"');
}

console.log('\n📚 See DEPLOYMENT_CHECKLIST.md for detailed instructions');
