import Config

config :meme_generator,
  ash_domains: [MemeGenerator.Memes],
  ecto_repos: [MemeGenerator.Repo],
  generators: [timestamp_type: :utc_datetime],
  vite_proxy: false

config :ash_typescript,
  output_file: "assets/js/ash_rpc.ts",
  run_endpoint: "/rpc/run",
  validate_endpoint: "/rpc/validate",
  input_field_formatter: :camel_case,
  output_field_formatter: :camel_case

config :meme_generator, MemeGeneratorWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [html: MemeGeneratorWeb.ErrorHTML, json: MemeGeneratorWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: MemeGenerator.PubSub,
  live_view: [signing_salt: "aITMW7K7"]

config :meme_generator, MemeGenerator.Mailer, adapter: Swoosh.Adapters.Local

config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

import_config "#{config_env()}.exs"
