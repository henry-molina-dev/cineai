import { Construct } from 'constructs';

// Log retention is configured per-Lambda via the logRetention prop in Api.
// This construct is a placeholder for future additions:
//   - CloudWatch alarms on Lambda error rates
//   - S3 log bucket with CloudWatch subscription filters for warn/error routing
//   - Budget alerts via AWS Budgets
export class Observability extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
  }
}
