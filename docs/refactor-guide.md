# Refactor guide (temporary — deleted after the migration)

The reference implementation is `src/features/allergies/`. Copy its shape.

## Rules

- No code comments. Names should explain the code.
- `type`, never `interface`. Avoid generics and conditional types.
- No classes, services, repositories or DI. Plain functions and hooks.
- Entity types come from the generated API: `type Patient = Schemas["PatientResponse"]` (`import type { Schemas } from "@/lib/api"`). Never hand-write an API shape.
- Enums: `export const Status = z.enum([...]); export type Status = z.infer<typeof Status>;`. Option lists: `Status.options`.
- Pages in `src/app/**/page.tsx` only render one component from `src/features/<name>/components/`.

## Feature folder

```
features/<name>/
  api.ts        fetch functions + useQuery/useMutation hooks
  schemas.ts    zod form schemas, enums, entity type aliases
  utils.ts      pure business rules (only if needed)
  components/   .tsx files and component-local hooks
```

## Calling the API (`src/lib/api.ts`)

```ts
import { api, newId, unwrap } from "@/lib/api";

unwrap(api.GET("/api/patients/{id}", { params: { path: { id } } }));
unwrap(
  api.GET("/api/patients/search", {
    params: { query: { Search: search, Page: page, PageSize: pageSize } },
  }),
);
unwrap(api.POST("/api/patients", { body: { id: newId(), ...values } }));
unwrap(
  api.PUT("/api/patients/{id}", {
    params: { path: { id } },
    body: { id, ...values },
  }),
);
unwrap(api.DELETE("/api/patients/{id}", { params: { path: { id } } }));
```

- Paths and bodies are type-checked against `src/lib/api-schema.gen.ts`. Look up an endpoint there.
- Failures throw `ApiError` (`status`, `message`, `fieldErrors`). Handle 404 with `e instanceof ApiError && e.status === 404`.
- Port the logic of the old `src/infrastructure/http/rest-*.ts` and `src/application/services/*.ts` for your feature, minus the classes.

## Reading data

```ts
export function usePatient(id: string) {
  return useQuery({
    queryKey: ["patients", id],
    queryFn: () =>
      unwrap(api.GET("/api/patients/{id}", { params: { path: { id } } })),
  });
}
```

- In components: `const { data, isPending, error, refetch } = usePatient(id)`. Show `getErrorMessage(error)` from `@/lib/errors`.
- Paged + searchable list for `ListPage`: `usePagedList(["patients"], searchPatients)` from `@/hooks/use-paged-list` (see `useAllergyTypeList`). It returns exactly what `ListPage`'s `list` prop needs.
- Query keys are plain arrays starting with the resource: `["patients"]`, `["patients", id]`, `["appointments", { from, to }]`.
- Replaces: `useService`, `useAsyncData`, `useGlanceData`, `useCrudPage`, `reload()/refresh()` calls.
- The current user: `useAuth()` from `@/features/auth/auth-provider` (`user`, `loading`, `refresh`). Roles: `hasRole` from `@/features/auth/permissions`.

## Writing data

```ts
export function useDeletePatient() {
  const { notifySuccess, notifyError } = useNotify();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.DELETE("/api/patients/{id}", { params: { path: { id } } })),
    onSuccess: () => notifySuccess("Patient deleted"),
    onError: (e) =>
      notifyError(`Could not delete patient: ${getErrorMessage(e)}`),
  });
}
```

- Every successful or failed mutation refetches all active queries automatically (see `src/lib/query-client.ts`). Do not call `invalidateQueries` or `reload` yourself.
- Undoable actions (reject, cancel): keep using `useOptimisticMutations` from `@/hooks/use-optimistic-mutations` with `undo`. Call it with no argument.

## Forms (`src/components/form.tsx`)

```tsx
<FormDialog
  open={open}
  onOpenChange={onOpenChange}
  title={patient ? "Edit patient" : "New patient"}
  submitLabel={patient ? "Save changes" : "Create patient"}
  schema={patientForm}
  defaultValues={{ firstName: patient?.firstName ?? "", ... }}
  onSubmit={(values) => save.mutateAsync({ id: patient?.id, values })}
>
  <TextInput name="firstName" label="First name" />
  <TextInput name="dateOfBirth" label="Date of birth" type="date" />
  <NumberInput name="fee" label="Fee" min={0} />
  <SelectInput name="gender" label="Gender" options={...} noneLabel="Not specified" />
  <TextAreaInput name="reasonForVisit" label="Reason" />
</FormDialog>
```

- Validation lives in the zod schema in `schemas.ts` (port the old `validate*` functions and their messages).
- `onSubmit` must return the mutation promise (`mutateAsync`). The dialog closes on success and shows server field errors on failure.
- Need `watch`/`setValue`? Pass a function child: `{(form) => <>...</>}`.
- `SearchSelectInput` is the old `SearchSelectField`; keep its `query` in `useState` and filter options with a query hook.
- Forms outside a dialog: use `useForm({ resolver: zodResolver(schema), defaultValues })` + `<FormProvider>` directly.
- Replaces: `useEntityForm`, `useFormSubmit`, `form-dialog.tsx`, `form-fields.tsx`.

## Dates

- Use `date-fns` (`format`, `parseISO`, `addDays`, `startOfWeek`, `isSameDay`, `differenceInMinutes`, ...) instead of hand-written date math.
- Existing helpers: `@/lib/dates` (`addDays` on "YYYY-MM-DD", `localMidnightIso`, `toOffsetDateTime`), `@/lib/relative-time`, `@/lib/format`, `@/lib/age`.

## Done when

- No imports from `@/di`, `@/domain`, `@/application`, `@/infrastructure`, `@/hooks/use-async-data`, `@/hooks/use-crud-page`, `@/hooks/use-entity-form`, `@/hooks/use-form-submit`, `@/hooks/use-glance-data`, `@/components/form-dialog`, `@/components/form-fields` remain in your files.
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
