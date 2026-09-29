#!/bin/sh
set -e

echo "🚀 [Vault Init] Initializing HashiCorp Vault Transit Engine..."

export VAULT_ADDR="http://127.0.0.1:8200"
export VAULT_TOKEN="${VAULT_DEV_ROOT_TOKEN_ID:-root_token_streamcontrol_2025}"

until vault status > /dev/null 2>&1 || [ $? -eq 2 ]; do
  echo "⏳ Waiting for Vault API..."
  sleep 2
done

# Enable Transit secrets engine if not enabled
if ! vault secrets list | grep -q "transit/"; then
  echo "🔒 Enabling transit engine at /transit..."
  vault secrets enable transit
else
  echo "✅ Transit engine already enabled."
fi

# Create AES-256-GCM encryption key for streaming credentials
KEY_NAME="streaming-inventory"
if ! vault read "transit/keys/${KEY_NAME}" > /dev/null 2>&1; then
  echo "🔑 Generating AES-256-GCM transit key: ${KEY_NAME}..."
  vault write -f "transit/keys/${KEY_NAME}" type="aes256-gcm96"
else
  echo "✅ Transit key ${KEY_NAME} already exists."
fi

# Create ACL Policy for backend
cat <<EOF | vault policy write streaming-backend-policy -
path "transit/encrypt/${KEY_NAME}" {
  capabilities = [ "update" ]
}
path "transit/decrypt/${KEY_NAME}" {
  capabilities = [ "update" ]
}
EOF

echo "🎉 [Vault Init] Completed successfully! Key: ${KEY_NAME}"
