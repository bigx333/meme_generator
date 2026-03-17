defmodule MemeGenerator.Memes.Placement do
  use Ash.Resource, data_layer: :embedded

  attributes do
    attribute :id, :string do
      allow_nil? false
      primary_key? true
      public? true
      writable? true
    end

    attribute :label, :string do
      allow_nil? false
      public? true
    end

    attribute :x, :float do
      allow_nil? false
      public? true
    end

    attribute :y, :float do
      allow_nil? false
      public? true
    end

    attribute :width, :float do
      allow_nil? false
      public? true
    end

    attribute :height, :float do
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
