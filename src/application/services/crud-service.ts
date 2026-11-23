import { assertValid, type FieldErrors, NotFoundError } from "@/domain/errors";
import type {
  CrudRepository,
  SearchOptions,
  SearchRepository,
} from "@/domain/repositories";

/**
 * Base use-case class: validates input via the domain, delegates persistence
 * to the injected repository port, and lets subclasses guard deletes.
 */
export abstract class CrudService<
  T extends { id: string },
  TInput,
  TOptions extends SearchOptions = SearchOptions,
  /** What `search` returns per row; richer than T for joined list views. */
  TListItem = T,
> {
  protected constructor(
    protected readonly repo: CrudRepository<T, TInput> &
      SearchRepository<TListItem, TOptions>,
    private readonly entityName: string,
  ) {}

  protected abstract validate(input: TInput): FieldErrors;

  /** Override to throw ConflictError when the entity is still referenced. */
  protected async ensureDeletable(_id: string): Promise<void> {}

  search(options: TOptions) {
    return this.repo.search(options);
  }

  list(): Promise<T[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<T> {
    const item = await this.repo.getById(id);
    if (!item) throw new NotFoundError(this.entityName, id);
    return item;
  }

  /** Throws ValidationError when `input` is invalid; call before optimistic UI. */
  validateInput(input: TInput): void {
    assertValid(this.validate(input));
  }

  create(input: TInput, id?: string): Promise<T> {
    this.validateInput(input);
    return this.repo.create(input, id);
  }

  update(id: string, input: TInput): Promise<T> {
    this.validateInput(input);
    return this.repo.update(id, input);
  }

  async delete(id: string): Promise<void> {
    await this.ensureDeletable(id);
    await this.repo.delete(id);
  }
}
