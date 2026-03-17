defmodule MemeGeneratorWeb.SpaController do
  use MemeGeneratorWeb, :controller

  defp shell_path, do: Application.app_dir(:meme_generator, "priv/static/app/_shell.html")
  @proxy_headers ~w(cache-control content-type etag vary)

  def show(conn, _params) do
    if Application.get_env(:meme_generator, :vite_proxy, false) do
      proxy_to_vite(conn)
    else
      serve_shell(conn)
    end
  end

  defp proxy_to_vite(conn) do
    vite_origin = Application.fetch_env!(:meme_generator, :vite_origin)
    url = vite_origin <> conn.request_path <> query_suffix(conn.query_string)

    case Req.get(url: url, headers: conn.req_headers) do
      {:ok, %Req.Response{status: status, headers: headers, body: body}} ->
        conn
        |> put_proxy_headers(headers)
        |> send_resp(status, IO.iodata_to_binary(body))

      {:error, _reason} ->
        conn
        |> put_status(:bad_gateway)
        |> text("Vite dev server is unavailable. Start it with mix phx.server and try again.")
    end
  end

  defp serve_shell(conn) do
    if File.exists?(shell_path()) do
      conn
      |> put_resp_content_type("text/html")
      |> send_file(200, shell_path())
    else
      conn
      |> put_status(:service_unavailable)
      |> text("Frontend build missing. Run `npm run build` in assets/ or `mix assets.deploy`.")
    end
  end

  defp put_proxy_headers(conn, headers) do
    Enum.reduce(headers, conn, fn {key, value}, acc ->
      if key in @proxy_headers do
        put_resp_header(acc, key, List.first(List.wrap(value)))
      else
        acc
      end
    end)
  end

  defp query_suffix(""), do: ""
  defp query_suffix(query_string), do: "?" <> query_string
end
