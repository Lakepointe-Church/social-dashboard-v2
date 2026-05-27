Create a new feature branch off the latest main and push it to origin so Vercel generates a preview URL.

The branch name to create is provided in $ARGUMENTS. If no name is provided, ask Jolie for one before proceeding.

Steps:
1. Run `git branch --show-current` to note the current branch
2. Run `git checkout main` to switch to main
3. Run `git pull origin main` to make sure we have the latest code
4. Run `git checkout -b $ARGUMENTS` to create the new branch
5. Run `git push -u origin $ARGUMENTS` to push it to GitHub (this triggers Vercel to create the preview URL)
6. Confirm success — tell Jolie:
   - The branch name that was created
   - That Vercel will generate a preview URL in about 30–60 seconds (visible at vercel.com or in the GitHub PR once one is opened)
   - That /ship will now commit to this branch (not production)
   - That /pr will open the pull request when the feature is ready to go live
