# Automated Code Review System

This project uses an automated code review system powered by Claude AI that
provides consistent, thorough code reviews for all pull requests.

## Overview

The automated review system uses our specialized `code-review-specialist`
agent to analyze pull requests and provide structured feedback on:

- **Code Quality**: Readability, maintainability, and best practices
- **Security**: Vulnerability detection and security anti-patterns
- **Performance**: Optimization opportunities and bottleneck identification  
- **Architecture**: System design and separation of concerns
- **Standards**: Project conventions and consistency

## How It Works

### Triggering Reviews

The automated review system triggers on:

- New pull requests (`opened`)
- Updates to existing pull requests (`synchronize`)
- Reopened pull requests (`reopened`)

**Excluded from review:**

- Draft pull requests
- Documentation-only changes (`.md` files in docs folder)
- Configuration files (`.gitignore`, `LICENSE`)

### Review Process

1. **Code Analysis**: Extracts changed files and generates diff
2. **AI Review**: Sends code to Claude using our code-review-specialist agent
3. **Structured Feedback**: Receives categorized feedback with severity levels
4. **GitHub Integration**: Posts review comments and applies appropriate labels

### Review Categories

#### 🔴 Blocking Issues

- Security vulnerabilities
- Breaking changes without migration paths
- Critical bugs or data corruption risks
- Performance regressions

#### 🟡 Important Suggestions  

- Code quality improvements
- Performance optimizations
- Maintainability concerns
- Testing gaps

#### 🟢 Minor Suggestions

- Style preferences
- Alternative approaches
- Future optimizations
- Learning opportunities

## Labels Applied

The system automatically applies relevant labels based on findings:

- `security` - Security-related issues identified
- `performance` - Performance concerns found
- `bug` - Potential bugs or correctness issues
- `enhancement` - Code improvements suggested
- `documentation` - Missing or incorrect documentation
- `testing` - Test-related issues
- `breaking-change` - Changes that break existing functionality
- `needs-review` - Requires additional human review
- `approved` - Code meets all standards

## Setup Requirements

### Repository Secrets

Add the following secrets to your GitHub repository:

1. **`ANTHROPIC_API_KEY`**: Your Anthropic API key for Claude access
   - Go to Repository Settings → Secrets and variables → Actions
   - Add new repository secret with name `ANTHROPIC_API_KEY`
   - Get API key from [Anthropic Console](https://console.anthropic.com/)

### Permissions

The workflow requires these permissions:

- `contents: read` - Access repository code
- `pull-requests: write` - Post review comments
- `issues: write` - Apply labels to PRs

## Review Output Format

The automated review provides:

### Summary

Brief overview of the pull request and key findings

### Positive Feedback

Highlights of well-implemented code and good practices

### Categorized Findings

Structured feedback organized by:

- **Category**: Security, Performance, Code Quality, etc.
- **Severity**: Blocking, Important, or Minor
- **File Location**: Specific files where issues were found
- **Actionable Suggestions**: Concrete steps to address issues

### Overall Recommendation

Final assessment and recommended next steps

## Integration with Human Reviews

The automated review **complements** rather than replaces human code review:

- **Catches Common Issues**: Identifies patterns, security issues, and style problems
- **Consistent Standards**: Applies the same criteria to all code
- **Educational Value**: Explains the reasoning behind suggestions
- **Human Oversight**: Complex architectural decisions still require human judgment

## Best Practices

### For Authors

- Address blocking issues before requesting human review
- Consider important suggestions for code quality improvements
- Use minor suggestions as learning opportunities

### For Reviewers

- Review the automated feedback before conducting manual review
- Focus human review on business logic, requirements, and architecture
- Override AI suggestions when context requires different approaches

## Customization

### Modifying Review Criteria

The review agent can be customized by editing:

- `.github/actions/claude-review/index.js` - Core review logic
- Agent prompt in the JavaScript file - Review focus areas and standards

### Adjusting Triggers

Modify `.github/workflows/code-review.yml` to:

- Change trigger conditions
- Add/remove file types for review
- Adjust permissions and workflow steps

## Monitoring and Maintenance

### Viewing Review Results

- Check the "Actions" tab for workflow execution logs
- Review comments appear automatically on pull requests
- Labels are applied based on findings

### Troubleshooting

- Ensure `ANTHROPIC_API_KEY` is correctly set
- Check workflow logs for API errors or parsing issues
- Verify repository permissions for the GitHub token

## Cost Considerations

- Reviews use Claude API tokens based on code size
- Larger pull requests consume more tokens
- Consider breaking large changes into smaller PRs
- Monitor API usage in Anthropic Console

## Future Enhancements

Potential improvements for the review system:

- **File-specific reviews** for targeted feedback
- **Integration with CI/CD** for automated fixes
- **Custom rule sets** for different code areas
- **Review quality metrics** and feedback loops
