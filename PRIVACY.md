# Privacy Notice

This repository is a demo/reference implementation for AI-assisted privacy operations.

## Demo Data

The public repository should contain only fictional or synthetic data. Demo personas, request IDs, vehicle identifiers, addresses, and emails are examples for product evaluation and should not represent real consumers, customers, employees, or prospects.

Use reserved placeholder domains such as `example.com`, `example.org`, `example.net`, or `.example` hostnames for all sample contact details.

## Do Not Commit Personal Data

Do not commit:

- real DSAR requests,
- real consumer records,
- production database exports,
- real email messages,
- screenshots containing personal data,
- generated reports containing personal data,
- logs containing identifiers, tokens, or message bodies from real systems.

## Local and Deployed Operation

When configured with real credentials, the application can connect to external services such as a database, an email inbox, and model APIs. Operators are responsible for ensuring they have appropriate authorization, data-processing agreements, retention controls, and access controls before using the software with real data.

## Data Minimization

For demos and pull requests, prefer the smallest synthetic dataset that proves the behavior under test. Avoid adding new fields that look like sensitive personal information unless they are necessary to demonstrate privacy workflow behavior.
