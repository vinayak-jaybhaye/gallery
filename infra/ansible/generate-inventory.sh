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

cat > inventory.ini <<EOF
[db]
db-server ansible_host=${DB_PUBLIC_IP}

[app]
app-server ansible_host=${APP_PUBLIC_IP}

[worker]
worker-server ansible_host=${WORKER_PUBLIC_IP}

[all:vars]
ansible_user=ec2-user
ansible_ssh_private_key_file=~/keys/sandbox-key.pem

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
jwt_secret=change-me-to-a-random-secret
app_public_ip=${APP_PUBLIC_IP}
google_client_id=YOUR_GOOGLE_CLIENT_ID
google_client_secret=YOUR_GOOGLE_CLIENT_SECRET
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
