#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# BeYours Engine - AWS S3 & SES Setup Script
#
# Configures:
#   1. S3 bucket with CORS, lifecycle rules, and folder structure
#   2. SES domain identity with DKIM verification
#   3. SES email sending configuration
#   4. IAM user with minimal permissions for the app
#
# Usage:
#   chmod +x scripts/setup-aws.sh
#   ./scripts/setup-aws.sh
#
# Prerequisites:
#   - AWS CLI configured (aws configure)
#   - Sufficient IAM permissions (S3, SES, IAM, Route53 optional)
# ============================================================================

# ── Configuration ────────────────────────────────────────────────────────────

REGION="eu-west-3"
DOMAIN="beindigital.fr"
BUCKET_NAME="beyours-engine-assets"
IAM_USER="beyours-engine-app"
ENV_FILE=".env.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERR]${NC}   $1"; }
log_section() { echo -e "\n${BLUE}══════════════════════════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}══════════════════════════════════════════════════${NC}\n"; }

# ── Preflight checks ────────────────────────────────────────────────────────

log_section "Preflight Checks"

if ! command -v aws &>/dev/null; then
  log_error "AWS CLI not found. Install with: brew install awscli"
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
if [ -z "$ACCOUNT_ID" ]; then
  log_error "AWS CLI not authenticated. Run: aws configure"
  exit 1
fi

log_success "AWS CLI authenticated - Account: $ACCOUNT_ID"
log_info "Region: $REGION"
log_info "Domain: $DOMAIN"
log_info "Bucket: $BUCKET_NAME"
log_info "IAM User: $IAM_USER"

# ════════════════════════════════════════════════════════════════════════════
# STEP 1: S3 BUCKET
# ════════════════════════════════════════════════════════════════════════════

log_section "Step 1: S3 Bucket Setup"

# Create bucket
if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null; then
  log_warn "Bucket '$BUCKET_NAME' already exists, skipping creation"
else
  log_info "Creating bucket '$BUCKET_NAME' in $REGION..."
  aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION" \
    --output text > /dev/null
  log_success "Bucket created"
fi

# Block ACL-based public access but allow bucket policy public reads
log_info "Configuring public access block..."
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"
log_success "Public access configured (ACLs blocked, policy-based reads allowed)"

# Enable versioning
log_info "Enabling versioning..."
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled
log_success "Versioning enabled"

# Server-side encryption (AES256)
log_info "Enabling server-side encryption..."
aws s3api put-bucket-encryption \
  --bucket "$BUCKET_NAME" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }]
  }'
log_success "Encryption enabled (AES256)"

# CORS configuration for Next.js uploads
log_info "Setting CORS policy..."
aws s3api put-bucket-cors \
  --bucket "$BUCKET_NAME" \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["http://localhost:3000", "https://*.beindigital.fr"],
      "ExposeHeaders": ["ETag", "x-amz-request-id"],
      "MaxAgeSeconds": 3600
    }]
  }'
log_success "CORS configured"

# Bucket policy: allow public reads on asset folders
log_info "Setting bucket policy for public reads..."
aws s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Sid\": \"PublicReadAssets\",
      \"Effect\": \"Allow\",
      \"Principal\": \"*\",
      \"Action\": \"s3:GetObject\",
      \"Resource\": [
        \"arn:aws:s3:::${BUCKET_NAME}/cms/*\",
        \"arn:aws:s3:::${BUCKET_NAME}/products/*\",
        \"arn:aws:s3:::${BUCKET_NAME}/branding/*\",
        \"arn:aws:s3:::${BUCKET_NAME}/stores/*\",
        \"arn:aws:s3:::${BUCKET_NAME}/email/*\"
      ]
    }]
  }"
log_success "Bucket policy set (public read on asset folders)"

# Lifecycle rules: delete incomplete multipart uploads after 7 days
log_info "Setting lifecycle rules..."
aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET_NAME" \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "CleanupIncompleteUploads",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }]
  }'
log_success "Lifecycle rules set"

# Create folder structure
log_info "Creating folder structure..."
for folder in products branding stores cms blog; do
  aws s3api put-object --bucket "$BUCKET_NAME" --key "${folder}/" --content-length 0 > /dev/null
done
log_success "Folders created: products/, branding/, stores/, cms/, blog/"

# ════════════════════════════════════════════════════════════════════════════
# STEP 2: SES DOMAIN IDENTITY & DKIM
# ════════════════════════════════════════════════════════════════════════════

log_section "Step 2: SES Domain Identity & DKIM"

# Verify domain identity
log_info "Registering domain identity '$DOMAIN'..."
DKIM_TOKENS=$(aws sesv2 create-email-identity \
  --email-identity "$DOMAIN" \
  --region "$REGION" \
  --query 'DkimAttributes.Tokens' \
  --output text 2>/dev/null || echo "ALREADY_EXISTS")

if [ "$DKIM_TOKENS" = "ALREADY_EXISTS" ]; then
  log_warn "Domain '$DOMAIN' already registered in SES"
  DKIM_TOKENS=$(aws sesv2 get-email-identity \
    --email-identity "$DOMAIN" \
    --region "$REGION" \
    --query 'DkimAttributes.Tokens' \
    --output text)
fi

log_success "Domain identity registered"

# Display DNS records to configure
echo ""
log_info "=== DNS RECORDS TO ADD ==="
echo ""
echo -e "${YELLOW}Add the following CNAME records to your DNS provider for $DOMAIN:${NC}"
echo ""

TOKEN_NUM=1
for TOKEN in $DKIM_TOKENS; do
  echo -e "  ${GREEN}CNAME Record $TOKEN_NUM:${NC}"
  echo -e "    Name:  ${TOKEN}._domainkey.${DOMAIN}"
  echo -e "    Value: ${TOKEN}.dkim.amazonses.com"
  echo ""
  TOKEN_NUM=$((TOKEN_NUM + 1))
done

# SES MAIL FROM domain (for SPF)
MAIL_FROM_SUBDOMAIN="mail.${DOMAIN}"
log_info "Setting MAIL FROM domain: $MAIL_FROM_SUBDOMAIN"
aws sesv2 put-email-identity-mail-from-attributes \
  --email-identity "$DOMAIN" \
  --mail-from-domain "$MAIL_FROM_SUBDOMAIN" \
  --region "$REGION" 2>/dev/null || true
log_success "MAIL FROM configured"

echo ""
echo -e "${YELLOW}Also add these DNS records for SPF & MAIL FROM:${NC}"
echo ""
echo -e "  ${GREEN}MX Record:${NC}"
echo -e "    Name:  mail.${DOMAIN}"
echo -e "    Value: 10 feedback-smtp.${REGION}.amazonses.com"
echo ""
echo -e "  ${GREEN}TXT Record (SPF):${NC}"
echo -e "    Name:  mail.${DOMAIN}"
echo -e "    Value: \"v=spf1 include:amazonses.com ~all\""
echo ""

# Create DMARC record suggestion
echo -e "  ${GREEN}TXT Record (DMARC - recommended):${NC}"
echo -e "    Name:  _dmarc.${DOMAIN}"
echo -e "    Value: \"v=DMARC1; p=quarantine; rua=mailto:dmarc@${DOMAIN}\""
echo ""

# Set up notification email address
FROM_EMAIL="noreply@${DOMAIN}"
log_info "Registering sender email: $FROM_EMAIL"
aws sesv2 create-email-identity \
  --email-identity "$FROM_EMAIL" \
  --region "$REGION" 2>/dev/null || log_warn "$FROM_EMAIL already registered"
log_success "Sender email identity registered"

# Create a configuration set for tracking
log_info "Creating SES configuration set..."
aws sesv2 create-configuration-set \
  --configuration-set-name "beyours-engine" \
  --sending-options '{"SendingEnabled": true}' \
  --reputation-options '{"ReputationMetricsEnabled": true}' \
  --region "$REGION" 2>/dev/null || log_warn "Configuration set already exists"
log_success "Configuration set 'beyours-engine' ready"

# ════════════════════════════════════════════════════════════════════════════
# STEP 3: IAM USER FOR THE APP
# ════════════════════════════════════════════════════════════════════════════

log_section "Step 3: IAM User & Permissions"

# Create IAM user
if aws iam get-user --user-name "$IAM_USER" &>/dev/null; then
  log_warn "IAM user '$IAM_USER' already exists"
else
  log_info "Creating IAM user '$IAM_USER'..."
  aws iam create-user --user-name "$IAM_USER" > /dev/null
  log_success "IAM user created"
fi

# Create policy with minimal permissions
POLICY_NAME="BeYoursEnginePolicy"
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3BucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::${BUCKET_NAME}",
        "arn:aws:s3:::${BUCKET_NAME}/*"
      ]
    },
    {
      "Sid": "SESSendEmail",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:SendTemplatedEmail",
        "ses:SendBulkTemplatedEmail"
      ],
      "Resource": [
        "arn:aws:ses:${REGION}:${ACCOUNT_ID}:identity/${DOMAIN}",
        "arn:aws:ses:${REGION}:${ACCOUNT_ID}:identity/${FROM_EMAIL}",
        "arn:aws:ses:${REGION}:${ACCOUNT_ID}:configuration-set/beyours-engine"
      ]
    },
    {
      "Sid": "SESTemplates",
      "Effect": "Allow",
      "Action": [
        "ses:CreateTemplate",
        "ses:UpdateTemplate",
        "ses:GetTemplate",
        "ses:ListTemplates",
        "ses:DeleteTemplate"
      ],
      "Resource": "*"
    }
  ]
}
EOF
)

# Create or update the policy
if aws iam get-policy --policy-arn "$POLICY_ARN" &>/dev/null; then
  log_warn "Policy '$POLICY_NAME' already exists, creating new version..."
  # Delete oldest non-default version if at limit
  OLD_VERSION=$(aws iam list-policy-versions --policy-arn "$POLICY_ARN" \
    --query 'Versions[?IsDefaultVersion==`false`] | [0].VersionId' --output text 2>/dev/null)
  if [ "$OLD_VERSION" != "None" ] && [ -n "$OLD_VERSION" ]; then
    aws iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$OLD_VERSION" 2>/dev/null || true
  fi
  aws iam create-policy-version \
    --policy-arn "$POLICY_ARN" \
    --policy-document "$POLICY_DOC" \
    --set-as-default > /dev/null
  log_success "Policy updated"
else
  log_info "Creating IAM policy '$POLICY_NAME'..."
  aws iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document "$POLICY_DOC" > /dev/null
  log_success "Policy created"
fi

# Attach policy to user
aws iam attach-user-policy \
  --user-name "$IAM_USER" \
  --policy-arn "$POLICY_ARN" 2>/dev/null
log_success "Policy attached to user"

# Create access keys
log_info "Generating access keys..."
EXISTING_KEYS=$(aws iam list-access-keys --user-name "$IAM_USER" \
  --query 'AccessKeyMetadata[].AccessKeyId' --output text)

if [ -n "$EXISTING_KEYS" ] && [ "$EXISTING_KEYS" != "None" ]; then
  log_warn "Access keys already exist for '$IAM_USER'"
  echo -e "  Existing keys: $EXISTING_KEYS"
  echo ""
  read -p "  Delete existing keys and create new ones? (y/N): " RECREATE_KEYS
  if [[ "$RECREATE_KEYS" =~ ^[Yy]$ ]]; then
    for KEY in $EXISTING_KEYS; do
      aws iam delete-access-key --user-name "$IAM_USER" --access-key-id "$KEY"
    done
    log_info "Old keys deleted"
  else
    log_warn "Keeping existing keys. Skipping key creation."
    NEW_ACCESS_KEY=""
    NEW_SECRET_KEY=""
  fi
fi

if [ -z "${NEW_ACCESS_KEY:-}" ]; then
  KEY_OUTPUT=$(aws iam create-access-key --user-name "$IAM_USER" --output json)
  NEW_ACCESS_KEY=$(echo "$KEY_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['AccessKey']['AccessKeyId'])")
  NEW_SECRET_KEY=$(echo "$KEY_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['AccessKey']['SecretAccessKey'])")
  log_success "New access keys generated"
fi

# ════════════════════════════════════════════════════════════════════════════
# STEP 4: UPDATE .env.local
# ════════════════════════════════════════════════════════════════════════════

log_section "Step 4: Update .env.local"

if [ -n "${NEW_ACCESS_KEY:-}" ]; then
  log_info "Updating $ENV_FILE with new credentials..."

  # Use sed to update existing values or append new ones
  if [[ "$OSTYPE" == "darwin"* ]]; then
    SED_I="sed -i ''"
  else
    SED_I="sed -i"
  fi

  # Update AWS credentials
  $SED_I "s|^AWS_REGION=.*|AWS_REGION=$REGION|" "$ENV_FILE"
  $SED_I "s|^AWS_ACCESS_KEY_ID=.*|AWS_ACCESS_KEY_ID=$NEW_ACCESS_KEY|" "$ENV_FILE"
  $SED_I "s|^AWS_SECRET_ACCESS_KEY=.*|AWS_SECRET_ACCESS_KEY=$NEW_SECRET_KEY|" "$ENV_FILE"
  $SED_I "s|^AWS_S3_BUCKET_NAME=.*|AWS_S3_BUCKET_NAME=$BUCKET_NAME|" "$ENV_FILE"
  $SED_I "s|^AWS_SES_FROM_EMAIL=.*|AWS_SES_FROM_EMAIL=$FROM_EMAIL|" "$ENV_FILE"

  # Add SES config set if not present
  if ! grep -q "AWS_SES_CONFIGURATION_SET" "$ENV_FILE"; then
    echo "" >> "$ENV_FILE"
    echo "# SES Configuration" >> "$ENV_FILE"
    echo "AWS_SES_CONFIGURATION_SET=beyours-engine" >> "$ENV_FILE"
  fi

  log_success ".env.local updated"
else
  log_warn "No new keys generated, .env.local not updated"
  log_info "Manually update .env.local with your existing credentials"
fi

# ════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════════════

log_section "Setup Complete!"

echo -e "${GREEN}S3 Bucket:${NC}"
echo "  Name: $BUCKET_NAME"
echo "  Region: $REGION"
echo "  Folders: products/, branding/, stores/, cms/, blog/"
echo "  Encryption: AES256"
echo "  Versioning: Enabled"
echo ""

echo -e "${GREEN}SES:${NC}"
echo "  Domain: $DOMAIN"
echo "  From: $FROM_EMAIL"
echo "  Config Set: beyours-engine"
echo "  Region: $REGION"
echo ""

if [ -n "${NEW_ACCESS_KEY:-}" ]; then
  echo -e "${GREEN}IAM User:${NC}"
  echo "  User: $IAM_USER"
  echo "  Access Key: $NEW_ACCESS_KEY"
  echo -e "  Secret Key: ${YELLOW}(saved in .env.local)${NC}"
  echo ""
fi

echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  ACTION REQUIRED: Add DNS records to your domain provider   ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "After adding DNS records, verify with:"
echo "  aws sesv2 get-email-identity --email-identity $DOMAIN --region $REGION"
echo ""
echo "Check DKIM status:"
echo "  aws sesv2 get-email-identity --email-identity $DOMAIN --region $REGION \\"
echo "    --query 'DkimAttributes.DkimVerificationStatus'"
echo ""

echo -e "${YELLOW}NOTE: SES is in sandbox mode by default.${NC}"
echo "To send to unverified emails, request production access:"
echo "  https://console.aws.amazon.com/ses/home?region=$REGION#/account"
echo ""
