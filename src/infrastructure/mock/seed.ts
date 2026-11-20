import type {
  AllergyType,
  Appointment,
  Clinic,
  Patient,
  PatientAllergy,
  Provider,
} from "@/domain/entities";

export const seedClinics: Clinic[] = [
  {
    id: "c1",
    name: "Downtown Health",
    location: "12 Main St, Springfield",
    phoneNumber: "+1 555 0100",
  },
  {
    id: "c2",
    name: "Northside Family Clinic",
    location: "88 Oak Ave, Springfield",
    phoneNumber: "+1 555 0200",
  },
];

export const seedProviders: Provider[] = [
  {
    id: "pr1",
    clinicId: "c1",
    firstName: "Alice",
    lastName: "Moreno",
    specialty: "General Practice",
  },
  {
    id: "pr2",
    clinicId: "c1",
    firstName: "Ben",
    lastName: "Okafor",
    specialty: "Cardiology",
  },
  {
    id: "pr3",
    clinicId: "c2",
    firstName: "Chen",
    lastName: "Li",
    specialty: "Pediatrics",
  },
];

export const seedPatients: Patient[] = [
  {
    id: "p1",
    firstName: "Dana",
    lastName: "Fischer",
    dateOfBirth: "1988-04-12",
    email: "dana@example.com",
    phoneNumber: "+1 555 1001",
  },
  {
    id: "p2",
    firstName: "Eli",
    lastName: "Grant",
    dateOfBirth: "1975-11-30",
    email: "eli@example.com",
    phoneNumber: "+1 555 1002",
  },
  {
    id: "p3",
    firstName: "Farah",
    lastName: "Haddad",
    dateOfBirth: "2015-06-05",
    email: "farah.parent@example.com",
    phoneNumber: "+1 555 1003",
  },
];

export const seedAllergyTypes: AllergyType[] = [
  { id: "a1", name: "Penicillin" },
  { id: "a2", name: "Peanuts" },
  { id: "a3", name: "Latex" },
  { id: "a4", name: "Pollen" },
];

export const seedPatientAllergies: PatientAllergy[] = [
  {
    patientId: "p1",
    allergyId: "a1",
    severity: "SEVERE",
    notes: "Hives and swelling in 2019",
  },
  {
    patientId: "p3",
    allergyId: "a2",
    severity: "SEVERE",
    notes: "Carries EpiPen",
  },
];

export const seedAppointments: Appointment[] = [
  {
    id: "ap1",
    patientId: "p1",
    providerId: "pr1",
    appointmentDateTime: "2026-11-20T09:30",
    reasonForVisit: "Annual check-up",
  },
  {
    id: "ap2",
    patientId: "p2",
    providerId: "pr2",
    appointmentDateTime: "2026-11-21T14:00",
    reasonForVisit: "Chest pain follow-up",
  },
  {
    id: "ap3",
    patientId: "p3",
    providerId: "pr3",
    appointmentDateTime: "2026-11-24T10:15",
    reasonForVisit: "Vaccination",
  },
];
