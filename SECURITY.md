# Security Policy

Last updated: 2026-06-08

## Supported Versions

This project does not maintain a formal list of supported versions. Report issues for the latest codebase.

## Reporting a Vulnerability

If you believe you have found a security vulnerability, please report it privately.

- **Email:** timmytheonlinegirl@hotmail.com

Include the following when possible:

- Affected component(s) (e.g., Flask API endpoint, model loading, frontend)
- Steps to reproduce (or a minimal PoC)
- Expected vs actual behavior
- Impact assessment (data exposure, integrity impact, availability impact)
- Any logs or error traces

## How Reports Are Handled

- Reports are reviewed in a timely manner.
- When a fix is ready, a new release/commit will be published.
- We may ask clarifying questions to confirm severity and reproduction steps.

## Scope

Security reports should focus on real-world impact such as:

- Remote code execution or arbitrary file access
- Authentication/authorization bypass
- Sensitive data exposure
- Denial of service issues
- Supply-chain concerns (e.g., unsafe dependency behavior)

Client-side only issues are generally lower priority unless they enable or materially contribute to server-side compromise.

## Out of Scope

- Issues that require unrealistic attacker capabilities or depend on unknown external systems
- Requests for general help, performance tuning, or feature requests
- Bugs that do not have a clear security impact

## Responsible Disclosure

We encourage responsi
