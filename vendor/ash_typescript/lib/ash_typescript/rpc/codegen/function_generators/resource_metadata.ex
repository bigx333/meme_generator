# SPDX-FileCopyrightText: 2025 ash_typescript contributors <https://github.com/ash-project/ash_typescript/graphs/contributors>
#
# SPDX-License-Identifier: MIT

defmodule AshTypescript.Rpc.Codegen.FunctionGenerators.ResourceMetadata do
  @moduledoc """
  Generates plugin-agnostic runtime metadata for standard RPC resource actions.

  The emitted metadata is intentionally generic so downstream consumers can build
  their own syncing or state management integrations without coupling codegen to
  a specific plugin.
  """

  import AshTypescript.Helpers

  alias AshTypescript.Codegen.Helpers
  alias AshTypescript.FieldFormatter
  alias AshTypescript.Rpc.Codegen.FunctionGenerators.TypedQueries
  alias AshTypescript.TypeSystem.Introspection

  @type rpc_entry :: {module(), struct(), map()}

  @doc """
  Generates the resource metadata section for TypeScript output.
  """
  def generate_resource_metadata_section([]), do: ""

  def generate_resource_metadata_section(rpc_resources_and_actions) do
    sections =
      rpc_resources_and_actions
      |> Enum.group_by(fn {resource, _action, _rpc_action} -> resource end)
      |> Enum.sort_by(fn {resource, _entries} -> inspect(resource) end)
      |> Enum.map(fn {resource, entries} -> generate_resource_metadata(resource, entries) end)
      |> Enum.reject(&(&1 == ""))

    if sections == [] do
      ""
    else
      """
      // ============================
      // Resource Metadata
      // ============================
      // Generated runtime metadata for plugin consumers.

      #{Enum.join(sections, "\n\n")}
      """
    end
  end

  defp generate_resource_metadata(resource, entries) do
    resource_name = Helpers.build_resource_type_name(resource)
    const_name = lower_camel_case(resource_name) <> "ResourceMeta"
    field_const_name = lower_camel_case(resource_name) <> "DefaultFields"
    default_fields = build_default_fields(resource)

    standard_actions = %{
      create: pick_standard_action(entries, :create),
      delete: pick_standard_action(entries, :delete),
      list: pick_standard_action(entries, :list),
      listSince: pick_standard_action(entries, :list_since),
      update: pick_standard_action(entries, :update)
    }

    field_types =
      standard_actions
      |> Enum.flat_map(fn
        {_kind, nil} -> []
        {:delete, _entry} -> []
        {_kind, {_resource, _action, rpc_action}} -> ["#{snake_to_pascal_case(rpc_action.name)}Fields"]
      end)
      |> Enum.uniq()

    field_declaration =
      case field_types do
        [] ->
          ""

        _ ->
          intersection = Enum.join(field_types, " & ")
          fields = TypedQueries.format_fields_const_for_typescript(default_fields, resource)

          """
          const #{field_const_name} = #{fields} satisfies #{intersection};
          """
      end

    """
    // #{resource_name} Resource Metadata
    #{field_declaration}
    export const #{const_name} = {
      resourceName: "#{resource_name}",
      schemaName: "#{resource_name}ResourceSchema",
      actions: {
        list: #{format_read_action(standard_actions.list, field_const_name)},
        listSince: #{format_list_since_action(standard_actions.listSince, field_const_name)},
        create: #{format_create_action(resource, standard_actions.create, field_const_name)},
        update: #{format_update_action(resource, standard_actions.update, field_const_name)},
        delete: #{format_delete_action(resource, standard_actions.delete)}
      },
    } satisfies GeneratedRpcResourceMeta;
    """
    |> String.trim()
  end

  defp pick_standard_action(entries, :list) do
    entries
    |> Enum.filter(&list_candidate?/1)
    |> pick_unique_candidate([:read, :list])
  end

  defp pick_standard_action(entries, :list_since) do
    entries
    |> Enum.filter(&list_since_candidate?/1)
    |> pick_unique_candidate([:list_since])
  end

  defp pick_standard_action(entries, :create) do
    entries
    |> Enum.filter(&mutation_candidate?(&1, :create))
    |> pick_unique_candidate([:create])
  end

  defp pick_standard_action(entries, :update) do
    entries
    |> Enum.filter(&mutation_candidate?(&1, :update))
    |> pick_unique_candidate([:update])
  end

  defp pick_standard_action(entries, :delete) do
    entries
    |> Enum.filter(&mutation_candidate?(&1, :destroy))
    |> pick_unique_candidate([:destroy, :delete])
  end

  defp list_candidate?({_resource, action, rpc_action}) do
    action.type == :read and
      not get_action?(action, rpc_action) and
      public_argument_names(action) == []
  end

  defp list_since_candidate?({_resource, action, rpc_action}) do
    action.type == :read and
      not get_action?(action, rpc_action) and
      public_argument_names(action) == [:since]
  end

  defp mutation_candidate?({_resource, action, _rpc_action}, expected_type) do
    action.type == expected_type and public_argument_names(action) == []
  end

  defp pick_unique_candidate([], _preferred_names), do: nil
  defp pick_unique_candidate([entry], _preferred_names), do: entry

  defp pick_unique_candidate(entries, preferred_names) do
    preferred =
      Enum.filter(entries, fn {_resource, action, _rpc_action} ->
        action.name in preferred_names
      end)

    case preferred do
      [entry] -> entry
      _ -> nil
    end
  end

  defp get_action?(action, rpc_action) do
    Map.get(action, :get?, false) or
      Map.get(rpc_action, :get?, false) or
      (Map.get(rpc_action, :get_by) || []) != []
  end

  defp public_argument_names(action) do
    action.arguments
    |> Enum.filter(& &1.public?)
    |> Enum.map(& &1.name)
  end

  defp format_read_action(nil, _field_const_name), do: "null"

  defp format_read_action({_resource, _action, rpc_action}, field_const_name) do
    """
    {
      action: #{rpc_function_name(rpc_action)},
      fields: #{field_const_name},
    }
    """
    |> String.trim()
  end

  defp format_list_since_action(nil, _field_const_name), do: "null"

  defp format_list_since_action({_resource, _action, rpc_action}, field_const_name) do
    """
    {
      action: #{rpc_function_name(rpc_action)},
      fields: #{field_const_name},
    }
    """
    |> String.trim()
  end

  defp format_create_action(_resource, nil, _field_const_name), do: "null"

  defp format_create_action(resource, {_resource, action, rpc_action}, field_const_name) do
    writable_fields = format_writable_fields(resource, action)

    """
    {
      action: #{rpc_function_name(rpc_action)},
      fields: #{field_const_name},
      writableFields: #{writable_fields},
    }
    """
    |> String.trim()
  end

  defp format_update_action(_resource, nil, _field_const_name), do: "null"

  defp format_update_action(resource, {_resource, action, rpc_action}, field_const_name) do
    writable_fields = format_writable_fields(resource, action)
    identity = format_identity(resource, rpc_action)

    if writable_fields == "null" or identity == "null" do
      "null"
    else
      """
      {
        action: #{rpc_function_name(rpc_action)},
        fields: #{field_const_name},
        writableFields: #{writable_fields},
        identity: #{identity},
      }
      """
      |> String.trim()
    end
  end

  defp format_delete_action(_resource, nil), do: "null"

  defp format_delete_action(resource, {_resource, _action, rpc_action}) do
    identity = format_identity(resource, rpc_action)

    if identity == "null" do
      "null"
    else
      """
      {
        action: #{rpc_function_name(rpc_action)},
        identity: #{identity},
      }
      """
      |> String.trim()
    end
  end

  defp format_writable_fields(resource, action) do
    writable_fields =
      action
      |> Map.get(:accept, [])
      |> Enum.map(&Ash.Resource.Info.attribute(resource, &1))
      |> Enum.reject(&is_nil/1)
      |> Enum.filter(& &1.public?)
      |> Enum.map(&format_client_field_name(resource, &1.name))

    case writable_fields do
      [] -> "null"
      _ -> "[#{Enum.map_join(writable_fields, ", ", &inspect/1)}] as const"
    end
  end

  defp format_identity(resource, rpc_action) do
    identities = Map.get(rpc_action, :identities, [:_primary_key])

    case identities do
      [identity] ->
        identity_fields = identity_fields(resource, identity)

        case identity_fields do
          [field] ->
            """
            {
              kind: "field",
              field: #{inspect(field)},
            }
            """
            |> String.trim()

          [_ | _] = fields ->
            """
            {
              kind: "fields",
              fields: [#{Enum.map_join(fields, ", ", &inspect/1)}],
            }
            """
            |> String.trim()

          [] ->
            "null"
        end

      _ ->
        "null"
    end
  end

  defp identity_fields(resource, :_primary_key) do
    resource
    |> Ash.Resource.Info.primary_key()
    |> Enum.map(&format_client_field_name(resource, &1))
  end

  defp identity_fields(resource, identity_name) do
    case Ash.Resource.Info.identity(resource, identity_name) do
      nil -> []
      identity -> Enum.map(identity.keys, &format_client_field_name(resource, &1))
    end
  end

  defp build_default_fields(resource) do
    resource
    |> Ash.Resource.Info.public_attributes()
    |> Enum.reject(&generated_relationship_attribute?/1)
    |> Enum.map(&build_default_field/1)
    |> Enum.reject(&is_nil/1)
  end

  defp build_default_field(field) do
    {type, constraints, array?} = unwrap_type(field.type, field.constraints || [])

    cond do
      is_atom(type) and Introspection.is_embedded_resource?(type) ->
        {field.name, build_default_fields(type)}

      primitive_field?(type, constraints, array?) ->
        field.name

      true ->
        field.name
    end
  end

  defp unwrap_type({:array, inner_type}, constraints) do
    {inner_type, Keyword.get(constraints, :items, []), true}
  end

  defp unwrap_type(type, constraints) do
    {type, constraints, false}
  end

  defp primitive_field?(type, constraints, array?) do
    cond do
      array? ->
        true

      Introspection.is_embedded_resource?(type) ->
        false

      type == Ash.Type.Struct and Keyword.has_key?(constraints, :instance_of) ->
        instance_of = Keyword.get(constraints, :instance_of)
        not Introspection.is_embedded_resource?(instance_of)

      type == Ash.Type.Struct and Keyword.has_key?(constraints, :fields) ->
        false

      true ->
        true
    end
  end

  defp generated_relationship_attribute?(attribute) do
    match?(%{generated?: true}, attribute) and match?(true, Map.get(attribute, :writable?, false))
  end

  defp format_client_field_name(resource, field_name) do
    FieldFormatter.format_field_for_client(
      field_name,
      resource,
      AshTypescript.Rpc.output_field_formatter()
    )
  end

  defp lower_camel_case(value) do
    case value do
      <<first::utf8, rest::binary>> -> String.downcase(<<first::utf8>>) <> rest
      _ -> value
    end
  end

  defp rpc_function_name(rpc_action) do
    rpc_action.name
    |> to_string()
    |> format_output_field()
  end
end
