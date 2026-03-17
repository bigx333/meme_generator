defmodule MemeGeneratorWeb.Plugs.ViteProxy do
  import Plug.Conn

  @proxy_headers ~w(cache-control content-type etag vary)

  def init(opts), do: opts

  def call(conn, _opts) do
    if proxy_request?(conn) do
      proxy_to_vite(conn)
    else
      conn
    end
  end

  defp proxy_request?(conn) do
    Application.get_env(:meme_generator, :vite_proxy, false) and
      String.starts_with?(conn.request_path, ["/@", "/src/", "/node_modules/", "/js/"])
  end

  defp proxy_to_vite(conn) do
    vite_origin = Application.fetch_env!(:meme_generator, :vite_origin)
    url = vite_origin <> conn.request_path <> query_suffix(conn.query_string)

    case Req.get(url: url, headers: conn.req_headers) do
      {:ok, %Req.Response{status: status, headers: headers, body: body}} ->
        conn
        |> put_proxy_headers(headers)
        |> send_resp(status, IO.iodata_to_binary(body))
        |> halt()

      {:error, _reason} ->
        conn
        |> send_resp(502, "Vite dev server is unavailable.")
        |> halt()
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
