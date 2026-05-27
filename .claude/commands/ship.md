Stage all modified tracked files, commit with the message provided in $ARGUMENTS, then push to the current branch.

Steps:
1. Run `git branch --show-current` to find the current branch
2. Run `git status` to see what's modified
3. Run `git add` on modified tracked files (exclude .DS_Store and other junk)
4. Commit with the message from $ARGUMENTS, appending a Co-Authored-By trailer for Claude
5. Push to origin <current-branch>
6. If the current branch is `main`: confirm with the commit hash and note that Vercel will auto-deploy to production
   If the current branch is anything else: confirm with the commit hash and note that the Vercel preview URL has been updated, and remind Jolie to run /pr when the feature is fully ready to go live
