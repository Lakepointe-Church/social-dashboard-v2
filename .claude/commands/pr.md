Open a GitHub Pull Request from the current feature branch into main, ready for Jolie to merge and deploy to production.

Steps:
1. Run `git branch --show-current` to get the current branch name
2. If the current branch is `main`, stop and tell Jolie she's already on main — nothing to PR. Suggest using /branch to start a new feature first.
3. Run `git status` — if there are uncommitted changes, commit and push them first (ask Jolie for a commit message, or use $ARGUMENTS if provided)
4. Run `git push origin <current-branch>` to make sure the branch is fully pushed
5. Run `git log main..<current-branch> --oneline` to see all commits on this branch
6. Run `gh pr create --base main --head <current-branch>` with a title and body:
   - Title: short summary of what the branch does (derive from the branch name and commits)
   - Body: bullet list of what was built/changed, pulled from the commit messages
   - Use a HEREDOC to pass the body so formatting is preserved
7. After the PR is created, print:
   - The GitHub PR URL
   - A reminder that merging the PR on GitHub will deploy to production
   - That the Vercel preview URL is visible on the PR page (Vercel posts it as a comment automatically)
