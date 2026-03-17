defmodule MemeGenerator.Memes.Line do
  use Ash.Resource, data_layer: :embedded

  attributes do
    attribute :id, :string do
      allow_nil? false
      primary_key? true
      public? true
      writable? true
    end

    attribute :text, :string do
      allow_nil? false
      public? true
    end

    attribute :align, :string do
      allow_nil? false
      default "center"
      public? true
    end
  end
end
