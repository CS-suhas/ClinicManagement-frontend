import {
  type Appointment,
  type AppointmentInput,
  validateAppointment,
} from "@/domain/entities";
import type {
  AppointmentListItem,
  AppointmentRepository,
  AppointmentSearchOptions,
} from "@/domain/repositories";
import { CrudService } from "./crud-service";

export class AppointmentService extends CrudService<
  Appointment,
  AppointmentInput,
  AppointmentSearchOptions,
  AppointmentListItem
> {
  constructor(appointmentRepo: AppointmentRepository) {
    super(appointmentRepo, "Appointment");
  }
  protected validate = validateAppointment;
}
