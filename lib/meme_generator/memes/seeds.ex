defmodule MemeGenerator.Memes.Seeds do
  @moduledoc false

  alias MemeGenerator.Memes
  alias MemeGenerator.Memes.Template

  defp seed_path, do: Application.app_dir(:meme_generator, "priv/meme-templates.json")

  def seed_templates! do
    seed_path()
    |> File.read!()
    |> Jason.decode!()
    |> Enum.each(fn template ->
      attrs = normalize_template(template)

      case Ash.get(Template, attrs.id, domain: Memes, not_found_error?: false) do
        {:ok, nil} ->
          Template
          |> Ash.Changeset.for_create(:create, attrs)
          |> Ash.create!(domain: Memes)

        {:ok, existing} ->
          existing
          |> Ash.Changeset.for_update(:update, Map.delete(attrs, :id))
          |> Ash.update!(domain: Memes)

        {:error, _} ->
          Template
          |> Ash.Changeset.for_create(:create, attrs)
          |> Ash.create!(domain: Memes)
      end
    end)

    :ok
  end

  defp normalize_template(template) do
    %{
      id: template["id"],
      name: template["name"],
      image_url: template["imageUrl"],
      width: template["width"],
      height: template["height"],
      box_count: template["boxCount"],
      placements: Enum.map(template["placements"] || [], &normalize_placement/1),
      ai_placements: normalize_optional_placements(template["aiPlacements"]),
      source: template["source"] || "imgflip"
    }
  end

  defp normalize_optional_placements(nil), do: nil
  defp normalize_optional_placements(placements), do: Enum.map(placements, &normalize_placement/1)

  defp normalize_placement(placement) do
    %{
      id: placement["id"],
      label: placement["label"],
      x: placement["x"],
      y: placement["y"],
      width: placement["width"],
      height: placement["height"],
      align: placement["align"] || "center"
    }
  end
end
