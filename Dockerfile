FROM node:25.2.1-trixie-slim AS node
FROM rust:1.91.1-slim-trixie
COPY --from=node /usr/local/lib/ /usr/local/lib/
COPY --from=node /usr/local/bin/ /usr/local/bin/
RUN cargo install sqlx-cli --version 0.8.6 -F postgres,rustls --no-default-features
RUN cargo install watchexec-cli --version 2.3.2 --no-default-features
WORKDIR /app
