# 🤖 AI-Powered Job Automation Bot

> **Intelligent job application automation system for Software Engineers seeking H1B sponsorship opportunities**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Multi--Platform-orange.svg)](https://github.com/vamsidhar18/Vamsidhar-Ai-Job-Automation)
[![AI-Powered](https://img.shields.io/badge/AI-Powered-OpenAI-red.svg)](https://openai.com/)

## 🎯 Overview

This AI-powered job automation bot streamlines the job application process for software engineers by automating applications across multiple platforms while using AI to customize resumes and responses for each position. Perfect for H1B sponsorship seekers who need to apply to many positions efficiently.

## ✨ Key Features

### 🤖 **AI-Powered Automation**
- **Intelligent Resume Customization**: AI tailors your resume for each job description
- **Smart Q&A Bot**: Learns from every application to improve responses
- **Dynamic Cover Letters**: Generates personalized cover letters using AI
- **ATS Optimization**: Ensures resumes pass Applicant Tracking Systems

### 🌐 **Multi-Platform Support**
- **JobRight.ai** - AI-powered job matching platform
- **LinkedIn Easy Apply** - Automated LinkedIn applications
- **Workday** - Enterprise application system automation
- **Greenhouse** - Modern ATS platform support
- **BambooHR** - HR software automation
- **Lever** - Recruitment platform integration

### 📊 **Analytics & Monitoring**
- **Real-time Dashboard**: Track application status and success rates
- **Performance Analytics**: Monitor which platforms work best
- **Application History**: Keep track of all applications
- **Email Verification**: Automatic handling of verification emails

### 🎪 **Interview Preparation**
- **AI Interview Coach**: Practice questions and get AI-powered feedback
- **Company Research**: Automated company background research
- **Response Templates**: Pre-built responses for common questions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Chrome browser
- OpenAI API key (optional, for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/vamsidhar18/Vamsidhar-Ai-Job-Automation.git
cd Vamsidhar-Ai-Job-Automation

# Install dependencies
npm install

# Install browser automation engine
npx playwright install chromium

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials and API keys

# Configure your profile
# Edit Config/user-profile.js with your information

# Start the automation system
npm start
```

### Configuration

1. **Environment Setup**: Copy `.env.example` to `.env` and fill in your credentials
2. **Profile Configuration**: Edit `Config/user-profile.js` with your personal information
3. **API Keys**: Add your OpenAI and other API keys to `.env`
4. **Platform Credentials**: Add your job platform login credentials

## 📁 Project Structure

```
Vamsidhar-Ai-Job-Automation/
├── Config/
│   └── user-profile.js          # User profile configuration
├── src/
│   ├── ai/
│   │   └── AIQuestionAnswerer.js # AI-powered Q&A system
│   ├── automation/
│   │   └── JobAutomationMaster.js # Main automation controller
│   ├── platforms/
│   │   ├── JobRightAutomator.js   # JobRight.ai automation
│   │   ├── LinkedInAutomator.js   # LinkedIn automation
│   │   ├── WorkdayAutomator.js    # Workday automation
│   │   ├── GreenhouseAutomator.js # Greenhouse automation
│   │   ├── BambooHRAutomator.js   # BambooHR automation
│   │   ├── LeverAutomator.js      # Lever automation
│   │   └── PlatformBase.js        # Shared platform utilities
│   └── utils/
│       ├── Logger.js              # Logging system
│       ├── ErrorHandler.js        # Error handling
│       └── PDFParser.js           # PDF processing
├── test/                          # Test files
├── dashboard/                     # Web dashboard
├── data/                          # Application data storage
└── logs/                          # System logs
```

## 🔧 Configuration

### Environment Variables

```bash
# API Keys
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# Platform Credentials
JOBRIGHT_PASSWORD=your_jobright_password
LINKEDIN_PASSWORD=your_linkedin_password
WORKDAY_PASSWORD=your_workday_password

# System Configuration
NODE_ENV=development
PORT=3000
MAX_APPLICATIONS_PER_DAY=30
MIN_ATS_SCORE=70
```

### Profile Configuration

Edit `Config/user-profile.js` to customize your profile:

```javascript
module.exports = {
  personal: {
    firstName: "Your First Name",
    lastName: "Your Last Name",
    email: "your.email@gmail.com",
    phone: "your-phone-number",
    location: "Your City, State",
    linkedinUrl: "https://www.linkedin.com/in/your-profile/",
    resumeUrl: "your-resume-url"
  },
  professional: {
    currentTitle: "Software Engineer",
    currentCompany: "Your Company",
    experience: "3+ years",
    skills: ["Java", "Python", "JavaScript", "React", "Node.js"],
    accomplishments: [
      {
        title: "Your Achievement Title",
        description: "Description of your achievement",
        metrics: "Quantified results"
      }
    ]
  }
};
```

## 📊 Dashboard

Access the real-time dashboard at `http://localhost:3000` to:
- Monitor application status
- View success rates
- Track platform performance
- Manage automation settings

## 🛠️ Usage

### Basic Usage

```bash
# Start the automation system
npm start

# Run specific platform tests
npm run test-all-platforms

# Start dashboard only
npm run dashboard
```

### Advanced Configuration

```bash
# Set daily application limits
MAX_APPLICATIONS_PER_DAY=50

# Configure ATS score threshold
MIN_ATS_SCORE=80

# Enable/disable features
ENABLE_AI_QA_BOT=true
ENABLE_RESUME_CUSTOMIZATION=true
ENABLE_EMAIL_VERIFICATION=true
```

## 🔒 Security & Privacy

- **No Personal Data Stored**: All personal information is kept local
- **Environment Variables**: Sensitive data stored in `.env` files
- **Git Ignore**: Sensitive files automatically excluded from version control
- **Local Processing**: All AI processing happens locally or via secure APIs

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Node.js](https://nodejs.org/)
- Browser automation powered by [Playwright](https://playwright.dev/)
- AI capabilities powered by [OpenAI](https://openai.com/)
- UI components built with modern web technologies

## 📞 Support

If you have any questions or need help setting up the automation system:

- Create an [Issue](https://github.com/vamsidhar18/Vamsidhar-Ai-Job-Automation/issues)
- Check the [SETUP.md](SETUP.md) for detailed setup instructions
- Review the [Wiki](https://github.com/vamsidhar18/Vamsidhar-Ai-Job-Automation/wiki) for advanced usage

---

**⭐ Star this repository if you find it helpful!**

**Happy Job Hunting! 🎉**