import type { QueryResult } from '../../driver/database-connection.js'
import type { StandardSchemaV1 } from '../../util/standard-schema.js'
import type { UnknownRow } from '../../util/type-utils.js'
import type {
  KyselyPlugin,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
} from '../kysely-plugin.js'

export class StandardSchemaV1Plugin implements KyselyPlugin {
  readonly #schema: StandardSchemaV1

  constructor(schema: StandardSchemaV1) {
    this.#schema = schema
  }

  transformQuery(args: PluginTransformQueryArgs) {
    return args.node
  }

  async transformResult(
    args: PluginTransformResultArgs,
  ): Promise<QueryResult<UnknownRow>> {
    const { result } = args
    const { rows } = result

    if (!Array.isArray(rows)) {
      return result
    }

    return {
      ...result,
      rows: await Promise.all(
        rows.map(async (row) => {
          const validated = await this.#schema['~standard'].validate(row)

          if (validated.issues) {
            throw new AggregateError(validated.issues)
          }

          return validated.value as UnknownRow
        }),
      ),
    }
  }
}
