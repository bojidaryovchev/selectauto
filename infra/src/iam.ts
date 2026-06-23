/**
 * IAM roles and policies.
 *
 * Two roles:
 *   1. lambdaRole — assumed by all ingestion Lambdas. Grants CloudWatch Logs and
 *      read access to the two Secrets Manager secrets. NO VPC permissions —
 *      Lambdas reach Neon over the public internet (see README tradeoffs).
 *   2. sfnRole — assumed by Step Functions. Grants permission to invoke the
 *      ingestion Lambdas and to write its own execution logs.
 *
 * Least privilege: secret access is scoped to the specific secret ARNs;
 * lambda:InvokeFunction is scoped to the specific function ARNs.
 */
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { namePrefix, tags } from "./config";

export interface IamRoles {
  lambdaRole: aws.iam.Role;
}

/**
 * Create the Lambda execution role with logs + secrets access.
 * @param secretArns ARNs of the Secrets Manager secrets the Lambdas may read.
 * @param queueArns ARNs of SQS queues the Lambdas consume (detail-refresh worker).
 */
export function createLambdaRole(
  secretArns: pulumi.Output<string>[],
  queueArns: pulumi.Output<string>[] = [],
): IamRoles {
  const lambdaRole = new aws.iam.Role("ingestion-lambda-role", {
    name: `${namePrefix}-lambda-role`,
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Service: "lambda.amazonaws.com" },
          Action: "sts:AssumeRole",
        },
      ],
    }),
    tags,
  });

  // CloudWatch Logs (create group/stream + put events). Scoped to our log groups.
  new aws.iam.RolePolicy("ingestion-lambda-logs", {
    role: lambdaRole.id,
    policy: pulumi.jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
          Resource: "arn:aws:logs:*:*:*",
        },
      ],
    }),
  });

  // Read the two secrets (scoped to their ARNs, plus the AWS-managed suffix).
  new aws.iam.RolePolicy("ingestion-lambda-secrets", {
    role: lambdaRole.id,
    policy: pulumi.jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
          // Secrets Manager appends a random 6-char suffix; allow it with a wildcard.
          Resource: secretArns.map((arn) => pulumi.interpolate`${arn}*`),
        },
      ],
    }),
  });

  // SQS consume permissions for the detail-refresh drain worker (the event
  // source mapping needs these to receive/delete messages and read attributes).
  if (queueArns.length > 0) {
    new aws.iam.RolePolicy("ingestion-lambda-sqs", {
      role: lambdaRole.id,
      policy: pulumi.jsonStringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "sqs:ReceiveMessage",
              "sqs:DeleteMessage",
              "sqs:GetQueueAttributes",
              "sqs:ChangeMessageVisibility",
            ],
            Resource: queueArns,
          },
        ],
      }),
    });
  }

  return { lambdaRole };
}

/**
 * Create the Step Functions execution role. Scoped to invoke exactly the given
 * Lambda function ARNs, plus its own CloudWatch Logs delivery.
 */
export function createStepFunctionsRole(lambdaArns: pulumi.Output<string>[]): aws.iam.Role {
  const sfnRole = new aws.iam.Role("ingestion-sfn-role", {
    name: `${namePrefix}-sfn-role`,
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Service: "states.amazonaws.com" },
          Action: "sts:AssumeRole",
        },
      ],
    }),
    tags,
  });

  new aws.iam.RolePolicy("ingestion-sfn-invoke", {
    role: sfnRole.id,
    policy: pulumi.jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["lambda:InvokeFunction"],
          // Allow base ARN and the ":$LATEST"/version-qualified ARNs.
          Resource: lambdaArns.flatMap((arn) => [arn, pulumi.interpolate`${arn}:*`]),
        },
        {
          // Required for Step Functions to deliver execution logs to CloudWatch.
          Effect: "Allow",
          Action: [
            "logs:CreateLogDelivery",
            "logs:GetLogDelivery",
            "logs:UpdateLogDelivery",
            "logs:DeleteLogDelivery",
            "logs:ListLogDeliveries",
            "logs:PutResourcePolicy",
            "logs:DescribeResourcePolicies",
            "logs:DescribeLogGroups",
          ],
          Resource: "*",
        },
      ],
    }),
  });

  return sfnRole;
}

/**
 * Create the EventBridge Scheduler role. Scoped to start exactly the given
 * Step Functions state machine ARNs (both schedules target state machines).
 */
export function createSchedulerRole(
  stateMachineArns: pulumi.Output<string>[],
  lambdaArns: pulumi.Output<string>[] = [],
): aws.iam.Role {
  const schedulerRole = new aws.iam.Role("ingestion-scheduler-role", {
    name: `${namePrefix}-scheduler-role`,
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Service: "scheduler.amazonaws.com" },
          Action: "sts:AssumeRole",
        },
      ],
    }),
    tags,
  });

  new aws.iam.RolePolicy("ingestion-scheduler-policy", {
    role: schedulerRole.id,
    policy: pulumi.jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["states:StartExecution"],
          Resource: stateMachineArns,
        },
        // Only include the Lambda-invoke statement if any Lambda targets exist
        // (an empty Resource array is an invalid IAM policy).
        ...(lambdaArns.length > 0
          ? [
              {
                Effect: "Allow",
                Action: ["lambda:InvokeFunction"],
                Resource: lambdaArns.flatMap((arn) => [arn, pulumi.interpolate`${arn}:*`]),
              },
            ]
          : []),
      ],
    }),
  });

  return schedulerRole;
}
