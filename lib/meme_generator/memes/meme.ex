defmodule MemeGenerator.Memes.Meme do
  use Ash.Resource,
    domain: MemeGenerator.Memes,
    data_layer: AshSqlite.DataLayer,
    extensions: [AshTypescript.Resource, AshArchival.Resource],
    notifiers: [Ash.Notifier.PubSub]

  sqlite do
    table "memes"
    repo MemeGenerator.Repo
  end

  typescript do
    type_name("Meme")
  end

  archive do
    exclude_read_actions [:list_since]
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
    defaults [:read]

    create :create do
      accept [:template_id, :label, :lines, :render_data_url]

      change set_attribute(:updated_at, &__MODULE__.now_unix_ms/0)
    end

    update :update do
      accept [:template_id, :label, :lines, :render_data_url]

      change set_attribute(:updated_at, &__MODULE__.now_unix_ms/0)
    end

    destroy :destroy do
      change set_attribute(:updated_at, &__MODULE__.now_unix_ms/0)
    end

    read :list_since do
      argument :since, :integer do
        allow_nil? false
      end

      filter expr(updated_at > ^arg(:since))
    end

    read :get do
      get_by :id
    end
  end

  attributes do
    integer_primary_key :id, public?: true

    attribute :label, :string do
      public? true
    end

    attribute :lines, {:array, MemeGenerator.Memes.Line} do
      allow_nil? false
      default []
      public? true
    end

    attribute :render_data_url, :string do
      public? true
    end

    attribute :created_at, :integer do
      allow_nil? false
      default &__MODULE__.now_unix/0
      public? true
      writable? false
    end

    attribute :updated_at, :integer do
      allow_nil? false
      public? true
      writable? false
    end

    attribute :archived_at, :utc_datetime_usec do
      public? true
      writable? false
    end
  end

  relationships do
    belongs_to :template, MemeGenerator.Memes.Template do
      allow_nil? false
      attribute_public? true
      attribute_type :integer
      attribute_writable? true
      public? true
    end
  end

  def now_unix do
    DateTime.utc_now() |> DateTime.to_unix()
  end

  def now_unix_ms do
    System.system_time(:millisecond)
  end

  def sync_payload(notification) do
    %{
      resource: "Meme",
      action: notification.action.name |> to_string(),
      id: notification.data.id
    }
  end
end
