# Build Caddy with Coraza WAF plugin
FROM caddy:2-builder-alpine AS builder

RUN xcaddy build \
    --with github.com/corazawaf/coraza-caddy/v2

# Final image
FROM caddy:2-alpine

# Copy custom Caddy binary
COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Install Coraza OWASP Core Rule Set (CRS)
RUN apk add --no-cache curl git && \
    mkdir -p /etc/caddy/coraza/rules && \
    curl -sSL https://raw.githubusercontent.com/corazawaf/coraza/main/coraza.conf-recommended -o /etc/caddy/coraza/coraza.conf && \
    git clone --depth 1 https://github.com/coreruleset/coreruleset.git /tmp/crs && \
    cp /tmp/crs/crs-setup.conf.example /etc/caddy/coraza/crs-setup.conf && \
    cp -r /tmp/crs/rules/* /etc/caddy/coraza/rules/ && \
    rm -rf /tmp/crs && \
    apk del git curl

WORKDIR /etc/caddy
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
