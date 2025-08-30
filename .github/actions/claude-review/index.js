const core = require('@actions/core');
const github = require('@actions/github');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

// Code Review Agent Prompt
const CODE_REVIEW_AGENT_PROMPT = `You are an elite code review specialist with deep expertise in modern software development practices, security analysis, and code quality assessment. You conduct thorough, constructive reviews that improve code quality while fostering learning and collaboration.

**Core Expertise:**
- Multi-Language Proficiency: Expert-level knowledge of TypeScript, JavaScript, Svelte, SQL, and modern web technologies
- Architecture Analysis: Evaluate system design, separation of concerns, and architectural patterns
- Performance Optimization: Identify bottlenecks, inefficiencies, and optimization opportunities
- Security Assessment: Spot vulnerabilities, security anti-patterns, and potential exploits
- Code Quality: Assess readability, maintainability, testability, and adherence to best practices

**Technology Stack Specialization:**

Frontend Review Focus:
- Svelte/SvelteKit: Component composition, reactivity patterns, performance optimization
- TypeScript: Type safety, interface design, generic usage, and compile-time error prevention
- Tailwind CSS: Class organization, responsive design, accessibility compliance
- Shadcn-Svelte: Proper component usage, customization patterns, design system consistency

Backend Review Focus:
- tRPC: Router organization, input validation, error handling, type safety end-to-end
- Drizzle ORM: Query efficiency, schema design, migration safety, relationship modeling
- Database Design: Indexing strategies, query optimization, data integrity, normalization

**Review Process:**

1. **Functionality & Logic**: Correctness, edge cases, business logic alignment
2. **Code Quality**: Readability, complexity, DRY principles, SOLID compliance
3. **Performance**: Algorithmic efficiency, database queries, bundle optimization
4. **Security**: Input validation, authentication, data exposure prevention
5. **Testing**: Coverage, quality, testability
6. **Standards**: Project conventions, naming, organization

**Response Format:**

Provide your review in the following JSON structure:
{
  "summary": "Brief 1-2 sentence overview of the PR",
  "approval_status": "approved|changes_requested|neutral",
  "labels": ["label1", "label2"],
  "review_sections": [
    {
      "category": "Security|Performance|Code Quality|Architecture|Testing|Standards",
      "severity": "blocking|important|minor",
      "title": "Issue title",
      "description": "Detailed explanation",
      "file": "filename if applicable",
      "suggestions": ["Specific actionable suggestions"]
    }
  ],
  "positive_feedback": ["Things done well"],
  "overall_recommendation": "Your final assessment and next steps"
}

**Label Mapping:**
- security: Security-related issues
- performance: Performance concerns
- bug: Potential bugs or correctness issues
- enhancement: Code improvements or optimizations
- documentation: Missing or incorrect documentation
- testing: Test-related issues
- breaking-change: Changes that break existing functionality
- needs-review: Requires additional human review
- approved: Code meets all standards

Review the following pull request thoroughly and provide constructive feedback.`;

async function main() {
  try {
    // Get inputs
    const anthropicApiKey = core.getInput('anthropic-api-key');
    const prTitle = core.getInput('pr-title');
    const prDescription = core.getInput('pr-description');
    const changedFiles = core.getInput('changed-files');
    const diffContentPath = core.getInput('diff-content');
    
    // Read the diff content
    const diffContent = fs.readFileSync(diffContentPath, 'utf8');
    
    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Prepare the review prompt
    const reviewPrompt = `${CODE_REVIEW_AGENT_PROMPT}

**Pull Request Details:**
Title: ${prTitle}
Description: ${prDescription}

**Changed Files:** ${changedFiles}

**Code Changes:**
\`\`\`diff
${diffContent}
\`\`\`

Please provide a thorough code review following the specified format.`;

    // Call Claude API
    core.info('Sending request to Claude for code review...');
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: reviewPrompt
      }]
    });

    const reviewText = response.content[0].text;
    core.info('Received response from Claude');

    // Parse the JSON response
    let reviewData;
    try {
      // Extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = reviewText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       reviewText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : reviewText;
      reviewData = JSON.parse(jsonString);
    } catch (parseError) {
      core.warning('Failed to parse structured response, using raw text');
      reviewData = {
        summary: 'Code review completed',
        approval_status: 'neutral',
        labels: ['needs-review'],
        review_sections: [{
          category: 'General',
          severity: 'minor',
          title: 'Review Complete',
          description: reviewText,
          suggestions: []
        }],
        positive_feedback: [],
        overall_recommendation: 'Please review the feedback provided.'
      };
    }

    // Format the review content for GitHub
    const reviewContent = formatReviewForGitHub(reviewData);
    
    // Set outputs
    core.setOutput('review-content', reviewContent);
    core.setOutput('labels', reviewData.labels.join(','));
    core.setOutput('approval-status', reviewData.approval_status);

    core.info(`Review completed with status: ${reviewData.approval_status}`);
    core.info(`Labels to apply: ${reviewData.labels.join(', ')}`);

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
    core.error(error.stack);
  }
}

function formatReviewForGitHub(reviewData) {
  let content = `## 🤖 Automated Code Review\n\n`;
  
  content += `**Summary:** ${reviewData.summary}\n\n`;

  if (reviewData.positive_feedback && reviewData.positive_feedback.length > 0) {
    content += `### ✅ Positive Feedback\n\n`;
    reviewData.positive_feedback.forEach(feedback => {
      content += `- ${feedback}\n`;
    });
    content += `\n`;
  }

  if (reviewData.review_sections && reviewData.review_sections.length > 0) {
    content += `### 📋 Review Findings\n\n`;
    
    // Group by severity
    const blocking = reviewData.review_sections.filter(s => s.severity === 'blocking');
    const important = reviewData.review_sections.filter(s => s.severity === 'important');
    const minor = reviewData.review_sections.filter(s => s.severity === 'minor');

    if (blocking.length > 0) {
      content += `#### 🔴 Blocking Issues\n\n`;
      blocking.forEach(section => content += formatReviewSection(section));
    }

    if (important.length > 0) {
      content += `#### 🟡 Important Suggestions\n\n`;
      important.forEach(section => content += formatReviewSection(section));
    }

    if (minor.length > 0) {
      content += `#### 🟢 Minor Suggestions\n\n`;
      minor.forEach(section => content += formatReviewSection(section));
    }
  }

  content += `### 🎯 Overall Recommendation\n\n`;
  content += `${reviewData.overall_recommendation}\n\n`;

  content += `---\n`;
  content += `*Generated by [Claude Code Review Agent](https://github.com/anthropics/claude-code) 🤖*`;

  return content;
}

function formatReviewSection(section) {
  let sectionContent = `**${section.category}: ${section.title}**\n\n`;
  
  if (section.file) {
    sectionContent += `*File: \`${section.file}\`*\n\n`;
  }
  
  sectionContent += `${section.description}\n\n`;
  
  if (section.suggestions && section.suggestions.length > 0) {
    sectionContent += `*Suggestions:*\n`;
    section.suggestions.forEach(suggestion => {
      sectionContent += `- ${suggestion}\n`;
    });
    sectionContent += `\n`;
  }
  
  return sectionContent;
}

main();