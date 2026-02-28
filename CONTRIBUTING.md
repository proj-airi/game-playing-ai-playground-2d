# Contributing

Thank you for contributing to this project.

## Commit Message Convention

Please use the **Conventional Commits** format for commit messages:

```text
<type>(<scope>): <subject>
```

- `type`: commit category. Recommended values:
  - `feat`: a new feature
  - `fix`: a bug fix
  - `docs`: documentation-only changes
  - `style`: formatting changes that do not affect logic
  - `refactor`: code changes that neither add a feature nor fix a bug
  - `perf`: performance improvements
  - `test`: test additions or updates
  - `build`: build system or dependency changes
  - `ci`: CI configuration changes
  - `chore`: other maintenance tasks
  - `revert`: revert a previous commit
- `scope`: optional, indicates the affected area (for example, `ui`, `core`, `docs`).
- `subject`: a short, clear summary of the change. Prefer imperative mood, lowercase start, and no trailing period.

Examples:

```text
feat(ui): add player status panel
fix(core): handle null game state
chore: update lint config
```

## Pull Request Recommendations

- Keep changes minimal and focused.
- Ensure required checks pass before opening a PR.
- Include the following in the PR description:
  - Background / motivation
  - Key changes
  - Validation steps
