# GitHub Copilot Configuration

This directory contains custom instructions and agents for GitHub Copilot to provide better, more context-aware assistance when working on the dimensional wellness application.

## 📁 Structure

```
.github/
├── copilot-instructions.md      # Repository-wide custom instructions
└── agents/                       # Custom agent profiles
    ├── docs-writer.agent.md      # Documentation specialist
    ├── security-reviewer.agent.md # Security expert
    └── test-helper.agent.md      # Testing specialist
```

## 📖 Repository Instructions

The `copilot-instructions.md` file provides GitHub Copilot with essential context about this project:

- **Tech Stack**: React, TypeScript, Express, PostgreSQL, Tailwind CSS
- **Project Structure**: How the codebase is organized
- **Code Conventions**: TypeScript, React, styling, and API patterns
- **Design Philosophy**: Energy-based, consent-driven, calm UX principles
- **Security Boundaries**: What should never be done
- **Development Commands**: How to build, test, and run the project

These instructions are automatically used by Copilot when you're working in this repository, providing more accurate suggestions that align with our project standards.

## 🤖 Custom Agents

Custom agents are specialized Copilot personas that excel at specific tasks. They have limited tool access to ensure they stay focused on their expertise.

### Documentation Writer (`@docs_writer`)

**Purpose**: Create and maintain clear, user-focused documentation

**Best for**:
- Updating README files
- Writing API documentation
- Creating feature guides
- Fixing documentation typos and formatting
- Adding code comments

**Example usage**:
```
@docs_writer Please update the README to document the new unified search feature
```

**Tools**: view, edit, create, grep, glob (read-only on code)

---

### Security Reviewer (`@security_reviewer`)

**Purpose**: Identify security vulnerabilities and recommend secure coding practices

**Best for**:
- Reviewing code for security issues
- Checking authentication/authorization
- Identifying SQL injection risks
- Finding XSS vulnerabilities
- Validating secrets management
- Reviewing API security

**Example usage**:
```
@security_reviewer Please review the user authentication flow for security issues
```

**Tools**: view, grep, glob, bash (read-only, no code changes)

---

### Test Helper (`@test_helper`)

**Purpose**: Help create and maintain tests

**Best for**:
- Writing unit tests
- Creating integration tests
- Testing React components
- Testing API endpoints
- Identifying edge cases
- Improving test coverage

**Example usage**:
```
@test_helper Please create tests for the wellness dashboard component
```

**Tools**: view, edit, create, grep, glob, bash

---

## 🚀 How to Use

### In VS Code or GitHub Copilot Chat

1. **Repository Instructions**: Automatically applied when working in this repo
   - Just start chatting with Copilot normally
   - It will have context about the project

2. **Custom Agents**: Explicitly invoke them with `@agent_name`
   ```
   @docs_writer Update the API documentation for the new endpoints
   @security_reviewer Check this authentication code for vulnerabilities
   @test_helper Create unit tests for the energy score calculation
   ```

### Best Practices

✅ **Do**:
- Use agents for their specialized tasks
- Provide clear, specific instructions
- Review agent output before applying changes
- Use repository instructions for general coding

❌ **Don't**:
- Don't ask agents to do tasks outside their expertise
- Don't expect agents to make architectural decisions
- Don't blindly apply agent suggestions without review

## 🛠️ Customization

### Updating Instructions

To update repository-wide instructions:
1. Edit `.github/copilot-instructions.md`
2. Commit and push changes
3. Instructions take effect immediately for all developers

### Modifying Agents

To modify an agent:
1. Edit the relevant `.agent.md` file in `.github/agents/`
2. Update the frontmatter (name, description, tools) if needed
3. Modify the instructions and examples
4. Commit and push changes

### Creating New Agents

To create a new agent:
1. Create a new `.agent.md` file in `.github/agents/`
2. Add YAML frontmatter with configuration:
   ```yaml
   ---
   name: agent_name
   description: Brief description of the agent's expertise
   tools:
     - view
     - edit
     - create
   infer: false
   ---
   ```
3. Write detailed instructions for the agent
4. Include examples and boundaries
5. Commit and push

## 📚 Resources

- [GitHub Copilot Custom Instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [Creating Custom Agents](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-agents/creating-custom-agents)
- [How to Write Great Agent Definitions](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
- [Custom Agents Configuration Reference](https://docs.github.com/en/copilot/reference/custom-agents-configuration)

## 🤝 Contributing

When adding new features or making significant changes:

1. **Update Instructions**: Keep `copilot-instructions.md` current
2. **Consider New Agents**: Think about whether a specialized agent would be helpful
3. **Test Agent Behavior**: Try using agents to ensure they work as expected
4. **Document Changes**: Update this README if you add new agents

## 💡 Tips

- Agents are most effective when given specific, focused tasks
- Repository instructions work best for general project context
- Combine both for optimal results: general context + specialized expertise
- Agents can be used in parallel with regular Copilot features

---

**Note**: GitHub Copilot custom instructions and agents are available for GitHub Copilot Enterprise and Business users. Check your organization's Copilot settings to ensure these features are enabled.
