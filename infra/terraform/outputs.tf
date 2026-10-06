# ──────────────────────────────────────────────
# Outputs — used by Ansible inventory
# ──────────────────────────────────────────────

output "db_public_ip" {
  description = "Public IP of the database instance"
  value       = aws_instance.db.public_ip
}

output "db_private_ip" {
  description = "Private IP of the database instance (for app/worker to connect)"
  value       = aws_instance.db.private_ip
}

output "app_public_ip" {
  description = "Public IP of the app instance"
  value       = aws_instance.app.public_ip
}

output "worker_public_ip" {
  description = "Public IP of the worker instance"
  value       = aws_instance.worker.public_ip
}

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.media.bucket
}

output "s3_access_key_id" {
  description = "IAM access key for S3"
  value       = aws_iam_access_key.app_s3.id
  sensitive   = true
}

output "s3_secret_access_key" {
  description = "IAM secret key for S3"
  value       = aws_iam_access_key.app_s3.secret
  sensitive   = true
}

output "web_url" {
  description = "URL to access the gallery"
  value       = "http://${aws_instance.app.public_ip}"
}

output "api_url" {
  description = "URL to access the API"
  value       = "http://${aws_instance.app.public_ip}:3000"
}
