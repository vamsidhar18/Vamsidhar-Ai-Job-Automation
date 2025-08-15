# �� Job Automation Bot - Complete Setup Guide

> **Step-by-step guide to set up and configure your AI-powered job automation system**

## 📋 Table of Contents

- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Detailed Configuration](#-detailed-configuration)
- [Platform Setup](#-platform-setup)
- [Advanced Configuration](#-advanced-configuration)
- [Troubleshooting](#-troubleshooting)
- [Best Practices](#-best-practices)

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **Chrome** browser (for automation)
- **Git** (for cloning the repository)

### System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: At least 2GB free space
- **Internet**: Stable connection for API calls and automation

## 🚀 Quick Start

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/vamsidhar18/Vamsidhar-Ai-Job-Automation.git

# Navigate to the project directory
cd Vamsidhar-Ai-Job-Automation
```

### Step 2: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install browser automation engine
npx playwright install chromium
```

### Step 3: Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit the environment file with your credentials
nano .env  # or use your preferred text editor
```

### Step 4: Profile Configuration

Edit `Config/user-profile.js` with your information:

```javascript
module.exports = {
  personal: {
    firstName: "Your First Name",
    lastName: "Your Last Name", 
    fullName: "Your Full Name",
    email: "your.email@gmail.com",
    phone: "your-phone-number",
    location: "Your City, State",
    linkedinUrl: "https://www.linkedin.com/in/your-linkedin-id/",
    resumeUrl: "your-resume-url"
  },
  professional: {
    currentTitle: "Software Engineer",
    currentCompany: "Your Company",
    experience: "3+ years",
    salaryExpectation: "$90,000 - $140,000",
    workAuthorization: "Will require H1B sponsorship",
    availability: "2 weeks notice",
    skills: [
      "Java", "Python", "JavaScript", "React", "Node.js",
      "Spring Boot", "Django", "AWS", "Docker", "Kubernetes"
    ],
    accomplishments: [
      {
        title: "Your Achievement Title",
        description: "Description of your achievement",
        metrics: "Quantified results (e.g., 40% improvement, $200K savings)"
      }
    ]
  },
  automation: {
    maxApplicationsPerDay: 30,
    platforms: ['jobright', 'linkedin', 'workday'],
    runSchedule: '0 9,13,17,21 * * *', // 4 times daily
    minATSScore: 70
  }
};
```

### Step 5: Start the System

```bash
# Start the automation system
npm start

# Access the dashboard
open http://localhost:3000
```

## ⚙️ Detailed Configuration

### Environment Variables

Create and configure your `.env` file:

```bash
# =============================================================================
# API KEYS & EXTERNAL SERVICES
# =============================================================================

# OpenAI API (for AI features)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Google Gemini API (alternative AI provider)
GEMINI_API_KEY=your-gemini-api-key-here

# Email service (for notifications)
GMAIL_APP_PASSWORD=your-gmail-app-password

# =============================================================================
# PLATFORM CREDENTIALS
# =============================================================================

# JobRight.ai credentials
JOBRIGHT_EMAIL=your-email@gmail.com
JOBRIGHT_PASSWORD=your-jobright-password

# LinkedIn credentials
LINKEDIN_EMAIL=your-email@gmail.com
LINKEDIN_PASSWORD=your-linkedin-password

# Workday credentials
WORKDAY_EMAIL=your-email@gmail.com
WORKDAY_PASSWORD=your-workday-password

# Apple ID (for some platforms)
APPLE_ID=your-apple-id@gmail.com
APPLE_PASSWORD=your-apple-password

# Common password (fallback)
ALL_PASSWORDS=your-common-password

# =============================================================================
# SYSTEM CONFIGURATION
# =============================================================================

# Environment
NODE_ENV=development

# Ports
PORT=3000
DASHBOARD_PORT=3001

# Automation limits
MAX_APPLICATIONS_PER_DAY=30
MIN_ATS_SCORE=70

# Feature toggles
ENABLE_EMAIL_VERIFICATION=true
ENABLE_RESUME_CUSTOMIZATION=true
ENABLE_AI_QA_BOT=true
ENABLE_DASHBOARD=true

# Database (optional)
DATABASE_URL=postgresql://username:password@localhost:5432/job_automation
```

### Profile Customization

#### Personal Information

```javascript
personal: {
  firstName: "John",
  lastName: "Doe", 
  fullName: "John Doe",
  email: "john.doe@gmail.com",
  phone: "+1-555-123-4567",
  location: "San Francisco, CA",
  linkedinUrl: "https://www.linkedin.com/in/johndo/",
  resumeUrl: "https://docs.google.com/document/d/your-resume-id/edit"
}
```

#### Professional Information

```javascript
professional: {
  currentTitle: "Senior Software Engineer",
  currentCompany: "Tech Corp",
  experience: "5+ years",
  salaryExpectation: "$120,000 - $180,000",
  workAuthorization: "Will require H1B sponsorship",
  availability: "1 month notice",
  skills: [
    "Java", "Spring Boot", "Microservices", "AWS",
    "Docker", "Kubernetes", "React", "Node.js"
  ]
}
```

#### Accomplishments

```javascript
accomplishments: [
  {
    title: "Microservices Architecture Optimization",
    description: "Designed and implemented microservices architecture reducing API response time by 40% and improving system scalability",
    metrics: "40% performance improvement, 50K+ concurrent users, 99.9% uptime"
  },
  {
    title: "AI Integration Platform",
    description: "Built enterprise LLM integration platform using OpenAI APIs, reducing manual processing time",
    metrics: "65% time reduction, 95% accuracy improvement, $200K annual savings"
  }
]
```

## 🌐 Platform Setup

### Supported Platforms

| Platform | Status | Features |
|----------|--------|----------|
| **JobRight.ai** | ✅ Full Support | AI matching, Auto-apply |
| **LinkedIn** | ✅ Full Support | Easy Apply, Profile optimization |
| **Workday** | ✅ Full Support | Complex forms, Multi-step |
| **Greenhouse** | ✅ Full Support | Modern ATS, Quick apply |
| **BambooHR** | ✅ Full Support | HR integration, Custom fields |
| **Lever** | ✅ Full Support | Recruitment platform |

### Platform-Specific Configuration

#### JobRight.ai Setup

1. Create account at [JobRight.ai](https://jobright.ai)
2. Complete your profile
3. Add credentials to `.env`:
   ```bash
   JOBRIGHT_EMAIL=your-email@gmail.com
   JOBRIGHT_PASSWORD=your-password
   ```

#### LinkedIn Setup

1. Ensure your LinkedIn profile is complete
2. Enable "Easy Apply" for relevant jobs
3. Add credentials to `.env`:
   ```bash
   LINKEDIN_EMAIL=your-email@gmail.com
   LINKEDIN_PASSWORD=your-password
   ```

#### Workday Setup

1. Create accounts for companies you're interested in
2. Save credentials for each company
3. Add common credentials to `.env`:
   ```bash
   WORKDAY_EMAIL=your-email@gmail.com
   WORKDAY_PASSWORD=your-password
   ```

## 🔧 Advanced Configuration

### Automation Scheduling

Configure when the bot runs:

```javascript
automation: {
  runSchedule: '0 9,13,17,21 * * *', // Cron format
  // Runs at 9 AM, 1 PM, 5 PM, 9 PM daily
}
```

### Application Limits

Set daily limits to avoid spam:

```javascript
automation: {
  maxApplicationsPerDay: 30, // Maximum applications per day
  minATSScore: 70, // Minimum ATS score to apply
}
```

### AI Configuration

Customize AI behavior:

```javascript
// In your profile configuration
aiSettings: {
  resumeCustomization: true,
  coverLetterGeneration: true,
  interviewPrep: true,
  confidenceThreshold: 0.8
}
```

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### 1. Chrome Connection Error

**Error**: `browserType.connectOverCDP: connect ECONNREFUSED`

**Solution**:
```bash
# Reinstall browser engine
npx playwright install chromium

# Or install all browsers
npx playwright install
```

#### 2. Environment Variables Not Found

**Error**: `process.env.VARIABLE is undefined`

**Solution**:
```bash
# Check if .env file exists
ls -la .env

# Verify file contents
cat .env

# Restart the application
npm start
```

#### 3. Dependencies Issues

**Error**: `Cannot find module`

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 4. Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solution**:
```bash
# Find process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

#### 5. API Key Issues

**Error**: `Invalid API key`

**Solution**:
- Verify API keys in `.env` file
- Check API key quotas and billing
- Ensure keys have correct permissions

### Debug Mode

Enable debug logging:

```bash
# Set debug environment
NODE_ENV=development DEBUG=* npm start

# Or enable specific debug categories
DEBUG=automation:*,platform:* npm start
```

## 📊 Monitoring & Analytics

### Dashboard Access

- **Main Dashboard**: `http://localhost:3000`
- **Health Check**: `http://localhost:3000/health`
- **Status API**: `http://localhost:3000/status`

### Log Files

Check logs for debugging:

```bash
# View recent logs
tail -f logs/automation.log

# Search for errors
grep "ERROR" logs/*.log

# Monitor application activity
tail -f logs/application.log
```

## 🔒 Security Best Practices

### Credential Management

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate passwords** regularly
4. **Use app-specific passwords** where possible

### Data Privacy

1. **Local storage only** - no data sent to external servers
2. **Encrypt sensitive files** if needed
3. **Regular cleanup** of old application data
4. **Secure API keys** with proper permissions

### Network Security

1. **Use HTTPS** for all external communications
2. **Validate API responses** before processing
3. **Implement rate limiting** to avoid being blocked
4. **Monitor for suspicious activity**

## 🎯 Best Practices

### Application Strategy

1. **Quality over Quantity**: Focus on relevant positions
2. **Customize Applications**: Use AI to tailor each application
3. **Track Results**: Monitor which platforms work best
4. **Follow Up**: Set up email notifications for responses

### Profile Optimization

1. **Complete Profiles**: Fill out all platform profiles completely
2. **Keyword Optimization**: Include relevant keywords in profiles
3. **Regular Updates**: Keep profiles current with latest experience
4. **Professional Photos**: Use high-quality profile pictures

### Automation Settings

1. **Start Conservative**: Begin with lower daily limits
2. **Monitor Performance**: Track success rates and adjust
3. **Platform Rotation**: Use multiple platforms for better coverage
4. **Time Optimization**: Schedule runs during business hours

## 📞 Support

### Getting Help

- **Documentation**: Check [README.md](README.md) for detailed information
- **Issues**: Create an issue on [GitHub](https://github.com/vamsidhar18/Vamsidhar-Ai-Job-Automation/issues)
- **Wiki**: Check the [Wiki](https://github.com/vamsidhar18/Vamsidhar-Ai-Job-Automation/wiki) for advanced topics

### Community

- **Discussions**: Join GitHub Discussions for community support
- **Contributions**: Submit pull requests for improvements
- **Feedback**: Share your experience and suggestions

---

## 🎉 Success Checklist

- [ ] Repository cloned successfully
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Profile customized
- [ ] Browser engine installed
- [ ] System started without errors
- [ ] Dashboard accessible
- [ ] First test application submitted
- [ ] Email notifications working
- [ ] AI features functioning

**Congratulations! You're ready to automate your job search! 🚀**

---

**⭐ Star this repository if you find it helpful!**

**Happy Job Hunting! 🎯**
