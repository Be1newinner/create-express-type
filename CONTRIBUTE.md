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

This section is for maintainers with publishing rights. It outlines the process for releasing a new version of the package to npm.

1.  **Login to npm:** Ensure you are logged into the correct npm account in your terminal.

    ```bash
    npm login
    ```

2.  **Update the Version:** Decide on the correct [Semantic Versioning (SemVer)](https://semver.org/) bump.

    - `npm version patch` for a backward-compatible bug fix.
    - `npm version minor` for a new backward-compatible feature.
    - `npm version major` for a breaking change.

    This command will automatically update `package.json`, create a Git commit, and create a Git tag.

3.  **Publish the Package:** Publish the new version to the npm registry.

    ```bash
    npm publish
    ```

4.  **Push Changes to Git:** Push the new version commit and tag to the remote repository.

    ```bash
    git push
    git push --tags
    ```
