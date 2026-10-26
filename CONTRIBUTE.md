# Contributing to `create-express-type`

First and foremost, thank you for your interest in contributing! Your help is greatly appreciated. This guide will walk you through the process of making a contribution, from setting up your local environment to publishing a new version.

## **Code of Conduct**

Please be respectful and welcoming to all members of our community. We expect all contributors to follow our Code of Conduct.

## **How to Contribute**

### **1. Report Bugs or Suggest Features**

- **Bugs:** If you find a bug, please check the [Issues page](https://github.com/Be1newinner/create-express-type/issues) to see if it has already been reported. If not, open a new issue with a clear title and description. Include steps to reproduce the bug and details about your environment.
- **Features:** If you have an idea for a new feature, please open an issue to discuss it before you start working on it. This helps ensure that the feature aligns with the project's goals.

### **2. Setup Your Local Environment**

1.  **Fork the Repository:** Create a fork of the `create-express-type` repository to your GitHub account.
2.  **Clone Your Fork:** Clone your forked repository to your local machine.

    ```bash
    git clone https://github.com/Be1newinner/create-express-type/.git
    cd create-express-type
    ```

3.  **Install Dependencies:** Install the required dependencies to run and test the project.

    ```bash
    npm install
    ```

4.  **Create a New Branch:** Always create a new branch for your work. Use a descriptive name like `fix/git-check-issue` or `feat/add-new-option`.

    ```bash
    git checkout -b fix/your-issue-name
    ```

### **3. Make Your Changes**

- Make your changes in the new branch.
- Ensure your code follows the project's coding style (run linters and formatters if available).
- Write tests for any new features or bug fixes.
- Make sure all existing tests pass before you submit your changes.

### **4. Submit Your Contribution**

1.  **Commit Your Changes:** Commit your changes with a clear and descriptive commit message. A good commit message explains _what_ you changed and _why_.

    ```bash
    git commit -m "docs: Add CONTRIBUTING.md file"
    ```

2.  **Push to Your Fork:** Push your local branch to your forked repository on GitHub.

    ```bash
    git push origin your-branch-name
    ```

3.  **Open a Pull Request:** Go to your fork on GitHub and open a pull request (PR). Describe your changes in detail, link to the relevant issue, and explain any trade-offs you made.

## **Publishing an Updated Version (For Maintainers)**

Releases are automated by the [Release workflow](.github/workflows/release.yml). Don't run `npm publish` by hand.

- **Patch (`x.y.Z`) — automatic.** Every push to `main` that changes something shipped in the npm package (`src/`, `packages/` or `package.json`) runs CI and, if it passes, publishes the next patch version. Changes to docs, CI or tests alone don't release.
- **Minor (`x.Y.0`) — maintainer approval only.** Go to **Actions → Release → Run workflow**, choose `bump: minor`, and run it. Only the repository owner can start it.
- **Major (`X.0.0`) — never automated.**

Each release gets a `vX.Y.Z` git tag and a GitHub release listing the shipped commits. The `version` in `package.json` isn't updated in the repo; the workflow sets it at publish time, based on the latest version on npm.

Publishing uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), so no npm token is stored in the repo. It's configured once on npmjs.com, under the package's **Settings → Trusted publishing**: GitHub Actions, repository `Be1newinner/create-express-type`, workflow `release.yml`.
