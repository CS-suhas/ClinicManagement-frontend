import { assertValid, type FieldErrors, NotFoundError } from "@/domain/errors";
import type {
  CrudRepository,
  SearchOptions,
  SearchRepository,
} from "@/domain/repositories";

export abstract class CrudService<
  T extends { id: string },
  TInput,
  TOptions extends SearchOptions = SearchOptions,
  TListItem = T,
> {
  protected constructor(
    protected readonly repo: CrudRepository<T, TInput> &
      SearchRepository<TListItem, TOptions>,
    private readonly entityName: string,
  ) {}

  protected abstract validate(input: TInput): FieldErrors;

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
