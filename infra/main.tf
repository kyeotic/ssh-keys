
terraform {
  backend "s3" {}
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.0.10"
}

provider "cloudflare" {
  # uses CLOUDFLARE_API_TOKEN from environment
}
