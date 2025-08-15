require('dotenv').config();
const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const fs = require('fs');
const path = require('path');
const PDFParser = require('../utils/PDFParser');

class AIQuestionAnswerer {
  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    
    this.learningDatabase = path.join(__dirname, '../../data/ai_learning.json');
    this.ensureLearningDatabase();
    this.pdfParser = new PDFParser();
    
    // Key accomplishments for AI responses
    this.accomplishments = {
      performance: "[YOUR_PERFORMANCE_ACCOMPLISHMENT]",
      ai_integration: "[YOUR_AI_INTEGRATION_ACCOMPLISHMENT]",
      data_pipeline: "[YOUR_DATA_PIPELINE_ACCOMPLISHMENT]"
    };
  }

  ensureLearningDatabase() {
    const dataDir = path.dirname(this.learningDatabase);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.learningDatabase)) {
      fs.writeFileSync(this.learningDatabase, JSON.stringify({
        qa_pairs: [],
        company_profiles: {},
        success_metrics: {
          total_questions: 0,
          successful_responses: 0,
          interview_callbacks: 0
        }
      }, null, 2));
    }
  }

  async generateResponse(question, jobContext = {}) {
    try {
      // Load learning database
      const learningData = JSON.parse(fs.readFileSync(this.learningDatabase, 'utf8'));
      
      // Get enhanced context from prep document
      const prepContext = await this.pdfParser.getEnhancedAIContext();
      
      // Create context-aware prompt with prep document content
      const prompt = PromptTemplate.fromTemplate(`
You are a senior software engineer with expertise in AI/ML, full-stack development, and automation.

Job Context: {jobContext}

Question: {question}

Your Key Accomplishments:
1. Performance Optimization: {performance}
2. AI Integration: {ai_integration}  
3. Data Pipeline: {data_pipeline}

Additional Preparation Content: {prepContent}

Skills from Prep Document: {skills}

Experience from Prep Document: {experience}

Projects from Prep Document: {projects}

Key Training Points from Prep Document:
- Technical Skills: {technicalSkills}
- Behavioral Examples: {behavioralExamples}
- Project Highlights: {projectHighlights}
- Industry Knowledge: {industryKnowledge}
- Interview Strategies: {interviewStrategies}

Instructions:
- PROVIDE A DIRECT ANSWER to the question, do not ask questions back
- Use specific examples from your accomplishments when relevant
- Incorporate relevant information from the prep document
- Keep responses concise but impactful (2-3 sentences)
- Focus on technical skills and measurable results
- Be enthusiastic about the opportunity
- Use behavioral examples from the prep document when applicable
- Reference specific projects and technologies mentioned in the prep document
- Adapt your response based on the company and job context
- NEVER ask questions in your response - only provide answers

Answer: `);

      const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
      
      const response = await chain.invoke({
        question,
        jobContext: JSON.stringify(jobContext),
        performance: this.accomplishments.performance,
        ai_integration: this.accomplishments.ai_integration,
        data_pipeline: this.accomplishments.data_pipeline,
        prepContent: prepContext.prepDocument ? prepContext.prepDocument.substring(0, 2000) : 'No prep document available',
        skills: prepContext.sections?.skills || 'Standard technical skills',
        experience: prepContext.sections?.experience || 'Professional experience in software engineering',
        projects: prepContext.sections?.projects || 'Various technical projects',
        technicalSkills: prepContext.sections?.technicalSkills || 'AI/ML, Full-stack development, Automation, Python, JavaScript, React, Node.js',
        behavioralExamples: prepContext.sections?.behavioralExamples || 'Problem-solving, Team collaboration, Innovation, Leadership',
        projectHighlights: prepContext.sections?.projectHighlights || 'Performance optimization, AI integration, Data pipelines, Scalable systems',
        industryKnowledge: prepContext.sections?.industryKnowledge || 'Technology industry trends, Best practices, Emerging technologies',
        interviewStrategies: prepContext.sections?.interviewStrategies || 'STAR method, Quantify achievements, Show enthusiasm, Ask thoughtful questions'
      });

      // Store for learning
      await this.storeQAPair(question, response, jobContext);
      
      return {
        answer: response,
        confidence: this.calculateConfidence(question, response),
        learning_data: {
          question_type: this.categorizeQuestion(question),
          company: jobContext.company || 'unknown',
          job_title: jobContext.title || 'unknown',
          used_prep_document: prepContext.hasPrepContent
        }
      };

    } catch (error) {
      console.error('AI Response Error:', error);
      return {
        answer: "I'm excited about this opportunity and would love to discuss how my experience in AI/ML, full-stack development, and automation can contribute to your team.",
        confidence: 0.5,
        learning_data: {
          question_type: 'fallback',
          company: jobContext.company || 'unknown',
          job_title: jobContext.title || 'unknown'
        }
      };
    }
  }

  categorizeQuestion(question) {
    // Ensure question is a string
    if (typeof question !== 'string') {
      question = String(question || '');
    }
    
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('experience') || lowerQuestion.includes('background')) {
      return 'experience';
    } else if (lowerQuestion.includes('skill') || lowerQuestion.includes('technology')) {
      return 'skills';
    } else if (lowerQuestion.includes('challenge') || lowerQuestion.includes('problem')) {
      return 'problem_solving';
    } else if (lowerQuestion.includes('team') || lowerQuestion.includes('collaboration')) {
      return 'teamwork';
    } else if (lowerQuestion.includes('goal') || lowerQuestion.includes('aspiration')) {
      return 'goals';
    } else {
      return 'general';
    }
  }

  calculateConfidence(question, response) {
    // Simple confidence calculation based on response length and content
          const hasAccomplishments = response.includes('[YOUR_METRICS]') || response.includes('[YOUR_ACHIEVEMENTS]');
    const hasTechnicalTerms = response.includes('microservices') || response.includes('AI') || response.includes('Kafka');
    const appropriateLength = response.length > 50 && response.length < 300;
    
    let confidence = 0.5;
    if (hasAccomplishments) confidence += 0.3;
    if (hasTechnicalTerms) confidence += 0.2;
    if (appropriateLength) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  storeQAPair(question, answer, jobContext) {
    try {
      const learningData = JSON.parse(fs.readFileSync(this.learningDatabase, 'utf8'));
      
      learningData.qa_pairs.push({
        question,
        answer,
        job_context: jobContext,
        timestamp: new Date().toISOString(),
        question_type: this.categorizeQuestion(question),
        confidence: this.calculateConfidence(question, answer)
      });
      
      learningData.success_metrics.total_questions++;
      
      fs.writeFileSync(this.learningDatabase, JSON.stringify(learningData, null, 2));
    } catch (error) {
      console.error('Error storing QA pair:', error);
    }
  }

  async getLearningStats() {
    try {
      const learningData = JSON.parse(fs.readFileSync(this.learningDatabase, 'utf8'));
      return {
        total_questions: learningData.success_metrics.total_questions,
        qa_pairs_count: learningData.qa_pairs.length,
        recent_questions: learningData.qa_pairs.slice(-5),
        question_types: this.analyzeQuestionTypes(learningData.qa_pairs)
      };
    } catch (error) {
      console.error('Error getting learning stats:', error);
      return { total_questions: 0, qa_pairs_count: 0, recent_questions: [], question_types: {} };
    }
  }

  analyzeQuestionTypes(qaPairs) {
    const types = {};
    qaPairs.forEach(pair => {
      const type = pair.question_type;
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  async improveResponse(question, jobContext, feedback) {
    // Store feedback for future improvements
    try {
      const learningData = JSON.parse(fs.readFileSync(this.learningDatabase, 'utf8'));
      
      // Find the most recent QA pair for this question type
      const recentPair = learningData.qa_pairs
        .filter(pair => pair.question_type === this.categorizeQuestion(question))
        .pop();
      
      if (recentPair) {
        recentPair.feedback = feedback;
        recentPair.improved = true;
      }
      
      fs.writeFileSync(this.learningDatabase, JSON.stringify(learningData, null, 2));
    } catch (error) {
      console.error('Error storing feedback:', error);
    }
  }
}

module.exports = AIQuestionAnswerer; 