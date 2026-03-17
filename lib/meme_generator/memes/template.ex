defmodule MemeGenerator.Memes.Template do
  use Ash.Resource,
    domain: MemeGenerator.Memes,
    data_layer: AshSqlite.DataLayer,
    extensions: [AshTypescript.Resource],
    notifiers: [Ash.Notifier.PubSub]

  sqlite do
    table "meme_templates"
    repo MemeGenerator.Repo
  end

  typescript do
    type_name("MemeTemplate")
  end

  pub_sub do
    module MemeGeneratorWeb.Endpoint
    prefix "ash"
    broadcast_type :notification
    transform &__MODULE__.sync_payload/1

    publish :create, "sync", event: "changed"
    publish :update, "sync", event: "changed"
    publish :destroy, "sync", event: "changed"
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [
        :id,
        :name,
        :image_url,
        :width,
        :height,
        :box_count,
        :placements,
        :ai_placements,
        :source
      ]
    end

    update :update do
      accept [
        :name,
        :image_url,
        :width,
        :height,
        :box_count,
        :placements,
        :ai_placements,
        :source
      ]
    end

    read :get do
      get_by :id
    end
  end

  attributes do
    attribute :id, :integer do
      allow_nil? false
      primary_key? true
      public? true
      writable? true
    end

    attribute :name, :string do
      allow_nil? false
      public? true
    end

    attribute :image_url, :string do
      allow_nil? false
      public? true
    end

    attribute :width, :integer do
      allow_nil? false
      public? true
    end

    attribute :height, :integer do
      allow_nil? false
      public? true
    end

    attribute :box_count, :integer do
      allow_nil? false
      public? true
    end

    attribute :placements, {:array, MemeGenerator.Memes.Placement} do
      allow_nil? false
      default []
      public? true
    end

    attribute :ai_placements, {:array, MemeGenerator.Memes.Placement} do
      public? true
    end

    attribute :source, :string do
      allow_nil? false
      default "imgflip"
      public? true
    end

    attribute :created_at, :integer do
      allow_nil? false
      default &__MODULE__.now_unix/0
      public? true
      writable? false
    end
  end

  relationships do
    has_many :memes, MemeGenerator.Memes.Meme do
      destination_attribute :template_id
      public? true
    end
  end

  def now_unix do
    DateTime.utc_now() |> DateTime.to_unix()
  end

  def sync_payload(notification) do
    %{
      resource: "MemeTemplate",
      action: notification.action.name |> to_string(),
      id: notification.data.id
    }
  end
end
