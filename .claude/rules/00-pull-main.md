# Before Starting Any Feature 🚀

**MANDATORY**: Before starting work on ANY feature (whether creating a new branch or working on an existing one), you MUST pull the latest changes from the main branch.

## Steps

### Creating a New Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### Working on an Existing Branch
```bash
git checkout your-existing-branch
git pull origin main
git merge main
```

## Why?

- Prevents merge conflicts 💥
- Ensures you're building on the latest code
- Avoids duplicate work
- Makes PRs cleaner and easier to review

## Important

This rule applies EVERY TIME you start working on a feature, not just the first time. Always sync with main!
