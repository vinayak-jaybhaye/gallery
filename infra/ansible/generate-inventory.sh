#!/usr/bin/env bash
# Generate Ansible inventory from Terraform outputs
# Run from: infra/ansible/
set -euo pipefail

TF_DIR="../terraform"

get_output() {
  terraform -chdir="$TF_DIR" output -raw "$1" 2>/dev/null
}

DB_PUBLIC_IP=$(get_output db_public_ip)
DB_PRIVATE_IP=$(get_output db_private_ip)
APP_PUBLIC_IP=$(get_output app_public_ip)
WORKER_PUBLIC_IP=$(get_output worker_public_ip)
S3_BUCKET=$(get_output s3_bucket_name)
S3_ACCESS_KEY=$(get_output s3_access_key_id)
S3_SECRET_KEY=$(get_output s3_secret_access_key)

# Preserve existing secrets if present
EXISTING_CLIENT_ID=$(grep -E '^google_client_id=' inventory.ini 2>/dev/null | cut -d= -f2- || true)
EXISTING_CLIENT_SECRET=$(grep -E '^google_client_secret=' inventory.ini 2>/dev/null | cut -d= -f2- || true)
EXISTING_JWT=$(grep -E '^jwt_secret=' inventory.ini 2>/dev/null | cut -d= -f2- || true)
EXISTING_KEY=$(grep -E '^ansible_ssh_private_key_file=' inventory.ini 2>/dev/null | cut -d= -f2- || true)

GOOGLE_ID="${EXISTING_CLIENT_ID:-YOUR_GOOGLE_CLIENT_ID}"
GOOGLE_SECRET="${EXISTING_CLIENT_SECRET:-YOUR_GOOGLE_CLIENT_SECRET}"
JWT_SEC="${EXISTING_JWT:-change-me-to-a-random-secret}"
SSH_KEY="${EXISTING_KEY:-~/keys/sandbox-key.pem}"

cat > inventory.ini <<EOF
[db]
db-server ansible_host=${DB_PUBLIC_IP}

[app]
app-server ansible_host=${APP_PUBLIC_IP}

[worker]
worker-server ansible_host=${WORKER_PUBLIC_IP}

[all:vars]
ansible_user=ec2-user
ansible_ssh_private_key_file=${SSH_KEY}

# Database config
db_private_ip=${DB_PRIVATE_IP}
db_password=gallerydbpass2026
db_name=gallery
db_user=gallery

# S3 config
aws_region=ap-south-1
s3_bucket_name=${S3_BUCKET}
s3_access_key_id=${S3_ACCESS_KEY}
s3_secret_access_key=${S3_SECRET_KEY}

# App config
jwt_secret=${JWT_SEC}
app_public_ip=${APP_PUBLIC_IP}
google_client_id=${GOOGLE_ID}
google_client_secret=${GOOGLE_SECRET}
EOF

echo "✓ inventory.ini generated"
echo "  DB:     ${DB_PUBLIC_IP} (private: ${DB_PRIVATE_IP})"
echo "  App:    ${APP_PUBLIC_IP}"
echo "  Worker: ${WORKER_PUBLIC_IP}"
echo ""
echo "⚠ Review inventory.ini and update:"
echo "  - ansible_ssh_private_key_file"
echo "  - jwt_secret"
echo "  - google_client_id / google_client_secret"
