defmodule MemeGeneratorWeb.AshSyncChannel do
  use MemeGeneratorWeb, :channel

  @impl true
  def join("ash:sync", _params, socket), do: {:ok, socket}

  def join(_topic, _params, _socket), do: {:error, %{reason: "unauthorized"}}
end
