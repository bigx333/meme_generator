import Config

config :meme_generator, MemeGenerator.Repo,
  database: Path.expand("../meme_generator_dev.db", __DIR__),
  pool_size: 5,
  stacktrace: true,
  show_sensitive_data_on_connection_error: true

config :meme_generator,
  vite_proxy: true,
  vite_origin: "http://127.0.0.1:5173"

config :meme_generator, MemeGeneratorWeb.Endpoint,
  http: [ip: {0, 0, 0, 0}],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: "wRl2X+WfkDbfFPlQBwLhrAOlxkxGwdfqCdn2KixM+6VpM9nHuuTDOFJese2cA0zX",
  watchers: [
    npm: ["run", "dev", cd: Path.expand("../assets", __DIR__)]
  ]

config :meme_generator, MemeGeneratorWeb.Endpoint,
  live_reload: [
    web_console_logger: true,
    patterns: [
      ~r"priv/static/(?!uploads/).*(js|css|png|jpeg|jpg|gif|svg|html)$",
      ~r"priv/gettext/.*\.po$",
      ~r"lib/meme_generator_web/(controllers|channels|components)/.*\.(ex|heex)$",
      ~r"lib/meme_generator_web/router\.ex$",
      ~r"assets/src/.*\.(css|ts|tsx)$"
    ]
  ]

config :meme_generator, dev_routes: true

config :logger, :default_formatter, format: "[$level] $message\n"

config :phoenix, :stacktrace_depth, 20
config :phoenix, :plug_init_mode, :runtime

config :phoenix_live_view,
  debug_heex_annotations: true,
  debug_attributes: true,
  enable_expensive_runtime_checks: true

config :swoosh, :api_client, false
