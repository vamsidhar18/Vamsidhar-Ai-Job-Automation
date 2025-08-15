const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

class PDFParser {
  constructor() {
    this.prepDocumentPath = path.join(__dirname, '../../demo apply/prep document.pdf');
    this.extractedContent = null;
  }

  async extractPrepDocument() {
    try {
      if (!fs.existsSync(this.prepDocumentPath)) {
        throw new Error('Prep document not found');
      }

      const dataBuffer = fs.readFileSync(this.prepDocumentPath);
      const data = await pdfParse(dataBuffer);
      
      this.extractedContent = data.text;
      
      return {
        success: true,
        text: data.text,
        pages: data.numpages,
        info: data.info
      };
    } catch (error) {
      console.error('Error extracting PDF content:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getPrepContent() {
    if (!this.extractedContent) {
      await this.extractPrepDocument();
    }
    return this.extractedContent;
  }

  async extractKeySections() {
    const content = await this.getPrepContent();
    if (!content) return {};

    // Extract common sections from prep documents
    const sections = {
      skills: this.extractSection(content, ['skills', 'technical skills', 'technologies']),
      experience: this.extractSection(content, ['experience', 'work history', 'background']),
      education: this.extractSection(content, ['education', 'academic', 'degree']),
      projects: this.extractSection(content, ['projects', 'portfolio', 'achievements']),
      answers: this.extractSection(content, ['answers', 'responses', 'questions', 'qa']),
      technicalSkills: this.extractSection(content, ['technical skills', 'programming', 'languages', 'frameworks', 'technologies']),
      behavioralExamples: this.extractSection(content, ['behavioral', 'situations', 'examples', 'scenarios', 'stories']),
      projectHighlights: this.extractSection(content, ['highlights', 'achievements', 'results', 'impact', 'outcomes']),
      industryKnowledge: this.extractSection(content, ['industry', 'trends', 'best practices', 'market', 'domain']),
      interviewStrategies: this.extractSection(content, ['interview', 'strategies', 'tips', 'preparation', 'approach']),
      keywords: this.extractKeywords(content)
    };

    return sections;
  }

  extractSection(content, keywords) {
    const lines = content.split('\n');
    let section = '';
    let inSection = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Check if line contains any of the keywords
      const hasKeyword = keywords.some(keyword => lowerLine.includes(keyword));
      
      if (hasKeyword) {
        inSection = true;
        section += line + '\n';
      } else if (inSection && line.trim().length > 0) {
        // Continue section until we hit a blank line or new section
        if (line.trim().length < 3) {
          inSection = false;
        } else {
          section += line + '\n';
        }
      }
    }

    return section.trim();
  }

  extractKeywords(content) {
    // Extract common technical keywords
    const technicalKeywords = [
      'javascript', 'python', 'java', 'react', 'node.js', 'express', 'django',
      'aws', 'azure', 'docker', 'kubernetes', 'kafka', 'redis', 'mongodb',
      'postgresql', 'mysql', 'graphql', 'rest', 'api', 'microservices',
      'machine learning', 'ai', 'ml', 'openai', 'gpt', 'langchain',
      'automation', 'testing', 'ci/cd', 'git', 'agile', 'scrum'
    ];

    const foundKeywords = [];
    const lowerContent = content.toLowerCase();

    technicalKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    });

    return foundKeywords;
  }

  async getEnhancedAIContext() {
    const sections = await this.extractKeySections();
    
    return {
      prepDocument: await this.getPrepContent(),
      sections: sections,
      hasPrepContent: !!sections.skills || !!sections.experience || !!sections.projects
    };
  }
}

module.exports = PDFParser; 