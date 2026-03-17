defmodule MemeGenerator.Memes.IncrementalSyncTest do
  use MemeGenerator.DataCase, async: true

  alias MemeGenerator.Memes
  alias MemeGenerator.Memes.Meme
  alias MemeGenerator.Memes.Template

  test "archived memes are returned by incremental reads and excluded from normal reads" do
    template =
      Template
      |> Ash.Changeset.for_create(:create, %{
        id: System.unique_integer([:positive]),
        name: "Incremental Sync Template",
        image_url: "https://example.com/template.jpg",
        width: 1200,
        height: 630,
        box_count: 2,
        placements: [
          %{
            id: "line-1",
            label: "Line 1",
            x: 0.1,
            y: 0.1,
            width: 0.8,
            height: 0.2,
            align: "center"
          },
          %{
            id: "line-2",
            label: "Line 2",
            x: 0.1,
            y: 0.7,
            width: 0.8,
            height: 0.2,
            align: "center"
          }
        ]
      })
      |> Ash.create!(domain: Memes)

    meme =
      Meme
      |> Ash.Changeset.for_create(:create, %{
        template_id: template.id,
        label: "Incremental sync regression",
        lines: [
          %{id: "line-1", text: "hello", align: "center"},
          %{id: "line-2", text: "world", align: "center"}
        ]
      })
      |> Ash.create!(domain: Memes)

    created_updated_at = meme.updated_at

    meme
    |> Ash.Changeset.for_destroy(:destroy)
    |> Ash.destroy!(domain: Memes)

    active_memes =
      Meme
      |> Ash.Query.for_read(:read, %{})
      |> Ash.read!(domain: Memes)

    refute Enum.any?(active_memes, &(&1.id == meme.id))

    incremental_memes =
      Meme
      |> Ash.Query.for_read(:list_since, %{since: created_updated_at})
      |> Ash.read!(domain: Memes)

    assert [%Meme{id: archived_id, archived_at: archived_at, updated_at: updated_at}] =
             incremental_memes

    assert archived_id == meme.id
    assert archived_at
    assert updated_at > created_updated_at
  end
end
