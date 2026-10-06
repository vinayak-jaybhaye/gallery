# AWS EC2 Deployment Guide

Deploy Gallery across 3 EC2 instances using Terraform + Ansible.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS VPC                              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐      │
│  │  DB Instance │  │ App Instance │  │Worker Instance│      │
│  │  (t3.small)  │  │  (t3.small)  │  │  (t3.small)   │      │
│  │              │  │              │  │               │      │
│  │  PostgreSQL  │  │  API (:3000) │  │ media-worker  │      │
│  │  Redis       │  │  Web (:80)   │  │ (Sharp+FFmpeg)│      │
│  │              │  │              │  │               │      │
│  │ :5432 :6379  │  │   public     │  │  no inbound   │      │
│  │ VPC-only     │  │              │  │               │      │
│  └──────┬───────┘  └───────┬──────┘  └──────┬────────┘      │
│         │                  │                │               │
│         └──────────────────┼─────────────── ┘               │
│                     (private network)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                        ┌─────┴─────┐
                        │  AWS S3   │
                        │  (media)  │
                        └───────────┘
```

## Prerequisites

- AWS CLI configured (`aws configure`)
- An EC2 key pair (create in AWS Console → EC2 → Key Pairs)
- Terraform >= 1.5
- Ansible >= 2.14
- Your public IP (run: `curl ifconfig.me`)

## Step 1: Terraform — Provision Infrastructure

```bash
cd infra/terraform

# Copy and fill in your values
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars:
#   key_name       = "your-key-pair-name"
#   my_ip          = "YOUR_PUBLIC_IP/32"
#   s3_bucket_name = "gallery-media-UNIQUE"  (must be globally unique)

# Provision
terraform init
terraform plan
terraform apply
```

After apply, note the outputs:
```bash
terraform output           # shows IPs and URLs
terraform output -raw s3_access_key_id
terraform output -raw s3_secret_access_key
```

## Step 2: Generate Ansible Inventory

```bash
cd ../ansible

# Auto-generate from Terraform outputs
./generate-inventory.sh

# Review and update inventory.ini:
#   - ansible_ssh_private_key_file → path to your .pem key
#   - jwt_secret → a strong random string
#   - google_client_id / google_client_secret → your OAuth creds
```

## Step 3: Ansible — Configure & Deploy

```bash
cd infra/ansible

# Run the full playbook
ansible-playbook site.yml

# Or run specific hosts:
ansible-playbook site.yml --limit db       # just database
ansible-playbook site.yml --limit app      # just API + web
ansible-playbook site.yml --limit worker   # just worker
```

## Step 4: Access

After successful deployment:

| Service | URL |
|---------|-----|
| Web UI | `http://<APP_PUBLIC_IP>` |
| API | `http://<APP_PUBLIC_IP>:3000` |
| Health check | `http://<APP_PUBLIC_IP>:3000/health` |

## Teardown (important!)

Since this is a short-lived deployment:

```bash
cd infra/terraform
terraform destroy
```

This removes **everything**: EC2 instances, VPC, security groups, S3 bucket (including all media files due to `force_destroy = true`).

## SSH Access

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@<DB_PUBLIC_IP>
ssh -i ~/.ssh/your-key.pem ec2-user@<APP_PUBLIC_IP>
ssh -i ~/.ssh/your-key.pem ec2-user@<WORKER_PUBLIC_IP>
```

## View Container Logs

```bash
# On the app instance:
ssh -i ~/.ssh/your-key.pem ec2-user@<APP_PUBLIC_IP>
cd gallery && docker compose -f docker-compose.cloud.yml logs -f

# On the worker instance:
ssh -i ~/.ssh/your-key.pem ec2-user@<WORKER_PUBLIC_IP>
cd gallery && docker compose -f docker-compose.worker.yml logs -f

# On the DB instance:
ssh -i ~/.ssh/your-key.pem ec2-user@<DB_PUBLIC_IP>
cd gallery-db && docker compose logs -f
```

## Redeploy After Code Changes

```bash
# Push changes to GitHub, then:
cd infra/ansible
ansible-playbook site.yml --limit app      # redeploy API + web
ansible-playbook site.yml --limit worker   # redeploy worker
```

## File Structure

```
infra/
├── terraform/
│   ├── main.tf                    # VPC, subnets, security groups
│   ├── ec2.tf                     # 3 EC2 instances
│   ├── s3.tf                      # S3 bucket + IAM user
│   ├── variables.tf               # All configurable inputs
│   ├── outputs.tf                 # IPs, URLs, credentials
│   └── terraform.tfvars.example   # Template for your values
└── ansible/
    ├── site.yml                   # Master playbook
    ├── inventory.ini              # Host inventory
    ├── ansible.cfg                # Ansible settings
    ├── generate-inventory.sh      # Auto-fill from Terraform
    └── roles/
        ├── common/tasks/          # Docker installation
        ├── db/                    # PostgreSQL + Redis
        │   ├── tasks/
        │   └── templates/
        ├── app/                   # API + Web + migrations
        │   ├── tasks/
        │   └── templates/
        └── worker/                # Media processing worker
            ├── tasks/
            └── templates/
```
