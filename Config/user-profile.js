// 👤 PROFILE CONFIGURATION TEMPLATE
// Software Engineer seeking H1B sponsorship

module.exports = {
  personal: {
    firstName: "[FIRST_NAME]",
    lastName: "[LAST_NAME]", 
    fullName: "[FULL_NAME]",
    email: "[YOUR_EMAIL]@gmail.com",
    phone: "[YOUR_PHONE]",
    location: "[YOUR_LOCATION]",
    linkedinUrl: "https://www.linkedin.com/in/[YOUR_LINKEDIN_ID]/",
    resumeUrl: "[YOUR_RESUME_URL]"
  },

  professional: {
    currentTitle: "Software Engineer",
    currentCompany: "[YOUR_COMPANY]", 
    experience: "[YOUR_EXPERIENCE]",
    salaryExpectation: "$90,000 - $140,000",
    workAuthorization: "Will require H1B sponsorship",
    availability: "2 weeks notice",
    
    skills: [
      "Java", "Python", "JavaScript", "SQL", "TypeScript",
      "Spring Boot", "Django", "FastAPI", "Node.js", "RESTful APIs",
      "AWS", "GCP", "PostgreSQL", "MongoDB", "Redis", "Docker",
      "Apache Kafka", "Microservices", "System Design",
      "LLM API Integration", "OpenAI/GPT-4", "AI/ML"
    ],

    accomplishments: [
      {
        title: "[YOUR_ACCOMPLISHMENT_1_TITLE]",
        description: "[YOUR_ACCOMPLISHMENT_1_DESCRIPTION]",
        metrics: "[YOUR_ACCOMPLISHMENT_1_METRICS]"
      },
      {
        title: "[YOUR_ACCOMPLISHMENT_2_TITLE]", 
        description: "[YOUR_ACCOMPLISHMENT_2_DESCRIPTION]",
        metrics: "[YOUR_ACCOMPLISHMENT_2_METRICS]"
      },
      {
        title: "[YOUR_ACCOMPLISHMENT_3_TITLE]",
        description: "[YOUR_ACCOMPLISHMENT_3_DESCRIPTION]",
        metrics: "[YOUR_ACCOMPLISHMENT_3_METRICS]"
      }
    ]
  },

  automation: {
    maxApplicationsPerDay: 30,
    platforms: ['jobright', 'linkedin', 'workday'],
    runSchedule: '0 9,13,17,21 * * *',
    minATSScore: 70
  },

  credentials: {
    jobright: {
      email: "[YOUR_EMAIL]@gmail.com",
      password: process.env.JOBRIGHT_PASSWORD
    },
    linkedin: {
      email: "[YOUR_EMAIL]@gmail.com", 
      password: process.env.LINKEDIN_PASSWORD
    },
    workday: {
      email: "[YOUR_EMAIL]@gmail.com",
      password: process.env.WORKDAY_PASSWORD
    },
    gmail: {
      email: "[YOUR_EMAIL]@gmail.com",
      appPassword: process.env.GMAIL_APP_PASSWORD
    }
  }
};