import { assertValid, type FieldErrors, NotFoundError } from "@/domain/errors";
import type { CrudRepository } from "@/domain/repositories";

/**
 * Base use-case class: validates input via the domain, delegates persistence
 * to the injected repository port, and lets subclasses guard deletes.
 */
export abstract class CrudService<T extends { id: string }, TInput> {
  protected constructor(
    protected readonly repo: CrudRepository<T, TInput>,
    private readonly entityName: string,
  ) {}

  protected abstract validate(input: TInput): FieldErrors;

  /** Override to throw ConflictError when the entity is still referenced. */
  protected async ensureDeletable(_id: string): Promise<void> {}

  list(): Promise<T[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<T> {
    const item = await this.repo.getById(id);
    if (!item) throw new NotFoundError(this.entityName, id);
    return item;
  }

  create(input: TInput): Promise<T> {
    assertValid(this.validate(input));
    return this.repo.create(input);
  }

  update(id: string, input: TInput): Promise<T> {
    assertValid(this.validate(input));
    return this.repo.update(id, input);
  }

  async delete(id: string): Promise<void> {
    await this.ensureDeletable(id);
    await this.repo.delete(id);
  }
}
