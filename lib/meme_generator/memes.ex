defmodule MemeGenerator.Memes do
  use Ash.Domain,
    extensions: [AshTypescript.Rpc]

  resources do
    resource MemeGenerator.Memes.Template
    resource MemeGenerator.Memes.Meme
  end

  typescript_rpc do
    resource MemeGenerator.Memes.Template do
      rpc_action(:list_templates, :read)
      rpc_action(:list_templates_since, :list_since)
      rpc_action(:get_template, :get)
      rpc_action(:create_template, :create)
      rpc_action(:update_template, :update)
      rpc_action(:destroy_template, :destroy)
    end

    resource MemeGenerator.Memes.Meme do
      rpc_action(:list_memes, :read, allowed_loads: [:template])
      rpc_action(:list_memes_since, :list_since, allowed_loads: [:template])
      rpc_action(:get_meme, :get, allowed_loads: [:template])
      rpc_action(:create_meme, :create, allowed_loads: [:template])
      rpc_action(:update_meme, :update, allowed_loads: [:template])
      rpc_action(:destroy_meme, :destroy)
    end
  end
end
