# ──────────────────────────────────────────────
# S3 Bucket for media storage
# ──────────────────────────────────────────────

resource "aws_s3_bucket" "media" {
  bucket        = var.s3_bucket_name
  force_destroy = true # easy cleanup for short-lived deployment

  tags = { Name = "${var.project_name}-media" }
}

resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ──────────────────────────────────────────────
# IAM user for app S3 access
# ──────────────────────────────────────────────

resource "aws_iam_user" "app_s3" {
  name = "${var.project_name}-s3-user"
}

resource "aws_iam_access_key" "app_s3" {
  user = aws_iam_user.app_s3.name
}

resource "aws_iam_user_policy" "app_s3" {
  name = "${var.project_name}-s3-access"
  user = aws_iam_user.app_s3.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:ListAllMyBuckets"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:ListMultipartUploadParts",
          "s3:AbortMultipartUpload",
          "s3:CreateMultipartUpload",
          "s3:CompleteMultipartUpload",
          "s3:ListBucketMultipartUploads",
        ]
        Resource = [
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*",
        ]
      }
    ]
  })
}
