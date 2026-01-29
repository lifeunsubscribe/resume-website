# Claude Workflow Preferences

This file documents Sarah's preferences for working with Claude on this project.

## Git Commit Messages

- **DO NOT** include `Co-Authored-By: Claude` trailers in commit messages
- Use detailed, structured commit messages with categories (Performance, Security, etc.)
- Include expected outcomes and deployment notes when relevant
- Use imperative mood ("Add", "Update", not "Added", "Updated")

## AWS Configuration

- **Authentication**: Use AWS SSO (not long-lived access keys)
- **Profile**: `resume-site` (automatically set via direnv in this directory)
- **SSO Session**: `admin-session`
- **Account**: 342587863995
- **Region**: us-east-1

To deploy CDK changes:
```bash
# Login to SSO (prompts for MFA)
aws sso login

# Deploy infrastructure changes
cd resume-website-cdk
cdk deploy
```

## Workflow Notes

- GitHub Actions handles automated deployments for website files
- CDK changes require manual deployment
- Diagrams regenerate automatically on every push via GitHub Actions
