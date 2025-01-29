# Contributing

Contributions are welcome and will be fully credited!

We accept contributions via Pull Requests on [Github](https://github.com/Bankole2000/logistics-api).

## Pull Requests

Here are some guidelines to make the process smoother:

- **Add a test** - New features and bugfixes need tests. If you find it difficult to test, please tell us in the pull request and we will try to help you!
- **Document any change in behaviour** - Make sure the `README.md` and any other relevant documentation are kept up-to-date.
- **Run `npm test` locally** - This will allow you to go faster
- **One pull request per feature** - If you want to do more than one thing, send multiple pull requests.
- **Send coherent history** - Make sure your commits message means something
- **Consider our release cycle** - We try to follow [SemVer v2.0.0](http://semver.org/). Randomly breaking public APIs is not an option.

## Getting Started

1. **Fork the Repository**  
   Create a copy of this repository on your GitHub account by clicking the **Fork** button.

2. **Clone Your Fork**  
   Clone your forked repository to your local machine:  

    ```bash
    git clone https://github.com/<your-username>/<repository-name>.git
    cd <repository-name>
    ```

3. **Set Up the Environment**  
   Follow the setup instructions in the `README.md` to install dependencies and configure your development environment.

4. **Create a Branch**  
    Create a new branch for your contribution:

    ```bash
    git checkout -b <branch-name>
    ```

## How to Contribute

### Reporting Issues

If you encounter a bug or have a feature request:

1. Search the [issue tracker](https://github.com/Bankole2000/logistics-api/issues) to see if it’s already been reported.
2. If not, [open a new issue](https://github.com/Bankole2000/logistics-api/issues/new/choose) and provide:
   - A descriptive title.
   - Steps to reproduce the issue (if applicable).
   - Expected vs. actual behavior.
   - Screenshots or logs (if relevant).

### Submitting Pull Requests

1. Ensure your changes are in a separate branch based on `main`.
2. Follow the [Coding Guidelines](#coding-guidelines) when making changes.
3. Add tests for your changes, if applicable.
4. Commit your changes with a [descriptive commit message](#commit-message-guidelines).
5. Push your branch:

    ```bash
      git push -u origin <branch-name>
    ```

6. [Open a pull request](https://github.com/Bankole2000/logistics-api/compare) with:
   - A clear title.
   - A detailed description of your changes.
   - The issue(s) your PR addresses (e.g., "Closes #123").

### Code of Conduct

Please review our [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing. By participating, you agree to uphold this code.

### Coding Guidelines

- **Code Style**: Follow the established coding conventions for this project.
- **Testing**: Write tests for new features and bug fixes.
- **Documentation**: Update documentation (e.g., README, comments) to reflect your changes.

### Commit Message Guidelines

This project uses [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) and follows the [SemVer](https://semver.org/) versioning conventions. Please follow these conventions for commit messages:

- Please avoid running `--no-verify` commits
- Use the commit format
  `<type>(<scope>)!: <description>`

   ```md
      Examples:
      <type>(<scope>)!: <description>
      <type>(<scope>): <description>
      <type>: <description>
       Use ! for breaking changes. (<scope>) is optional
       e.g. git commit -m "feat(api)!: added breaking change"
       e.g. git commit -m "fix(api): implement nginx"
       e.g. git commit -m "wip: not done with task" 
   ```

- List of valid of commit `type`s:
  - `feat`: New feature
  - `fix`: Bug fix
  - `docs`: Documentation changes
  - `test`: Adding or fixing tests
  - `chore`: Maintenance or cleanup tasks
  - `style`: Style changes
  - `refactor`: Code Fefactor
  - `perf`: Performance changes or improvements
  - `build`: Build related changes
  - `wip`: Work in progress
  - `revert`: Roll back or revert changes
  - `ci`: Continuous integration changes

### Contact

For questions or further assistance, feel free to reach out:

- [Open an issue](https://github.com/Bankole2000/logistics-api/issues/new/choose)
- Email: <techybanky@gmail.com>

Thank you for contributing! 🎉
