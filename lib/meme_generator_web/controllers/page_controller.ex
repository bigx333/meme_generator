defmodule MemeGeneratorWeb.PageController do
  use MemeGeneratorWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
