#!/bin/bash

# Ensure the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root"
  exit
fi

echo "🔍 Locating Nginx configuration for replysys.com..."

CONFIG_FILE=""
if [ -f "/etc/nginx/sites-available/replysys" ]; then
    CONFIG_FILE="/etc/nginx/sites-available/replysys"
elif [ -f "/etc/nginx/sites-available/whatsapp-platform" ]; then
    CONFIG_FILE="/etc/nginx/sites-available/whatsapp-platform"
elif [ -f "/etc/nginx/sites-available/default" ]; then
    CONFIG_FILE="/etc/nginx/sites-available/default"
else
    echo "❌ Could not find Nginx configuration file."
    exit 1
fi

echo "✅ Found config at $CONFIG_FILE"

# Backup the original file
cp $CONFIG_FILE ${CONFIG_FILE}.backup_$(date +%F_%T)
echo "💾 Backup created at ${CONFIG_FILE}.backup_$(date +%F_%T)"

# Update server_name if not already updated
if grep -q "app.replysys.com" "$CONFIG_FILE"; then
    echo "⚡ Subdomains already exist in $CONFIG_FILE. Skipping update."
else
    echo "📝 Updating server_name directive..."
    # This sed command finds a line like "server_name replysys.com www.replysys.com;"
    # and replaces it with the full list including subdomains.
    sed -i -E 's/server_name[[:space:]]+([^;]+);/server_name replysys.com www.replysys.com app.replysys.com admin.replysys.com;/g' $CONFIG_FILE
fi

# Test Nginx
echo "🧪 Testing Nginx configuration..."
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed! Reverting backup..."
    cp ${CONFIG_FILE}.backup_$(date +%F_%T) $CONFIG_FILE
    exit 1
fi

echo "🔄 Restarting Nginx..."
systemctl restart nginx

echo "🔐 Generating SSL Certificates..."
# We use --expand to add the new subdomains to the existing certificate safely
certbot --nginx -d replysys.com -d www.replysys.com -d app.replysys.com -d admin.replysys.com --expand --non-interactive --agree-tos -m pixelsadvertise@gmail.com

echo "🎉 All Done! app.replysys.com and admin.replysys.com should now be fully secured and routing traffic."
