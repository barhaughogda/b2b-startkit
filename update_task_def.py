import json
import os

with open('task-def.json', 'r') as f:
    data = json.load(f)

task_def = data['taskDefinition']
container_def = task_def['containerDefinitions'][0]

# New secrets to add
new_secrets = [
    {
        "name": "STRIPE_PRICE_ID_FREE",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:779424486071:secret:staging/zenthea/STRIPE_PRICE_ID_FREE"
    },
    {
        "name": "STRIPE_PRICE_ID_PRO",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:779424486071:secret:staging/zenthea/STRIPE_PRICE_ID_PRO"
    },
    {
        "name": "STRIPE_PRICE_ID_ENTERPRISE",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:779424486071:secret:staging/zenthea/STRIPE_PRICE_ID_ENTERPRISE"
    }
]

# Update image to :latest
container_def['image'] = "779424486071.dkr.ecr.us-east-1.amazonaws.com/staging-zenthea:latest"

# Avoid duplicates
existing_secret_names = [s['name'] for s in container_def['secrets']]
for secret in new_secrets:
    if secret['name'] not in existing_secret_names:
        container_def['secrets'].append(secret)

# Prepare for registration (remove read-only fields)
clean_def = {
    "family": task_def["family"],
    "taskRoleArn": task_def["taskRoleArn"],
    "executionRoleArn": task_def["executionRoleArn"],
    "networkMode": task_def["networkMode"],
    "containerDefinitions": task_def["containerDefinitions"],
    "requiresCompatibilities": task_def["requiresCompatibilities"],
    "cpu": task_def["cpu"],
    "memory": task_def["memory"]
}

with open('task-def-updated.json', 'w') as f:
    json.dump(clean_def, f, indent=4)
