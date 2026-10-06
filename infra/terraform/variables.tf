variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Prefix for all resource names"
  type        = string
  default     = "gallery"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "instance_type_app" {
  description = "EC2 instance type for API + Web"
  type        = string
  default     = "t3.small"
}

variable "instance_type_worker" {
  description = "EC2 instance type for media worker"
  type        = string
  default     = "t3.small"
}

variable "instance_type_db" {
  description = "EC2 instance type for PostgreSQL + Redis"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Name of an existing EC2 key pair for SSH access"
  type        = string
}

variable "s3_bucket_name" {
  description = "S3 bucket name for media storage"
  type        = string
  default     = "gallery-media-bucket"
}

variable "db_password" {
  description = "Password for the PostgreSQL database"
  type        = string
  sensitive   = true
  default     = "gallerydbpass2026"
}

variable "jwt_secret" {
  description = "JWT signing secret for the API"
  type        = string
  sensitive   = true
  default     = "change-me-to-a-random-secret"
}
