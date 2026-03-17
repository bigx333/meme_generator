defmodule MemeGeneratorWeb.PageControllerTest do
  use MemeGeneratorWeb.ConnCase

  test "GET /", %{conn: conn} do
    conn = get(conn, ~p"/")
    html = html_response(conn, 200)

    assert html =~ "Meme Generator Lab"
    assert html =~ "/create"
    assert html =~ "/templates"
  end
end
