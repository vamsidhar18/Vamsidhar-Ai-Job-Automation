const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data storage
const DATA_DIR = path.join(__dirname, '../data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const AI_LEARNING_FILE = path.join(DATA_DIR, 'ai_learning.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files if they don't exist
if (!fs.existsSync(SUBMISSIONS_FILE)) {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(AI_LEARNING_FILE)) {
    fs.writeFileSync(AI_LEARNING_FILE, JSON.stringify([], null, 2));
}

// Helper function to read JSON file
function readJsonFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return [];
    }
}

// Helper function to write JSON file
function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error.message);
        return false;
    }
}

// API Routes

// Get dashboard statistics
app.get('/api/stats', (req, res) => {
    try {
        const submissions = readJsonFile(SUBMISSIONS_FILE);
        const aiLearning = readJsonFile(AI_LEARNING_FILE);
        
        const stats = {
            totalApplications: submissions.length,
            successfulApplications: submissions.filter(s => s.success).length,
            failedApplications: submissions.filter(s => !s.success).length,
            successRate: submissions.length > 0 ? 
                ((submissions.filter(s => s.success).length / submissions.length) * 100).toFixed(1) : 0,
            totalAIInteractions: aiLearning.length,
            platforms: {
                workday: submissions.filter(s => s.platform === 'workday').length,
                linkedin: submissions.filter(s => s.platform === 'linkedin').length,
                greenhouse: submissions.filter(s => s.platform === 'greenhouse').length,
                lever: submissions.filter(s => s.platform === 'lever').length,
                bamboohr: submissions.filter(s => s.platform === 'bamboohr').length,
                apple: submissions.filter(s => s.platform === 'apple').length,
                generic: submissions.filter(s => s.platform === 'generic').length
            },
            recentActivity: submissions.slice(-10).reverse()
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all submissions
app.get('/api/submissions', (req, res) => {
    try {
        const submissions = readJsonFile(SUBMISSIONS_FILE);
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get AI learning data
app.get('/api/ai-learning', (req, res) => {
    try {
        const aiLearning = readJsonFile(AI_LEARNING_FILE);
        res.json(aiLearning);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start automation process
app.post('/api/start-automation', (req, res) => {
    try {
        const { mode, count = 5 } = req.body;
        
        let command, args;
        
        switch (mode) {
            case 'single':
                command = 'node';
                args = ['test/single-application-test.js'];
                break;
            case 'batch':
                command = 'node';
                args = ['test/apply-5-jobs.js'];
                break;
            case 'workday':
                command = 'node';
                args = ['test/test-workday-direct.js'];
                break;
            case 'all-platforms':
                command = 'node';
                args = ['test/test-all-platforms.js'];
                break;
            default:
                return res.status(400).json({ error: 'Invalid mode specified' });
        }
        
        const process = spawn(command, args, {
            cwd: path.join(__dirname, '..'),
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        let errorOutput = '';
        
        process.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        process.on('close', (code) => {
            console.log(`Automation process exited with code ${code}`);
        });
        
        res.json({ 
            success: true, 
            message: `Automation started in ${mode} mode`,
            pid: process.pid 
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get automation status
app.get('/api/automation-status', (req, res) => {
    try {
        // Check if automation process is running
        const submissions = readJsonFile(SUBMISSIONS_FILE);
        const lastSubmission = submissions[submissions.length - 1];
        
        const status = {
            isRunning: false, // This would need to be tracked in a real implementation
            lastActivity: lastSubmission ? lastSubmission.timestamp : null,
            recentSubmissions: submissions.slice(-5).reverse()
        };
        
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update AI learning data
app.post('/api/ai-learning', (req, res) => {
    try {
        const { question, answer, context } = req.body;
        const aiLearning = readJsonFile(AI_LEARNING_FILE);
        
        const newEntry = {
            id: Date.now().toString(),
            question,
            answer,
            context,
            timestamp: new Date().toISOString(),
            usageCount: 1
        };
        
        aiLearning.push(newEntry);
        writeJsonFile(AI_LEARNING_FILE, aiLearning);
        
        res.json({ success: true, entry: newEntry });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get platform-specific statistics
app.get('/api/platform-stats/:platform', (req, res) => {
    try {
        const { platform } = req.params;
        const submissions = readJsonFile(SUBMISSIONS_FILE);
        
        const platformSubmissions = submissions.filter(s => s.platform === platform);
        
        const stats = {
            platform,
            totalApplications: platformSubmissions.length,
            successfulApplications: platformSubmissions.filter(s => s.success).length,
            failedApplications: platformSubmissions.filter(s => !s.success).length,
            successRate: platformSubmissions.length > 0 ? 
                ((platformSubmissions.filter(s => s.success).length / platformSubmissions.length) * 100).toFixed(1) : 0,
            recentApplications: platformSubmissions.slice(-10).reverse()
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get logs
app.get('/api/logs', (req, res) => {
    try {
        const logsDir = path.join(__dirname, '../logs');
        const logFiles = fs.readdirSync(logsDir).filter(file => file.endsWith('.log'));
        
        const logs = [];
        logFiles.forEach(file => {
            const filePath = path.join(logsDir, file);
            const stats = fs.statSync(filePath);
            logs.push({
                filename: file,
                size: stats.size,
                modified: stats.mtime,
                path: filePath
            });
        });
        
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get log content
app.get('/api/logs/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const logPath = path.join(__dirname, '../logs', filename);
        
        if (!fs.existsSync(logPath)) {
            return res.status(404).json({ error: 'Log file not found' });
        }
        
        const content = fs.readFileSync(logPath, 'utf8');
        res.json({ content });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Serve the main dashboard page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Dashboard server running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
});

module.exports = app; 