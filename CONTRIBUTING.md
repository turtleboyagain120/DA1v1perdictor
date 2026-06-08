# Contributing

Thank you for your interest in contributing to this project.

## How to Contribute

1. **Fork** the repository.
2. **Create a branch** for your change:
   - `blackboxai/<short-description>` or any descriptive name.
3. **Make your changes**.
4. **Update tests/docs** if applicable.
5. **Submit a Pull Request**.

## Development Setup

### Backend (Python)

1. Install Python dependencies:

```bash
pip install -r requirements.txt
```

2. Run the server:

```bash
python app.py
```

### Frontend (Static)

This repo includes a simple static UI. You can open `index.html` directly in a browser after starting the Flask backend.

## Code Style & Quality

- Keep changes focused and easy to review.
- Follow existing file structure and patterns.
- Avoid introducing breaking changes without documenting them.

## Testing

If tests exist, run them before submitting a PR:

```bash
npm test
```

(If the project doesn’t have runnable tests in your environment, run what is available and document any limitations in the PR description.)

## Pull Request Description Template

- What does this change do?
- Why is it needed?
- How was it tested?
- Any risks/rollbacks?

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see repository license file if present).

