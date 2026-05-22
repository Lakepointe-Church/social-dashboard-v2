Stage all modified tracked files, commit with the message provided in $ARGUMENTS, then push to origin main.

Steps:
1. Run `git status` to see what's modified
2. Run `git add` on modified tracked files (exclude .DS_Store and other junk)
3. Commit with the message from $ARGUMENTS, appending a Co-Authored-By trailer for Claude
4. Push to origin main
5. Confirm success with the commit hash and a note that Vercel will auto-deploy
