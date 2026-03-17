# Build stage
ARG BUILDER_IMAGE="hexpm/elixir:1.18.4-erlang-26.2.5.9-debian-bookworm-20260316-slim"
ARG DEBIAN_VERSION=bookworm-20260316-slim
ARG RUNNER_IMAGE="debian:${DEBIAN_VERSION}"

FROM ${BUILDER_IMAGE} as builder

RUN apt-get update -y && apt-get install -y build-essential git curl \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

WORKDIR /app

RUN mix local.hex --force && mix local.rebar --force

ENV MIX_ENV="prod"

# Install mix dependencies
COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV
RUN mkdir config
COPY config/config.exs config/${MIX_ENV}.exs config/
RUN mix deps.compile

# Build frontend assets
COPY assets/package.json assets/package-lock.json* assets/
RUN cd assets && npm install

COPY priv priv
COPY lib lib
COPY rel rel
COPY assets assets

COPY config/runtime.exs config/

# Build frontend assets
RUN cd assets && npm run build
RUN mkdir -p priv/static/assets priv/static/app \
    && cp -R assets/.output/public/assets/. priv/static/assets/ \
    && cp -R assets/node_modules/.nitro/vite/services/ssr/assets/. priv/static/assets/ 2>/dev/null || true \
    && cp assets/.output/public/_shell.html priv/static/app/_shell.html

# Compile and build release
RUN mix compile
RUN mix phx.digest
RUN mix release



# Runner stage
FROM ${RUNNER_IMAGE}

RUN apt-get update -y && \
    apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

WORKDIR "/app"
RUN chown nobody /app

ENV MIX_ENV="prod"

COPY --from=builder --chown=nobody:root /app/_build/${MIX_ENV}/rel/meme_generator ./

USER nobody

CMD ["/app/bin/server"]
