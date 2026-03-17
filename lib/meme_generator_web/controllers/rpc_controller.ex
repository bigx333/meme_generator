defmodule MemeGeneratorWeb.RpcController do
  use MemeGeneratorWeb, :controller

  def run(conn, params) do
    result = AshTypescript.Rpc.run_action(:meme_generator, conn, params)
    json(conn, result)
  end

  def validate(conn, params) do
    result = AshTypescript.Rpc.validate_action(:meme_generator, conn, params)
    json(conn, result)
  end
end
